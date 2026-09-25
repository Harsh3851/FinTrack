import { afterEach, describe, expect, it, vi } from 'vitest';
import { HttpClient } from '../data/http/client';
import { ApiError } from '../lib/errors';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('HttpClient', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('refreshes the access token once on 401 and retries the request', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
      .mockResolvedValueOnce(json(200, { accessToken: 'fresh', user: {}, expiresIn: 900 }))
      .mockResolvedValueOnce(json(200, { data: [1, 2] }));
    vi.stubGlobal('fetch', fetchMock);

    const client = new HttpClient('https://api.test');
    client.setAccessToken('stale');
    const result = await client.request<{ data: number[] }>('/accounts');

    expect(result.data).toEqual([1, 2]);
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.test/api/v1/auth/refresh');
    expect(fetchMock.mock.calls[2]![1].headers.Authorization).toBe('Bearer fresh');
    expect(fetchMock.mock.calls[0]![1].credentials).toBe('include');
  });

  it('signals session expiry when the refresh fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'expired' } }))
        .mockResolvedValueOnce(
          json(401, { error: { code: 'UNAUTHORIZED', message: 'no session' } }),
        ),
    );
    const client = new HttpClient('https://api.test');
    const expired = vi.fn();
    client.onSessionExpired(expired);

    await expect(client.request('/accounts')).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledOnce();
  });

  it('maps the API error shape to ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        json(400, {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Some fields are invalid',
            details: [{ path: 'amount', message: 'bad' }],
          },
        }),
      ),
    );
    const err = (await new HttpClient('')
      .request('/transactions', { method: 'POST', json: {} })
      .catch((e: unknown) => e)) as ApiError;
    expect(err).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      details: [{ path: 'amount', message: 'bad' }],
    });
  });
});
