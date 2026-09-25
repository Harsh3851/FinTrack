import type { Request, Response } from 'express';
import { categoryInputSchema, categoryUpdateSchema } from '@fintrack/shared';
import { userIdOf } from '../middleware/auth';
import * as categories from '../services/category.service';
import { parse, parseId } from '../utils/validate';

export async function list(req: Request, res: Response) {
  res.json({ data: await categories.listCategories(userIdOf(req)) });
}

export async function create(req: Request, res: Response) {
  const category = await categories.createCategory(
    userIdOf(req),
    parse(categoryInputSchema, req.body),
  );
  res.status(201).json({ data: category });
}

export async function update(req: Request, res: Response) {
  const category = await categories.updateCategory(
    userIdOf(req),
    parseId(req.params.id),
    parse(categoryUpdateSchema, req.body),
  );
  res.json({ data: category });
}

export async function remove(req: Request, res: Response) {
  await categories.deleteCategory(userIdOf(req), parseId(req.params.id));
  res.status(204).end();
}
