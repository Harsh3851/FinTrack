import rateLimit from 'express-rate-limit';
import type { ApiErrorBody } from '@fintrack/shared';
import { isTest } from '../config/env';

const limited: ApiErrorBody = {
  error: {
    code: 'RATE_LIMITED',
    message: 'Too many attempts. Please wait a few minutes and try again.',
  },
};

/** Brute-force protection for login, register and refresh. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: isTest ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limited,
});

/** A generous global ceiling for the rest of the API. */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: isTest ? 10_000 : 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: limited,
});
