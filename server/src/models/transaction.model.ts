import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { TRANSACTION_TYPES } from '@fintrack/shared';

const transactionSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    /** Integer paise, always positive. */
    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: { validator: Number.isInteger, message: 'amount must be an integer (paise)' },
    },
    category: { type: Types.ObjectId, ref: 'Category', required: true },
    account: { type: Types.ObjectId, ref: 'Account', required: true },
    /** Calendar date stored as UTC midnight. */
    date: { type: Date, required: true },
    note: { type: String, default: '', trim: true, maxlength: 200 },
    tags: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Serves the default listing (newest first) and every date-range report.
transactionSchema.index({ user: 1, date: -1, _id: -1 });
transactionSchema.index({ user: 1, category: 1, date: -1 });
transactionSchema.index({ user: 1, account: 1 });

export type TransactionRecord = InferSchemaType<typeof transactionSchema> & { _id: Types.ObjectId };
export const TransactionModel = model('Transaction', transactionSchema);
