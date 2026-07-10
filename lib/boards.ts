/**
 * Board CRUD functions
 */

import { getDb, generateCode, generatePin, hashPassword } from './db-core';
import type { Board, BoardWithProjects, BoardRow, Project, ProjectRow, BoardMember, BoardMemberRow, BoardInviteRow } from './types';

// Board functions
export function getAllBoards(): Board[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all() as BoardRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    ownerId: row.owner_id,
    passkeyRequired: row.passkey_required === 1,
    createdAt: row.created_at
  }));
}

export function getBoardsByOwnerId(ownerId: string): Board[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM boards WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId) as BoardRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    ownerId: row.owner_id,
    passkeyRequired: row.passkey_required === 1,
    createdAt: row.created_at
  }));
}

export function getBoardBySlug(slug: string): BoardWithProjects | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM boards WHERE slug = ?').get(slug) as BoardRow | undefined;

  if (!row) return null;

  const board: Board = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    ownerId: row.owner_id,
    passkeyRequired: row.passkey_required === 1,
    createdAt: row.created_at
  };

  // Inline project fetch to avoid circular dependency
  const projectRows = db.prepare('SELECT * FROM projects WHERE board_id = ? ORDER BY created_at DESC').all(board.id) as ProjectRow[];
  const projects: Project[] = projectRows.map((projRow) => ({
    id: projRow.id,
    slug: projRow.slug,
    title: projRow.title,
    note: projRow.note,
    stage: projRow.stage,
    category: projRow.category,
    subtasks: JSON.parse(projRow.subtasks) as Project['subtasks'],
    boardId: projRow.board_id,
    assigneeId: projRow.assignee_id ?? null
  }));

  return { ...board, projects };
}

export function getBoardByJoinCode(joinCode: string): Board | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM boards WHERE join_code = ?').get(joinCode.toUpperCase()) as BoardRow | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    ownerId: row.owner_id,
    passkeyRequired: row.passkey_required === 1,
    createdAt: row.created_at
  };
}

/**
 * Create a board. Internal use for seeding accepts optional fixed id/joinCode/authorPin.
 */
export function createBoard(
  input: { name: string; password?: string; ownerId?: string; passkeyRequired?: boolean },
  id?: string,
  joinCode?: string,
  authorPin?: string
): Board & { authorPin: string } {
  const db = getDb();
  const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const finalId = id || `board-${Date.now()}`;
  const finalJoinCode = joinCode || generateCode(6);
  const finalAuthorPin = authorPin || generatePin();
  const passwordHash = input.password ? hashPassword(input.password) : null;
  const slugWithSuffix = `${slug}-${Date.now().toString(36)}`;
  const passkeyRequired = input.passkeyRequired ? 1 : 0;

  db.prepare(`
    INSERT INTO boards (id, name, slug, join_code, password_hash, author_pin, owner_id, passkey_required)
    VALUES (@id, @name, @slug, @joinCode, @passwordHash, @authorPin, @ownerId, @passkeyRequired)
  `).run({
    id: finalId,
    name: input.name,
    slug: slugWithSuffix,
    joinCode: finalJoinCode,
    passwordHash,
    authorPin: finalAuthorPin,
    ownerId: input.ownerId || null,
    passkeyRequired
  });

  return {
    id: finalId,
    name: input.name,
    slug: slugWithSuffix,
    joinCode: finalJoinCode,
    passwordHash,
    authorPin: finalAuthorPin,
    ownerId: input.ownerId || null,
    passkeyRequired: input.passkeyRequired || false,
    createdAt: new Date().toISOString()
  };
}

export function updateBoard(id: string, updates: {
  name?: string;
  password?: string | null;
  passkeyRequired?: boolean;
}): Board | null {
  const current = getBoardBySlug(id) || getAllBoards().find(b => b.id === id);
  if (!current) return null;

  const db = getDb();
  const newName = updates.name ?? current.name;
  const newPasswordHash = updates.password === null 
    ? null 
    : updates.password 
      ? hashPassword(updates.password) 
      : current.passwordHash;
  const newPasskeyRequired = updates.passkeyRequired !== undefined 
    ? (updates.passkeyRequired ? 1 : 0) 
    : (current.passkeyRequired ? 1 : 0);

  db.prepare(`
    UPDATE boards
    SET name = @name, password_hash = @passwordHash, passkey_required = @passkeyRequired
    WHERE id = @id
  `).run({
    id,
    name: newName,
    passwordHash: newPasswordHash,
    passkeyRequired: newPasskeyRequired
  });

  return {
    ...current,
    name: newName,
    passwordHash: newPasswordHash,
    passkeyRequired: newPasskeyRequired === 1
  };
}

export function verifyBoardPassword(joinCode: string, password: string): boolean {
  const board = getBoardByJoinCode(joinCode);
  if (!board) return false;
  if (!board.passwordHash) return true;
  return board.passwordHash === hashPassword(password);
}

export function verifyAuthorPin(boardId: string, pin: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT author_pin FROM boards WHERE id = ?').get(boardId) as { author_pin: string } | undefined;
  if (!row) return false;
  return row.author_pin === pin;
}

export function deleteBoard(boardId: string, pin: string): boolean {
  if (!verifyAuthorPin(boardId, pin)) return false;
  
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM board_members WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
  return true;
}

