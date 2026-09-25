import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../services/token.service';
import { unauthorized } from '../utils/app-error';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return next(unauthorized());
  try {
    req.userId = verifyAccessToken(token);
    next();
  } catch {
    next(unauthorized('Access token is invalid or expired'));
  }
}

/** Returns the authenticated user id; only call behind `requireAuth`. */
export function userIdOf(req: Request): string {
  if (!req.userId) throw unauthorized();
  return req.userId;
}
