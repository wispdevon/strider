/**
 * Board CRUD functions
 */

import { getDb, generateCode, generatePin, hashPassword } from './db-core';
import type { Board, BoardWithProjects, BoardRow, Project, ProjectRow } from './types';

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
    boardId: projRow.board_id
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
    createdAt: row.created_at
  };
}

/**
 * Create a board. Internal use for seeding accepts optional fixed id/joinCode/authorPin.
 */
export function createBoard(
  input: { name: string; password?: string; ownerId?: string },
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

  db.prepare(`
    INSERT INTO boards (id, name, slug, join_code, password_hash, author_pin, owner_id)
    VALUES (@id, @name, @slug, @joinCode, @passwordHash, @authorPin, @ownerId)
  `).run({
    id: finalId,
    name: input.name,
    slug: slugWithSuffix,
    joinCode: finalJoinCode,
    passwordHash,
    authorPin: finalAuthorPin,
    ownerId: input.ownerId || null
  });

  return {
    id: finalId,
    name: input.name,
    slug: slugWithSuffix,
    joinCode: finalJoinCode,
    passwordHash,
    authorPin: finalAuthorPin,
    ownerId: input.ownerId || null,
    createdAt: new Date().toISOString()
  };
}

export function updateBoard(id: string, updates: {
  name?: string;
  password?: string | null;
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

  db.prepare(`
    UPDATE boards
    SET name = @name, password_hash = @passwordHash
    WHERE id = @id
  `).run({
    id,
    name: newName,
    passwordHash: newPasswordHash
  });

  return {
    ...current,
    name: newName,
    passwordHash: newPasswordHash
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
  db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
  return true;
}