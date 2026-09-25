import type { ZodTypeAny, z } from 'zod';
import { idSchema } from '@fintrack/shared';

/** Parses untrusted input; a ZodError is turned into a 400 by the error handler. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  return schema.parse(data);
}

export function parseId(value: unknown): string {
  return idSchema.parse(value);
}
