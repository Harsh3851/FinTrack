import type { Request, Response } from 'express';
import { budgetInputSchema, currentMonthKey, monthQuerySchema } from '@fintrack/shared';
import { userIdOf } from '../middleware/auth';
import * as budgets from '../services/budget.service';
import { parse, parseId } from '../utils/validate';

export async function list(req: Request, res: Response) {
  const { month } = parse(monthQuerySchema, req.query);
  res.json({ data: await budgets.listBudgets(userIdOf(req), month ?? currentMonthKey()) });
}

export async function upsert(req: Request, res: Response) {
  const { amount } = parse(budgetInputSchema, req.body);
  const { month } = parse(monthQuerySchema, req.query);
  const budget = await budgets.upsertBudget(
    userIdOf(req),
    parseId(req.params.categoryId),
    amount,
    month,
  );
  res.json({ data: budget });
}

export async function remove(req: Request, res: Response) {
  await budgets.deleteBudget(userIdOf(req), parseId(req.params.categoryId));
  res.status(204).end();
}
