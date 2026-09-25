import type { Request, Response } from 'express';
import { accountInputSchema, accountUpdateSchema } from '@fintrack/shared';
import { userIdOf } from '../middleware/auth';
import * as accounts from '../services/account.service';
import { parse, parseId } from '../utils/validate';

export async function list(req: Request, res: Response) {
  res.json({ data: await accounts.listAccounts(userIdOf(req)) });
}

export async function create(req: Request, res: Response) {
  const account = await accounts.createAccount(userIdOf(req), parse(accountInputSchema, req.body));
  res.status(201).json({ data: account });
}

export async function update(req: Request, res: Response) {
  const account = await accounts.updateAccount(
    userIdOf(req),
    parseId(req.params.id),
    parse(accountUpdateSchema, req.body),
  );
  res.json({ data: account });
}

export async function remove(req: Request, res: Response) {
  await accounts.deleteAccount(userIdOf(req), parseId(req.params.id));
  res.status(204).end();
}