// Board member functions
export function addBoardMember(boardId: string, userId: string, role: 'owner' | 'editor' | 'viewer' = 'editor'): BoardMember {
  const db = getDb();
  const id = `member-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  db.prepare(`
    INSERT OR REPLACE INTO board_members (id, board_id, user_id, role)
    VALUES (@id, @boardId, @userId, @role)
  `).run({ id, boardId, userId, role });

  return {
    id,
    boardId,
    userId,
    role,
    joinedAt: new Date().toISOString()
  };
}

export function getBoardMembers(boardId: string): BoardMember[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM board_members WHERE board_id = ?').all(boardId) as BoardMemberRow[];
  
  return rows.map((row) => ({
    id: row.id,
    boardId: row.board_id,
    userId: row.user_id,
    role: row.role as 'owner' | 'editor' | 'viewer',
    joinedAt: row.joined_at
  }));
}

export function removeBoardMember(boardId: string, userId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM board_members WHERE board_id = ? AND user_id = ?').run(boardId, userId);
  return result.changes > 0;
}

export function isBoardMember(boardId: string, userId: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?').get(boardId, userId);
  return !!row;
}

// Board Invite functions
export function createBoardInvite(boardId: string, fromUserId: string, toUserId: string): string {
  const db = getDb();
  const id = `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Check if invite already exists
  const existing = db.prepare(
    'SELECT id FROM board_invites WHERE board_id = ? AND from_user_id = ? AND to_user_id = ? AND status = ?'
  ).get(boardId, fromUserId, toUserId, 'pending') as { id: string } | undefined;
  
  if (existing) {
    return existing.id;
  }
  
  db.prepare(`
    INSERT INTO board_invites (id, board_id, from_user_id, to_user_id, status)
    VALUES (@id, @boardId, @fromUserId, @toUserId, @status)
  `).run({ id, boardId, fromUserId, toUserId, status: 'pending' });
  
  return id;
}

export function getBoardInvitesToUser(userId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT bi.*, b.name as board_name, b.slug as board_slug, b.join_code as board_join_code,
           u.name as from_name, u.friend_code as from_friend_code
    FROM board_invites bi
    INNER JOIN boards b ON b.id = bi.board_id
    INNER JOIN users u ON u.id = bi.from_user_id
    WHERE bi.to_user_id = ? AND bi.status = 'pending'
    ORDER BY bi.created_at DESC
  `).all(userId) as any[];
  
  return rows.map((row) => ({
    id: row.id,
    boardId: row.board_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
    board: {
      id: row.board_id,
      name: row.board_name,
      slug: row.board_slug,
      joinCode: row.board_join_code
    },
    fromUser: {
      id: row.from_user_id,
      name: row.from_name,
      friendCode: row.from_friend_code
    }
  }));
}

export function getBoardInvitesFromUser(userId: string, boardId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT bi.*, u.name as to_name, u.friend_code as to_friend_code
    FROM board_invites bi
    INNER JOIN users u ON u.id = bi.to_user_id
    WHERE bi.from_user_id = ? AND bi.board_id = ? AND bi.status = 'pending'
    ORDER BY bi.created_at DESC
  `).all(userId, boardId) as any[];
  
  return rows.map((row) => ({
    id: row.id,
    boardId: row.board_id,
    fromUserId: row.from_user_id,
    toUserId: row.to_user_id,
    status: row.status,
    createdAt: row.created_at,
    toUser: {
      id: row.to_user_id,
      name: row.to_name,
      friendCode: row.to_friend_code
    }
  }));
}

export function acceptBoardInvite(inviteId: string): boolean {
  const db = getDb();
  const invite = db.prepare('SELECT * FROM board_invites WHERE id = ?').get(inviteId) as any;
  
  if (!invite) return false;
  
  // Add user as board member
  addBoardMember(invite.board_id, invite.to_user_id, 'editor');
  
  // Update invite status
  db.prepare('UPDATE board_invites SET status = ? WHERE id = ?').run('accepted', inviteId);
  
  return true;
}

export function acceptBoardInviteForUser(inviteId: string, userId: string): boolean {
  const db = getDb();
  const invite = db.prepare(
    'SELECT * FROM board_invites WHERE id = ? AND to_user_id = ? AND status = ?'
  ).get(inviteId, userId, 'pending') as BoardInviteRow | undefined;

  if (!invite) return false;

  addBoardMember(invite.board_id, userId, 'editor');
  db.prepare('UPDATE board_invites SET status = ? WHERE id = ?').run('accepted', inviteId);
  return true;
}

export function declineBoardInvite(inviteId: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE board_invites SET status = ? WHERE id = ? AND status = ?').run('declined', inviteId, 'pending');
  return result.changes > 0;
}

export function declineBoardInviteForUser(inviteId: string, userId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    'UPDATE board_invites SET status = ? WHERE id = ? AND to_user_id = ? AND status = ?'
  ).run('declined', inviteId, userId, 'pending');
  return result.changes > 0;
}

export function cancelBoardInvite(inviteId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM board_invites WHERE id = ? AND status = ?').run(inviteId, 'pending');
  return result.changes > 0;
}

export function cancelBoardInviteForUser(inviteId: string, userId: string): boolean {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM board_invites WHERE id = ? AND from_user_id = ? AND status = ?'
  ).run(inviteId, userId, 'pending');
  return result.changes > 0;
}

export function deleteBoardInvite(inviteId: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM board_invites WHERE id = ?').run(inviteId);
  return result.changes > 0;
}

export function isInvitedToBoard(boardId: string, userId: string): boolean {
  const db = getDb();
  const row = db.prepare(
    'SELECT 1 FROM board_invites WHERE board_id = ? AND to_user_id = ? AND status = ?'
  ).get(boardId, userId, 'pending');
  return !!row;
}
