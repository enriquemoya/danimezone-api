import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { prisma } from "../db/prisma";
import { env } from "../../config/env";

const ACCESS_TTL_MINUTES = 15;
const REFRESH_TTL_DAYS = 30;
const MAGIC_LINK_TTL_MINUTES = 15;

function hashToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function signAccessToken(user: { id: string; role: string; email: string | null }) {
  if (!env.jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: `${ACCESS_TTL_MINUTES}m` }
  );
}

async function issueTokensForUser(user: { id: string; role: string; email: string | null }) {
  const now = new Date();
  const accessToken = signAccessToken({
    id: user.id,
    role: user.role,
    email: user.email
  });

  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshHash = hashToken(refreshToken);
  const refreshExpiresAt = addDays(now, REFRESH_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: refreshExpiresAt
    }
  });

  return { accessToken, refreshToken };
}

export async function requestMagicLink(email: string) {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      role: "CUSTOMER",
      status: "ACTIVE"
    }
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = addMinutes(now, MAGIC_LINK_TTL_MINUTES);

  await prisma.magicLinkToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt
    }
  });

  return { token, userId: user.id };
}

export async function verifyMagicLink(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const record = await prisma.magicLinkToken.findFirst({
    where: {
      tokenHash,
      consumedAt: null,
      expiresAt: { gt: now }
    },
    include: { user: true }
  });

  if (!record) {
    return null;
  }

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { consumedAt: now }
  });

  await prisma.user.update({
    where: { id: record.userId },
    data: {
      emailVerifiedAt: record.user.emailVerifiedAt ?? now,
      lastLoginAt: now
    }
  });

  return issueTokensForUser({
    id: record.user.id,
    role: record.user.role,
    email: record.user.email
  });
}

export async function refreshTokens(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  const existing = await prisma.refreshToken.findFirst({
    where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
    include: { user: true }
  });

  if (!existing) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: now, lastUsedAt: now }
  });

  const nextRefreshToken = crypto.randomBytes(48).toString("hex");
  const nextHash = hashToken(nextRefreshToken);
  const nextExpiresAt = addDays(now, REFRESH_TTL_DAYS);

  await prisma.refreshToken.create({
    data: {
      userId: existing.userId,
      tokenHash: nextHash,
      expiresAt: nextExpiresAt
    }
  });

  const accessToken = signAccessToken({
    id: existing.user.id,
    role: existing.user.role,
    email: existing.user.email
  });

  return { accessToken, refreshToken: nextRefreshToken };
}

export async function revokeRefreshToken(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: now, lastUsedAt: now }
  });
}

export async function loginWithPassword(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || user.status !== "ACTIVE") {
    return null;
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    return null;
  }

  const now = new Date();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: user.emailVerifiedAt ?? now,
      lastLoginAt: now
    }
  });

  return issueTokensForUser({
    id: user.id,
    role: user.role,
    email: user.email
  });
}

export function buildMagicLink(locale: string, token: string) {
  const safeLocale = locale === "en" ? "en" : "es";
  return `${env.onlineStoreBaseUrl}/${safeLocale}/auth/verify?token=${token}`;
}
