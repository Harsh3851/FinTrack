import { Router } from 'express';
import mongoose from 'mongoose';
import * as auth from '../controllers/auth.controller';
import * as accounts from '../controllers/account.controller';
import * as categories from '../controllers/category.controller';
import * as transactions from '../controllers/transaction.controller';
import * as budgets from '../controllers/budget.controller';
import * as dashboard from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';

export const api = Router();

api.get('/health', (_req, res) => {
  const db = mongoose.connection.readyState === 1 ? 'up' : 'down';
  res
    .status(db === 'up' ? 200 : 503)
    .json({ status: db === 'up' ? 'ok' : 'degraded', db, uptime: process.uptime() });
});

const authRoutes = Router();
authRoutes.post('/register', authLimiter, auth.register);
authRoutes.post('/login', authLimiter, auth.login);
authRoutes.post('/demo', authLimiter, auth.demoLogin);
authRoutes.post('/refresh', authLimiter, auth.refresh);
authRoutes.post('/logout', auth.logout);
authRoutes.get('/me', requireAuth, auth.me);
api.use('/auth', authRoutes);

const accountRoutes = Router().use(requireAuth);
accountRoutes.get('/', accounts.list);
accountRoutes.post('/', accounts.create);
accountRoutes.patch('/:id', accounts.update);
accountRoutes.delete('/:id', accounts.remove);
api.use('/accounts', accountRoutes);

const categoryRoutes = Router().use(requireAuth);
categoryRoutes.get('/', categories.list);
categoryRoutes.post('/', categories.create);
categoryRoutes.patch('/:id', categories.update);
categoryRoutes.delete('/:id', categories.remove);
api.use('/categories', categoryRoutes);

const transactionRoutes = Router().use(requireAuth);
transactionRoutes.get('/', transactions.list);
transactionRoutes.get('/export', transactions.exportCsv);
transactionRoutes.get('/:id', transactions.get);
transactionRoutes.post('/', transactions.create);
transactionRoutes.patch('/:id', transactions.update);
transactionRoutes.delete('/:id', transactions.remove);
api.use('/transactions', transactionRoutes);

const budgetRoutes = Router().use(requireAuth);
budgetRoutes.get('/', budgets.list);
budgetRoutes.put('/:categoryId', budgets.upsert);
budgetRoutes.delete('/:categoryId', budgets.remove);
api.use('/budgets', budgetRoutes);

api.get('/dashboard/summary', requireAuth, dashboard.summary);
