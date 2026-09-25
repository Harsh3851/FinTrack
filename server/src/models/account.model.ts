import { Schema, model, Types, type InferSchemaType } from 'mongoose';
import { ACCOUNT_TYPES } from '@fintrack/shared';

const accountSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    type: { type: String, enum: ACCOUNT_TYPES, required: true },
    /** Paise. */
    openingBalance: { type: Number, required: true, default: 0 },
    color: { type: String, required: true },
  },
  { timestamps: true },
);

accountSchema.index(
  { user: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);

export type AccountRecord = InferSchemaType<typeof accountSchema> & { _id: Types.ObjectId };
export const AccountModel = model('Account', accountSchema);
