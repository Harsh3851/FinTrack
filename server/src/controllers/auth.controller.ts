import type { CookieOptions, Request, Response } from 'express';
import { loginSchema, registerSchema, type AuthResponse, type User } from '@fintrack/shared';
import { env } from '../config/env';
import { userIdOf } from '../middleware/auth';
import * as auth from '../services/auth.service';
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../services/token.service';
import { forbidden } from '../utils/app-error';
import { parse } from '../utils/validate';

export const REFRESH_COOKIE = 'ft_refresh';

const cookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAMESITE,
  path: '/api/v1/auth',
  // Cross-site deployments (e.g. GitHub Pages -> Render) need a partitioned (CHIPS) cookie
  // so browsers that restrict third-party cookies still keep the session.
  ...(env.COOKIE_SAMESITE === 'none' && { partitioned: true }),
  ...(expires && { expires }),
});

async function startSession(res: Response, user: User, status = 200) {
  const refresh = await issueRefreshToken(user.id);
  res.cookie(REFRESH_COOKIE, refresh.token, cookieOptions(refresh.expiresAt));
  const body: AuthResponse = {
    user,
    accessToken: signAccessToken(user.id),
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
  };
  res.status(status).json(body);
}

export async function register(req: Request, res: Response) {
  const user = await auth.register(parse(registerSchema, req.body));
  await startSession(res, user, 201);
}

export async function login(req: Request, res: Response) {
  const user = await auth.login(parse(loginSchema, req.body));
  await startSession(res, user);
}

export async function demoLogin(_req: Request, res: Response) {
  if (!env.DEMO_ENABLED) throw forbidden('Demo login is disabled on this server');
  const user = await auth.getOrCreateDemoUser();
  await startSession(res, user);
}

export async function refresh(req: Request, res: Response) {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  // No cookie simply means "not signed in": answer 204 so first page loads stay quiet.
  if (typeof token !== 'string' || !token) {
    res.status(204).end();
    return;
  }
  try {
    const next = await rotateRefreshToken(token);
    const user = await auth.getUser(next.userId);
    res.cookie(REFRESH_COOKIE, next.token, cookieOptions(next.expiresAt));
    const body: AuthResponse = {
      user,
      accessToken: signAccessToken(user.id),
      expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    };
    res.json(body);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  const token: unknown = req.cookies?.[REFRESH_COOKIE];
  if (typeof token === 'string' && token) await revokeRefreshToken(token);
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  res.status(204).end();
}

export async function me(req: Request, res: Response) {
  res.json({ user: await auth.getUser(userIdOf(req)) });
}
