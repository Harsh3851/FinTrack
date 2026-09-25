import { Schema, model, Types } from 'mongoose';

/** A recurring monthly spending limit for one expense category. */
const budgetSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    category: { type: Types.ObjectId, ref: 'Category', required: true },
    /** Monthly limit in paise. */
    amount: { type: Number, required: true, min: 1 },
  },
  { timestamps: true },
);

budgetSchema.index({ user: 1, category: 1 }, { unique: true });

export const BudgetModel = model('Budget', budgetSchema);
