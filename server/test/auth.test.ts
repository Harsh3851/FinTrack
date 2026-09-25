import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DEMO_USER } from '@fintrack/shared';
import { app, registerUser, resetDatabase } from './helpers';

const refreshCookie = (cookies: string[]) =>
  cookies.find((c) => c.startsWith('ft_refresh='))!.split(';')[0]!;

describe('auth', () => {
  beforeEach(resetDatabase);

  it('registers a user, seeds defaults and starts a session', async () => {
    const { user, accessToken, cookie, auth } = await registerUser({ email: 'Priya@Example.com' });
    expect(user.email).toBe('priya@example.com');
    expect(user).not.toHaveProperty('passwordHash');
    expect(accessToken).toMatch(/^ey/);
    const raw = cookie.find((c) => c.startsWith('ft_refresh='))!;
    expect(raw).toMatch(/HttpOnly/i);
    expect(raw).toMatch(/Path=\/api\/v1\/auth/);

    const categories = await request(app).get('/api/v1/categories').set(auth).expect(200);
    expect(categories.body.data.length).toBeGreaterThanOrEqual(15);
    const accounts = await request(app).get('/api/v1/accounts').set(auth).expect(200);
    expect(accounts.body.data).toHaveLength(1);
  });

  it('rejects duplicate emails with 409', async () => {
    await registerUser({ email: 'dup@example.com' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Other', email: 'DUP@example.com', password: 'Passw0rd!' })
      .expect(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('validates registration input with field details', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'A', email: 'not-an-email', password: 'short' })
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const paths = res.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('logs in with correct credentials only', async () => {
    const { credentials } = await registerUser();
    const bad = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: 'WrongPass1' })
      .expect(401);
    expect(bad.body.error).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Incorrect email or password',
    });

    const unknown = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPass1' })
      .expect(401);
    expect(unknown.body.error.message).toBe('Incorrect email or password');

    const ok = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: credentials.email, password: credentials.password })
      .expect(200);
    expect(ok.body.user.email).toBe(credentials.email);
  });

  it('protects /me with the access token', async () => {
    await request(app).get('/api/v1/auth/me').expect(401);
    await request(app).get('/api/v1/auth/me').set('Authorization', 'Bearer nope').expect(401);
    const { auth, user } = await registerUser();
    const res = await request(app).get('/api/v1/auth/me').set(auth).expect(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rotates refresh tokens and revokes the family on reuse', async () => {
    const { cookie } = await registerUser();
    const first = refreshCookie(cookie);

    const rotated = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', first)
      .expect(200);
    expect(rotated.body.accessToken).toBeTruthy();
    const second = refreshCookie(rotated.headers['set-cookie'] as unknown as string[]);
    expect(second).not.toBe(first);

    // Replaying the old token is treated as theft...
    await request(app).post('/api/v1/auth/refresh').set('Cookie', first).expect(401);
    // ...so the newer token in the same chain stops working too.
    await request(app).post('/api/v1/auth/refresh').set('Cookie', second).expect(401);
    // Without any cookie the endpoint just reports "no session".
    await request(app).post('/api/v1/auth/refresh').expect(204);
  });

  it('logs out by revoking the refresh token', async () => {
    const { cookie } = await registerUser();
    const token = refreshCookie(cookie);
    const res = await request(app).post('/api/v1/auth/logout').set('Cookie', token).expect(204);
    expect((res.headers['set-cookie'] as unknown as string[])[0]).toMatch(/ft_refresh=;/);
    await request(app).post('/api/v1/auth/refresh').set('Cookie', token).expect(401);
  });

  it('provides a one-click demo login with seeded data', async () => {
    const res = await request(app).post('/api/v1/auth/demo').expect(200);
    expect(res.body.user).toMatchObject({ email: DEMO_USER.email, isDemo: true });
    const auth = { Authorization: `Bearer ${res.body.accessToken}` };
    const list = await request(app).get('/api/v1/transactions?limit=5').set(auth).expect(200);
    expect(list.body.meta.total).toBeGreaterThan(200);

    // The demo password works for a normal login too, and the user is not re-created.
    await request(app).post('/api/v1/auth/demo').expect(200);
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: DEMO_USER.email, password: DEMO_USER.password })
      .expect(200);
  });
});

describe('platform', () => {
  it('returns a consistent JSON error for unknown routes', async () => {
    const res = await request(app).get('/api/v1/nope').expect(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email":')
      .expect(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('reports health and sets security headers', async () => {
    const res = await request(app).get('/api/v1/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', db: 'up' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('allows credentialed CORS only for configured origins', async () => {
    const allowed = await request(app).get('/api/v1/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
    const denied = await request(app).get('/api/v1/health').set('Origin', 'https://evil.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
});
