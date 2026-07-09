/**
 * User and passkey credential functions
 */

import { getDb } from './db-core';
import type { User, UserRow, PasskeyCredential, PasskeyRow } from './types';

// User functions
export function createUser(name: string, email?: string): User {
  const db = getDb();
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  db.prepare(`
    INSERT INTO users (id, name, email)
    VALUES (@id, @name, @email)
  `).run({ id, name, email: email || null });

  return { id, name, email: email || null, createdAt: new Date().toISOString() };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    createdAt: row.created_at
  };
}

// Passkey credential functions
export function savePasskeyCredential(input: {
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string[] | null;
}): PasskeyCredential {
  const db = getDb();
  const id = `cred-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  db.prepare(`
    INSERT INTO passkey_credentials (id, user_id, credential_id, public_key, counter, device_type, backed_up, transports)
    VALUES (@id, @userId, @credentialId, @publicKey, @counter, @deviceType, @backedUp, @transports)
  `).run({
    id,
    userId: input.userId,
    credentialId: input.credentialId,
    publicKey: input.publicKey,
    counter: input.counter,
    deviceType: input.deviceType,
    backedUp: input.backedUp ? 1 : 0,
    transports: input.transports ? JSON.stringify(input.transports) : null
  });

  return {
    id,
    userId: input.userId,
    credentialId: input.credentialId,
    publicKey: input.publicKey,
    counter: input.counter,
    deviceType: input.deviceType,
    backedUp: input.backedUp,
    transports: input.transports ? JSON.stringify(input.transports) : null,
    createdAt: new Date().toISOString()
  };
}

export function getPasskeyByCredentialId(credentialId: string): PasskeyCredential | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM passkey_credentials WHERE credential_id = ?').get(credentialId) as PasskeyRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    counter: row.counter,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: row.transports,
    createdAt: row.created_at
  };
}

export function updatePasskeyCounter(credentialId: string, counter: number): void {
  const db = getDb();
  db.prepare('UPDATE passkey_credentials SET counter = ? WHERE credential_id = ?').run(counter, credentialId);
}

export function getPasskeysByUserId(userId: string): PasskeyCredential[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM passkey_credentials WHERE user_id = ?').all(userId) as PasskeyRow[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    credentialId: row.credential_id,
    publicKey: row.public_key,
    counter: row.counter,
    deviceType: row.device_type,
    backedUp: row.backed_up === 1,
    transports: row.transports,
    createdAt: row.created_at
  }));
}