/**
 * Encrypted cookie session management
 */
import { cookies } from 'next/headers';
import { getDb } from './db-core';
import type { Session, SessionRow } from './types';
import crypto from 'crypto';

const SESSION_COOKIE = 'strider_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const SECRET_FALLBACK = 'strider-default-secret-change-in-production';

function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      // Fail closed: a predictable session key in production lets anyone forge sessions.
      throw new Error(
        'SESSION_SECRET is not set. Refusing to start in production without a secure session key.'
      );
    }
    return crypto.createHash('sha256').update(SECRET_FALLBACK).digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encrypted: string): string | null {
  try {
    const key = getEncryptionKey();
    const [ivHex, encryptedData] = encrypted.split(':');
    if (!ivHex || !encryptedData) return null;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string): Promise<Session> {
  const db = getDb();
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (@id, @userId, @token, @expiresAt)
  `).run({ id, userId, token, expiresAt });

  const cookieStore = await cookies();
  const encryptedToken = encryptToken(token);
  cookieStore.set(SESSION_COOKIE, encryptedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });

  return { id, userId, token, expiresAt, createdAt: new Date().toISOString() };
}

export async function getSession(): Promise<{ session: Session; userId: string } | null> {
  try {
    const cookieStore = await cookies();
    const encryptedToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!encryptedToken) return null;

    const token = decryptToken(encryptedToken);
    if (!token) return null;

    const db = getDb();
    const row = db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).get(token) as SessionRow | undefined;

    if (!row) return null;

    return {
      session: {
        id: row.id,
        userId: row.user_id,
        token: row.token,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      },
      userId: row.user_id,
    };
  } catch {
    return null;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const encryptedToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!encryptedToken) return;

    const token = decryptToken(encryptedToken);
    if (!token) return;

    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    cookieStore.delete(SESSION_COOKIE);
  } catch {
    // Ignore cleanup errors
  }
}