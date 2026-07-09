import { NextResponse } from 'next/server';
import { getAllBoards, createBoard, getBoardByJoinCode, verifyBoardPassword, getBoardsByOwnerId, addBoardMember } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db-core';

export const dynamic = 'force-dynamic';

// Helper to get boards where user is a member
function getBoardsByMemberId(userId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT b.* FROM boards b
    INNER JOIN board_members bm ON b.id = bm.board_id
    WHERE bm.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId) as any[];
  
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

export async function GET() {
  const session = await getSession();
  
  let boards;
  if (session?.userId) {
    // Authenticated: show user's owned boards + boards they're members of
    const ownedBoards = getBoardsByOwnerId(session.userId);
    const memberBoards = getBoardsByMemberId(session.userId);
    
    // Combine and deduplicate
    const boardMap = new Map<string, any>();
    for (const board of ownedBoards) {
      boardMap.set(board.id, { ...board, isOwner: true });
    }
    for (const board of memberBoards) {
      if (!boardMap.has(board.id)) {
        boardMap.set(board.id, { ...board, isOwner: false });
      }
    }
    boards = Array.from(boardMap.values());
  } else {
    // Not authenticated: show only public boards (no passkeyRequired)
    boards = getAllBoards().filter(b => !b.passkeyRequired);
  }
  
  // Don't expose sensitive data like authorPin or passwordHash
  const safeBoards = boards.map(({ authorPin, passwordHash, ...rest }) => ({
    ...rest,
    hasPassword: !!passwordHash,
  }));
  return NextResponse.json(safeBoards);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, password, passkeyRequired } = body;

  if (!name) {
    return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
  }

  // Check if user is authenticated to set as owner
  const session = await getSession();
  
  // If passkeyRequired is true, user must be authenticated
  if (passkeyRequired && !session?.userId) {
    return NextResponse.json({ error: 'Authentication required for passkey-bound boards' }, { status: 401 });
  }
  
  const ownerId = session?.userId || undefined;

  const board = createBoard({ name, password, ownerId, passkeyRequired: !!passkeyRequired });

  // If user is authenticated and owns the board, also add them as a member
  if (session?.userId && board.ownerId === session.userId) {
    addBoardMember(board.id, session.userId, 'owner');
  }

  // Return the board with the authorPin (only time it's exposed)
  return NextResponse.json({
    id: board.id,
    name: board.name,
    slug: board.slug,
    joinCode: board.joinCode,
    authorPin: board.authorPin,
    hasPassword: !!board.passwordHash,
    passkeyRequired: board.passkeyRequired,
    ownerId: board.ownerId,
    createdAt: board.createdAt
  }, { status: 201 });
}

// Join board by code
export async function PUT(request: Request) {
  const body = await request.json();
  const { joinCode, password } = body;

  if (!joinCode) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }

  const board = getBoardByJoinCode(joinCode);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Check if board requires passkey authentication
  if (board.passkeyRequired) {
    const session = await getSession();
    if (!session?.userId) {
      return NextResponse.json({ error: 'This board requires passkey authentication', requiresPasskey: true }, { status: 401 });
    }
    // Add user as member when joining a passkey-required board
    addBoardMember(board.id, session.userId, 'editor');
  }

  // Check password if board is protected
  if (board.passwordHash) {
    if (!password) {
      return NextResponse.json({ error: 'Password required', requiresPassword: true }, { status: 401 });
    }
    if (!verifyBoardPassword(joinCode, password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  }

  // Return board info (without sensitive data)
  return NextResponse.json({
    id: board.id,
    name: board.name,
    slug: board.slug,
    joinCode: board.joinCode,
    hasPassword: !!board.passwordHash,
    passkeyRequired: board.passkeyRequired,
    createdAt: board.createdAt
  });
}