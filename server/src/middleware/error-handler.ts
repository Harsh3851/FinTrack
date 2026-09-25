import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import type { ApiErrorBody } from '@fintrack/shared';
import { AppError } from '../utils/app-error';
import { logger } from '../config/logger';

export const notFoundHandler: RequestHandler = (req, res) => {
  const body: ApiErrorBody = {
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  };
  res.status(404).json(body);
};

function send(
  res: Parameters<ErrorRequestHandler>[2],
  status: number,
  error: ApiErrorBody['error'],
) {
  res.status(status).json({ error } satisfies ApiErrorBody);
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return send(res, 400, {
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
  }
  if (err instanceof AppError) {
    return send(res, err.status, { code: err.code, message: err.message, details: err.details });
  }
  if (err instanceof mongoose.Error.CastError) {
    return send(res, 400, { code: 'BAD_REQUEST', message: `Invalid value for ${err.path}` });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    return send(res, 400, {
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid',
      details: Object.values(err.errors).map((e) => ({ path: e.path, message: e.message })),
    });
  }
  if (typeof err === 'object' && err && 'code' in err && err.code === 11000) {
    return send(res, 409, {
      code: 'CONFLICT',
      message: 'A record with the same name already exists',
    });
  }
  if (typeof err === 'object' && err && 'type' in err && err.type === 'entity.parse.failed') {
    return send(res, 400, { code: 'BAD_REQUEST', message: 'Request body is not valid JSON' });
  }
  if (typeof err === 'object' && err && 'type' in err && err.type === 'entity.too.large') {
    return send(res, 413 as number, { code: 'BAD_REQUEST', message: 'Request body is too large' });
  }

  (req.log ?? logger).error({ err }, 'Unhandled error');
  return send(res, 500, {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
  });
};
