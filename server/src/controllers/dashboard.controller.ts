import type { Request, Response } from 'express';
import { currentMonthKey, monthQuerySchema } from '@fintrack/shared';
import { userIdOf } from '../middleware/auth';
import { getSummary } from '../services/dashboard.service';
import { parse } from '../utils/validate';

export async function summary(req: Request, res: Response) {
  const { month } = parse(monthQuerySchema, req.query);
  res.json({ data: await getSummary(userIdOf(req), month ?? currentMonthKey()) });
}
