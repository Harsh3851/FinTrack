import type { ApiErrorBody, ErrorCode } from '@fintrack/shared';

/** The single error type thrown by both data sources (HTTP and in-browser demo). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details: { path: string; message: string }[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromBody(status: number, body: Partial<ApiErrorBody> | null): ApiError {
    const e = body?.error;
    return new ApiError(
      status,
      e?.code ?? 'INTERNAL_ERROR',
      e?.message ?? `Request failed (${status})`,
      e?.details,
    );
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError)
    return 'Could not reach the server. Check your connection and try again.';
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
