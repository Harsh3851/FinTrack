import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { CATEGORY_ICONS, TRANSACTION_TYPES } from '@fintrack/shared';

const categorySchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 30 },
    type: { type: String, enum: TRANSACTION_TYPES, required: true },
    icon: { type: String, enum: CATEGORY_ICONS, required: true },
    color: { type: String, required: true },
  },
  { timestamps: true },
);

categorySchema.index(
  { user: 1, type: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

export type CategoryRecord = InferSchemaType<typeof categorySchema> & { _id: Types.ObjectId };
export const CategoryModel = model('Category', categorySchema);
