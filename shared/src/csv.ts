import { formatDate } from './dates';
import { paiseToRupeesString } from './money';
import type { Transaction } from './types';

export const CSV_HEADER = ['Date', 'Type', 'Amount (INR)', 'Category', 'Account', 'Note', 'Tags'];

/** Quotes a cell and neutralises spreadsheet formula injection (=, +, -, @). */
export function csvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) || safe !== value ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function transactionsToCsv(rows: Transaction[]): string {
  const lines = [CSV_HEADER.join(',')];
  for (const t of rows) {
    lines.push(
      [
        formatDate(t.date),
        t.type,
        paiseToRupeesString(t.amount),
        t.category.name,
        t.account.name,
        t.note,
        t.tags.join('; '),
      ]
        .map(csvCell)
        .join(','),
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export function csvFileName(from?: string, to?: string): string {
  const range = from || to ? `-${from ?? 'start'}_to_${to ?? 'today'}` : '';
  return `fintrack-transactions${range}.csv`;
}
