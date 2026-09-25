import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Types } from 'mongoose';
import { env } from '../config/env';
import { RefreshTokenModel } from '../models';
import { unauthorized } from '../utils/app-error';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: userId,
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'fintrack-api',
    algorithm: 'HS256',
  });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: 'fintrack-api',
    algorithms: ['HS256'],
  });
  if (typeof payload === 'string' || !payload.sub) throw unauthorized();
  return payload.sub;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export async function issueRefreshToken(
  userId: string,
  family: string = crypto.randomUUID(),
): Promise<IssuedRefreshToken> {
  // The HMAC binds the opaque token to this server's secret.
  const random = crypto.randomBytes(48).toString('base64url');
  const token = `${random}.${crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(random).digest('base64url').slice(0, 16)}`;
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await RefreshTokenModel.create({
    user: new Types.ObjectId(userId),
    tokenHash: sha256(token),
    family,
    expiresAt,
  });
  return { token, expiresAt };
}

/**
 * Exchanges a refresh token for a new one (rotation). Reusing a rotated token is
 * treated as theft: every token in that login chain is revoked.
 */
export async function rotateRefreshToken(
  token: string,
): Promise<{ userId: string } & IssuedRefreshToken> {
  const record = await RefreshTokenModel.findOne({ tokenHash: sha256(token) });
  if (!record || record.expiresAt.getTime() <= Date.now()) {
    throw unauthorized('Session expired. Please sign in again.');
  }
  if (record.revokedAt) {
    await RefreshTokenModel.updateMany(
      { family: record.family, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw unauthorized('Session expired. Please sign in again.');
  }
  // Atomic claim so two parallel refreshes cannot both succeed.
  const claimed = await RefreshTokenModel.findOneAndUpdate(
    { _id: record._id, revokedAt: null },
    { revokedAt: new Date() },
  );
  if (!claimed) throw unauthorized('Session expired. Please sign in again.');

  const userId = String(record.user);
  const next = await issueRefreshToken(userId, record.family);
  return { userId, ...next };
}

export async function revokeRefreshToken(token: string): Promise<void> {
  const record = await RefreshTokenModel.findOne({ tokenHash: sha256(token) });
  if (record) {
    await RefreshTokenModel.updateMany(
      { family: record.family, revokedAt: null },
      { revokedAt: new Date() },
    );
  }
}
