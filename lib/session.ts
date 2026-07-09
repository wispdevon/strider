/**
 * Encrypted cookie session management
 */
import { cookies } from 'next/headers';
import { getDb } from './db-core';
import type { Session, SessionRow } from './types';
import crypto from 'crypto';

const SESSION_COOKIE = 'strider_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const ENCRYPTION_KEY = process.env.SESSION_SECRET || 'strider-default-secret-change-in-production';

function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
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
  console.log('[session.ts] createSession called for userId:', userId);
  const db = getDb();
  const id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  console.log('[session.ts] Inserting session into DB:', { id, userId, expiresAt });
  const result = db.prepare(`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (@id, @userId, @token, @expiresAt)
  `).run({ id, userId, token, expiresAt });
  console.log('[session.ts] DB insert result:', { changes: result.changes });

  // Verify the session was inserted
  const inserted = db.prepare('SELECT id, user_id, expires_at FROM sessions WHERE id = ?').get(id);
  console.log('[session.ts] Verified session in DB:', inserted);

  const cookieStore = await cookies();
  const encryptedToken = encryptToken(token);
  console.log('[session.ts] Setting cookie:', {
    name: SESSION_COOKIE,
    encryptedTokenLength: encryptedToken.length,
    secure: process.env.NODE_ENV === 'production',
    nodeEnv: process.env.NODE_ENV,
  });
  cookieStore.set(SESSION_COOKIE, encryptedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  });
  console.log('[session.ts] Cookie set successfully');

  return { id, userId, token, expiresAt, createdAt: new Date().toISOString() };
}

export async function getSession(): Promise<{ session: Session; userId: string } | null> {
  try {
    console.log('[session.ts] getSession called');
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    console.log('[session.ts] All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value.length })));
    
    const encryptedToken = cookieStore.get(SESSION_COOKIE)?.value;
    if (!encryptedToken) {
      console.log('[session.ts] No session cookie found');
      return null;
    }
    console.log('[session.ts] Found session cookie, encryptedTokenLength:', encryptedToken.length);

    const token = decryptToken(encryptedToken);
    if (!token) {
      console.log('[session.ts] Token decryption failed');
      return null;
    }
    console.log('[session.ts] Token decrypted successfully, tokenLength:', token.length);

    const db = getDb();
    const now = new Date().toISOString();
    const sqliteNow = db.prepare("SELECT datetime('now') as now").get() as { now: string };
    console.log('[session.ts] Time comparison:', { jsNow: now, sqliteNow: sqliteNow.now });
    
    const row = db.prepare(
      "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
    ).get(token) as SessionRow | undefined;

    if (!row) {
      console.log('[session.ts] No matching session found in DB');
      // Check if session exists but expired
      const anySession = db.prepare('SELECT id, expires_at FROM sessions WHERE token = ?').get(token) as { id: string; expires_at: string } | undefined;
      if (anySession) {
        console.log('[session.ts] Session exists but may be expired:', anySession);
      } else {
        console.log('[session.ts] No session with this token exists in DB at all');
      }
      return null;
    }

    console.log('[session.ts] Session found:', { id: row.id, userId: row.user_id });
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
  } catch (error) {
    console.error('[session.ts] getSession error:', error);
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