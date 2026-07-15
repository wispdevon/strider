/**
 * Database layer - re-exports all functions for backward compatibility
 * 
 * New modular structure:
 * - lib/types.ts - All TypeScript interfaces
 * - lib/db-core.ts - Database connection, schema, helpers
 * - lib/users.ts - User and passkey functions
 * - lib/boards.ts - Board CRUD functions
 * - lib/projects.ts - Project CRUD functions
 * 
 * This file exists to maintain existing imports that use 'lib/db'.
 */

// Re-export all types
export type { Subtask, Project, DeletedProject, HostedDocument, HostedDocumentKind, Board, BoardWithProjects, User, PasskeyCredential, BoardRow, ProjectRow, DeletedProjectRow, HostedDocumentRow, UserRow, PasskeyRow, BoardMember, BoardMemberRow, Friendship, FriendshipRow } from './types';

import { getDb as getCoreDb } from './db-core';
import type { HostedDocument, HostedDocumentKind, HostedDocumentRow } from './types';

// Re-export core functions
export { getDb, generateCode, generatePin, hashPassword } from './db-core';

// Re-export user functions
export { createUser, getUserById, getUserByFriendCode, canChangeUsername, updateUsername, savePasskeyCredential, getPasskeyByCredentialId, updatePasskeyCounter, getPasskeysByUserId, createFriendship, getFriendsByUserId, getIncomingFriendRequests, getOutgoingFriendRequests, acceptFriendship, rejectFriendship, cancelOutgoingFriendship, updateFriendshipStatus, deleteFriendship, getAvatarRerolls, incrementAvatarReroll, getAvatarSeed, setAvatarSeed, hasUnlimitedRerolls, getAvatarRerollsRemaining, MAX_DAILY_REROLLS } from './users';

// Re-export board functions
export { getAllBoards, getBoardsByOwnerId, getBoardBySlug, getBoardByJoinCode, createBoard, updateBoard, transferBoardOwnership, verifyBoardPassword, verifyAuthorPin, deleteBoard, addBoardMember, getBoardMembers, removeBoardMember, isBoardMember, createBoardInvite, getBoardInvitesToUser, getBoardInvitesFromUser, acceptBoardInvite, acceptBoardInviteForUser, declineBoardInvite, declineBoardInviteForUser, cancelBoardInvite, cancelBoardInviteForUser, isInvitedToBoard } from './boards';

// Re-export project functions
export { getProjectsByBoardId, getAllProjects, getProjectById, getDeletedProjectsByBoardId, createProject, updateProject, toggleSubtask, deleteProject, restoreDeletedProject, permanentlyDeleteArchivedProject, deleteSubtask, assignProject, assignSubtask } from './projects';

function mapDocumentRow(row: HostedDocumentRow): HostedDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    subtaskId: row.subtask_id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getSubtaskDocument(projectId: string, subtaskId: string): HostedDocument | null {
  const db = getCoreDb();
  const row = db.prepare(
    'SELECT * FROM subtask_documents WHERE project_id = ? AND subtask_id = ?'
  ).get(projectId, subtaskId) as HostedDocumentRow | undefined;

  return row ? mapDocumentRow(row) : null;
}

export function createSubtaskDocument(input: {
  projectId: string;
  subtaskId: string;
  kind: HostedDocumentKind;
  title: string;
  content?: string;
}): HostedDocument {
  const db = getCoreDb();
  const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO subtask_documents (id, project_id, subtask_id, kind, title, content, created_at, updated_at)
    VALUES (@id, @projectId, @subtaskId, @kind, @title, @content, @createdAt, @updatedAt)
  `).run({
    id,
    projectId: input.projectId,
    subtaskId: input.subtaskId,
    kind: input.kind,
    title: input.title,
    content: input.content ?? '',
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    projectId: input.projectId,
    subtaskId: input.subtaskId,
    kind: input.kind,
    title: input.title,
    content: input.content ?? '',
    createdAt: now,
    updatedAt: now,
  };
}

export function updateSubtaskDocument(
  projectId: string,
  subtaskId: string,
  updates: { title?: string; content?: string }
): HostedDocument | null {
  const current = getSubtaskDocument(projectId, subtaskId);
  if (!current) return null;

  const title = updates.title?.trim() || current.title;
  const content = updates.content ?? current.content;
  const updatedAt = new Date().toISOString();
  const db = getCoreDb();

  db.prepare(`
    UPDATE subtask_documents
    SET title = @title, content = @content, updated_at = @updatedAt
    WHERE project_id = @projectId AND subtask_id = @subtaskId
  `).run({
    projectId,
    subtaskId,
    title,
    content,
    updatedAt,
  });

  return { ...current, title, content, updatedAt };
}

export function deleteSubtaskDocument(projectId: string, subtaskId: string) {
  const db = getCoreDb();
  const result = db.prepare(
    'DELETE FROM subtask_documents WHERE project_id = ? AND subtask_id = ?'
  ).run(projectId, subtaskId);

  return result.changes > 0;
}
