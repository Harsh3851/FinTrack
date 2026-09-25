import type { Request, Response } from 'express';
import {
  csvFileName,
  transactionInputSchema,
  transactionQuerySchema,
  transactionsToCsv,
  transactionUpdateSchema,
} from '@fintrack/shared';
import { userIdOf } from '../middleware/auth';
import * as transactions from '../services/transaction.service';
import { parse, parseId } from '../utils/validate';

export async function list(req: Request, res: Response) {
  const query = parse(transactionQuerySchema, req.query);
  res.json(await transactions.listTransactions(userIdOf(req), query));
}

export async function exportCsv(req: Request, res: Response) {
  const { page: _page, limit: _limit, ...query } = parse(transactionQuerySchema, req.query);
  const rows = await transactions.exportTransactions(userIdOf(req), query);
  res
    .status(200)
    .type('text/csv; charset=utf-8')
    .attachment(csvFileName(query.from, query.to))
    // BOM so Excel opens the rupee symbol and UTF-8 notes correctly.
    .send(`\uFEFF${transactionsToCsv(rows)}`);
}

export async function get(req: Request, res: Response) {
  res.json({ data: await transactions.getTransaction(userIdOf(req), parseId(req.params.id)) });
}

export async function create(req: Request, res: Response) {
  const created = await transactions.createTransaction(
    userIdOf(req),
    parse(transactionInputSchema, req.body),
  );
  res.status(201).json({ data: created });
}

export async function update(req: Request, res: Response) {
  const updated = await transactions.updateTransaction(
    userIdOf(req),
    parseId(req.params.id),
    parse(transactionUpdateSchema, req.body),
  );
  res.json({ data: updated });
}

export async function remove(req: Request, res: Response) {
  await transactions.deleteTransaction(userIdOf(req), parseId(req.params.id));
  res.status(204).end();
}
