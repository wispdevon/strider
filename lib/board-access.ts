 /**
 * Shared authorization helpers for board-scoped resources.
 *
 * Boards follow a two-tier access model inherited from the boards API:
 *  - Public boards (no owner, no passkey, no password) are readable by anyone.
 *  - Passkey/password-protected boards require the user to be authenticated and
 *    a member (or the owner) to read or mutate.
 *
 * Mutations (create/update/delete projects & subtasks) always require an
 * authenticated member of the board.
 */
import { getSession } from './session';
import { getAllBoards, getBoardBySlug, isBoardMember } from './boards';
import type { Board, BoardWithProjects } from './types';

export type BoardAccess =
  | { ok: true; userId: string | null; isMember: boolean; board: Board | BoardWithProjects }
  | { ok: false; status: number; error: string };

function getBoardBySlugOrId(value: string) {
  return getBoardBySlug(value) || getAllBoards().find((board) => board.id === value) || null;
}

/**
 * Authorize read access to a board's projects.
 * Returns the board plus the (possibly null) viewer identity.
 */
export async function authorizeBoardRead(boardId: string): Promise<BoardAccess> {
  const board = getBoardBySlugOrId(boardId);
  if (!board) {
    return { ok: false, status: 404, error: 'Board not found' };
  }

  if (board.ownerId || board.passkeyRequired || board.passwordHash) {
    const { userId } = (await getSession()) ?? {};
    if (!userId) {
      return { ok: false, status: 401, error: 'This board requires authentication' };
    }
    const member = isBoardMember(board.id, userId);
    if (!member && board.ownerId !== userId) {
      return { ok: false, status: 403, error: 'You are not a member of this board' };
    }
    return { ok: true, userId, isMember: true, board };
  }

  // Public board: readable by anyone, but we still resolve identity for member checks.
  const { userId } = (await getSession()) ?? {};
  const isMember = userId ? isBoardMember(board.id, userId) || board.ownerId === userId : false;
  return { ok: true, userId: userId ?? null, isMember, board };
}

/**
 * Authorize a mutation on a board. Always requires an authenticated member.
 */
export async function authorizeBoardWrite(boardId: string): Promise<BoardAccess> {
  const board = getBoardBySlugOrId(boardId);
  if (!board) {
    return { ok: false, status: 404, error: 'Board not found' };
  }

  const { userId } = (await getSession()) ?? {};
  if (!userId) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  const isMember = isBoardMember(board.id, userId) || board.ownerId === userId;
  if (!isMember) {
    return { ok: false, status: 403, error: 'You must be a member of this board to modify it' };
  }

  return { ok: true, userId, isMember: true, board };
}
