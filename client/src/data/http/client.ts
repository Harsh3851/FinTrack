import type { AuthResponse } from '@fintrack/shared';
import { ApiError } from '../../lib/errors';

type Listener = () => void;

/**
 * Minimal fetch wrapper for the FinTrack API.
 * - Keeps the short-lived access token in memory only (never localStorage).
 * - On a 401 it refreshes once via the httpOnly cookie and retries; parallel
 *   401s share a single refresh request.
 */
export class HttpClient {
  private accessToken: string | null = null;
  private refreshing: Promise<AuthResponse | null> | null = null;
  private expiredListeners = new Set<Listener>();

  constructor(private readonly baseUrl: string) {}

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  onSessionExpired(listener: Listener) {
    this.expiredListeners.add(listener);
    return () => this.expiredListeners.delete(listener);
  }

  /** Exchanges the refresh cookie for a new access token. Resolves null when there is no session. */
  refresh(): Promise<AuthResponse | null> {
    this.refreshing ??= fetch(`${this.baseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok || res.status === 204) return null;
        const body = (await res.json()) as AuthResponse;
        this.accessToken = body.accessToken;
        return body;
      })
      .finally(() => {
        this.refreshing = null;
      });
    return this.refreshing;
  }

  async request<T>(
    path: string,
    init: RequestInit & { json?: unknown; raw?: boolean } = {},
    retry = true,
  ): Promise<T> {
    const { json, raw, headers, ...rest } = init;
    const res = await fetch(`${this.baseUrl}/api/v1${path}`, {
      ...rest,
      credentials: 'include',
      headers: {
        Accept: raw ? '*/*' : 'application/json',
        ...(json !== undefined && { 'Content-Type': 'application/json' }),
        ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
        ...headers,
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });

    if (res.status === 401 && retry && !path.startsWith('/auth/')) {
      const refreshed = await this.refresh();
      if (refreshed) return this.request<T>(path, init, false);
      this.accessToken = null;
      this.expiredListeners.forEach((l) => l());
    }

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw ApiError.fromBody(res.status, body);
    }
    if (res.status === 204) return undefined as T;
    if (raw) return res as T;
    return (await res.json()) as T;
  }
}
