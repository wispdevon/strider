/**
 * User and passkey credential functions
 */

import { getDb, generateCode } from './db-core';
import type { User, UserRow, PasskeyCredential, PasskeyRow, Friendship, FriendshipRow } from './types';

// User functions
export function createUser(name: string, email?: string): User {
  const db = getDb();
  const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const friendCode = generateCode(8);
  
  db.prepare(`
    INSERT INTO users (id, name, email, friend_code)
    VALUES (@id, @name, @email, @friendCode)
  `).run({ id, name, email: email || null, friendCode });

  return { id, name, email: email || null, friendCode, createdAt: new Date().toISOString() };
}

export function getUserById(id: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    friendCode: row.friend_code,
    createdAt: row.created_at
  };
}

export function getUserByFriendCode(friendCode: string): User | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE friend_code = ?').get(friendCode) as UserRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    friendCode: row.friend_code,
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
  const row = db.prepare("SELECT * FROM passkey_credentials WHERE credential_id = ? AND device_type NOT IN ('challenge', 'auth-challenge')").get(credentialId) as PasskeyRow | undefined;

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
  const rows = db.prepare("SELECT * FROM passkey_credentials WHERE user_id = ? AND device_type NOT IN ('challenge', 'auth-challenge')").all(userId) as PasskeyRow[];

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

// Friendship functions
export function createFriendship(userId: string, friendId: string): Friendship {
  const db = getDb();
  const id = `friendship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Check if friendship already exists (in either direction)
  const existing = db.prepare(
    'SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
  ).get(userId, friendId, friendId, userId) as FriendshipRow | undefined;
  
  if (existing) {
    return {
      id: existing.id,
      userId: existing.user_id,
      friendId: existing.friend_id,
      status: existing.status as 'pending' | 'accepted' | 'blocked',
      createdAt: existing.created_at
    };
  }
  
  db.prepare(`
    INSERT INTO friendships (id, user_id, friend_id, status)
    VALUES (@id, @userId, @friendId, @status)
  `).run({ id, userId, friendId, status: 'pending' });

  return {
    id,
    userId,
    friendId,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
}

export function getFriendsByUserId(userId: string): (Friendship & { friend: User })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.*, u.id as friend_id, u.name as friend_name, u.email as friend_email, u.friend_code as friend_friend_code, u.created_at as friend_created_at
    FROM friendships f
    INNER JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? AND f.status = 'accepted'
    ORDER BY f.created_at DESC
  `).all(userId) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    friendId: row.friend_id,
    status: row.status as 'pending' | 'accepted' | 'blocked',
    createdAt: row.created_at,
    friend: {
      id: row.friend_id,
      name: row.friend_name,
      email: row.friend_email,
      friendCode: row.friend_friend_code,
      createdAt: row.friend_created_at
    }
  }));
}

export function getIncomingFriendRequests(userId: string): (Friendship & { user: User })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.*, u.id as user_id, u.name as user_name, u.email as user_email, u.friend_code as user_friend_code, u.created_at as user_created_at
    FROM friendships f
    INNER JOIN users u ON u.id = f.user_id
    WHERE f.friend_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(userId) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    friendId: row.friend_id,
    status: row.status as 'pending' | 'accepted' | 'blocked',
    createdAt: row.created_at,
    user: {
      id: row.user_id,
      name: row.user_name,
      email: row.user_email,
      friendCode: row.user_friend_code,
      createdAt: row.user_created_at
    }
  }));
}

