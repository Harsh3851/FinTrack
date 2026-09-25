import { Schema, model, Types } from 'mongoose';

/**
 * Refresh tokens are opaque random strings; only their SHA-256 hash is stored.
 * Tokens rotate on every refresh. Tokens in one login chain share a `family`,
 * so presenting an already-rotated token revokes the whole chain (reuse detection).
 */
const refreshTokenSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// MongoDB removes expired tokens automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenModel = model('RefreshToken', refreshTokenSchema);