export function getOutgoingFriendRequests(userId: string): (Friendship & { friend: User })[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.*, u.id as friend_id, u.name as friend_name, u.email as friend_email, u.friend_code as friend_friend_code, u.created_at as friend_created_at
    FROM friendships f
    INNER JOIN users u ON u.id = f.friend_id
    WHERE f.user_id = ? AND f.status = 'pending'
    ORDER BY f.created_at DESC
  `).all(userId) as any[];

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    friendId: row.friend_id,
    status: row.status as 'pending' | 'accepted' | 'blocked',
    createdAt: row.created_at,
    friend: {
      id: row.friend_id,
      name: row.friend_name,
      email: row.friend_email,
      friendCode: row.friend_friend_code,
      createdAt: row.friend_created_at
    }
  }));
}

export function acceptFriendship(friendshipId: string): boolean {
  const db = getDb();
  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId) as FriendshipRow | undefined;
  
  if (!friendship) return false;
  
  // Update the pending request to accepted
  db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run('accepted', friendshipId);
  
  // Create reciprocal friendship (so both users see each other as friends)
  const reciprocalId = `friendship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT OR IGNORE INTO friendships (id, user_id, friend_id, status)
    VALUES (@id, @friendId, @userId, 'accepted')
  `).run({ id: reciprocalId, friendId: friendship.friend_id, userId: friendship.user_id });
  
  return true;
}

export function rejectFriendship(friendshipId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM friendships WHERE id = ?').run(friendshipId);
  return result.changes > 0;
}

export function cancelOutgoingFriendship(userId: string, friendId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM friendships WHERE user_id = ? AND friend_id = ? AND status = ?'
  ).run(userId, friendId, 'pending');
  return result.changes > 0;
}

export function updateFriendshipStatus(userId: string, friendId: string, status: 'accepted' | 'blocked'): boolean {
  const db = getDb();
  
  // Find the pending friendship from the other user
  const existing = db.prepare(
    'SELECT * FROM friendships WHERE user_id = ? AND friend_id = ? AND status = ?'
  ).get(friendId, userId, 'pending') as FriendshipRow | undefined;
  
  if (!existing) return false;
  
  const result = db.prepare('UPDATE friendships SET status = ? WHERE id = ?').run(status, existing.id);
  
  // If accepted, also create reciprocal
  if (status === 'accepted' && result.changes > 0) {
    const reciprocalId = `friendship-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.prepare(`
      INSERT OR IGNORE INTO friendships (id, user_id, friend_id, status)
      VALUES (@id, @friendId, @userId, 'accepted')
    `).run({ id: reciprocalId, friendId: existing.user_id, userId: existing.friend_id });
  }
  
  return result.changes > 0;
}

// Maximum daily avatar rerolls for normal users
export const MAX_DAILY_REROLLS = 5;

// Usernames that get unlimited avatar rerolls
const UNLIMITED_REROLL_USERS = ['wisp'];

/**
 * Returns today's date string (YYYY-MM-DD) in UTC for consistent daily reset.
 */
function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Check if a user has unlimited avatar rerolls (by username).
 */
export function hasUnlimitedRerolls(userId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
  if (!row) return false;
  return UNLIMITED_REROLL_USERS.includes(row.name.toLowerCase());
}

/**
 * Get the number of avatar rerolls used today (resets daily).
 * If the stored date doesn't match today, the counter is reset to 0.
 */
export function getAvatarRerolls(userId: string): number {
  const db = getDb();
  const row = db.prepare('SELECT avatar_rerolls, avatar_rerolls_date FROM users WHERE id = ?').get(userId) as { avatar_rerolls: number; avatar_rerolls_date: string | null } | undefined;
  if (!row) return 0;

  const today = getTodayDateString();
  if (row.avatar_rerolls_date !== today) {
    // New day — reset the counter
    db.prepare('UPDATE users SET avatar_rerolls = 0, avatar_rerolls_date = ? WHERE id = ?').run(today, userId);
    return 0;
  }

  return row.avatar_rerolls ?? 0;
}

/**
 * Get the number of avatar rerolls remaining for today.
 * Returns Infinity for users with unlimited rerolls.
 */
export function getAvatarRerollsRemaining(userId: string): number {
  if (hasUnlimitedRerolls(userId)) {
    return Infinity;
  }
  const used = getAvatarRerolls(userId);
  return Math.max(0, MAX_DAILY_REROLLS - used);
}

export function incrementAvatarReroll(userId: string): boolean {
  const db = getDb();
  const today = getTodayDateString();
  const result = db.prepare('UPDATE users SET avatar_rerolls = avatar_rerolls + 1, avatar_rerolls_date = ? WHERE id = ?').run(today, userId);
  return result.changes > 0;
}

export function getAvatarSeed(userId: string): string {
  const db = getDb();
  const row = db.prepare('SELECT avatar_seed FROM users WHERE id = ?').get(userId) as { avatar_seed: string | null } | undefined;
  return row?.avatar_seed ?? userId;
}

export function setAvatarSeed(userId: string, seed: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE users SET avatar_seed = ? WHERE id = ?').run(seed, userId);
  return result.changes > 0;
}

export function deleteFriendship(userId: string, friendId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)'
  ).run(userId, friendId, friendId, userId);
  return result.changes > 0;
}
