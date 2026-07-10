import { NextResponse } from 'next/server';
import { getAllBoards, createBoard, getBoardByJoinCode, verifyBoardPassword, getBoardsByOwnerId, addBoardMember } from '@/lib/db';
import { getSession } from '@/lib/session';
import { getDb } from '@/lib/db-core';

export const dynamic = 'force-dynamic';

function normalizeWebsiteUrl(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('Invalid website URL');

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 2048) throw new Error('Website URL is too long');

  const withProtocol = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== 'https:') {
    throw new Error('Website URL must use HTTPS');
  }
  return url.toString();
}

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
    emoji: row.emoji || '📋',
    websiteUrl: row.website_url || null,
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
    // Not authenticated: show only genuinely public boards.
    boards = getAllBoards().filter(b => !b.ownerId && !b.passkeyRequired && !b.passwordHash);
  }
  
  // Don't expose sensitive data like authorPin or passwordHash
  const safeBoards = boards.map(({ authorPin, passwordHash, ...rest }) => ({
    ...rest,
    joinCode: session?.userId ? rest.joinCode : undefined,
    hasPassword: !!passwordHash,
  }));
  return NextResponse.json(safeBoards);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { name, emoji, websiteUrl, password, passkeyRequired } = body;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: 'Board name is too long' }, { status: 400 });
    }
    if (emoji !== undefined && (typeof emoji !== 'string' || !emoji.trim() || emoji.trim().length > 16)) {
      return NextResponse.json({ error: 'Invalid board emoji' }, { status: 400 });
    }
    let normalizedWebsiteUrl: string | null | undefined;
    try {
      normalizedWebsiteUrl = normalizeWebsiteUrl(websiteUrl);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid website URL' }, { status: 400 });
    }
    if (password !== undefined && (typeof password !== 'string' || password.length > 200)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }
    if (passkeyRequired !== undefined && typeof passkeyRequired !== 'boolean') {
      return NextResponse.json({ error: 'Invalid passkey setting' }, { status: 400 });
    }

    // Check if user is authenticated to set as owner
    const session = await getSession();
    
    // Protected boards must be bound to a real account so access can be enforced.
    if ((passkeyRequired || password) && !session?.userId) {
      return NextResponse.json({ error: 'Authentication required for protected boards' }, { status: 401 });
    }
    
    const ownerId = session?.userId || undefined;

    const board = createBoard({ name: name.trim(), emoji: typeof emoji === 'string' ? emoji.trim() : undefined, websiteUrl: normalizedWebsiteUrl, password, ownerId, passkeyRequired: !!passkeyRequired });

    // If user is authenticated and owns the board, also add them as a member
    if (session?.userId && board.ownerId === session.userId) {
      addBoardMember(board.id, session.userId, 'owner');
    }

    // Return the board with the authorPin (only time it's exposed)
    return NextResponse.json({
      id: board.id,
      name: board.name,
      emoji: board.emoji,
      websiteUrl: board.websiteUrl,
      slug: board.slug,
      joinCode: board.joinCode,
      authorPin: board.authorPin,
      hasPassword: !!board.passwordHash,
      passkeyRequired: board.passkeyRequired,
      ownerId: board.ownerId,
      createdAt: board.createdAt
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/boards error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create board' },
      { status: 500 }
    );
  }
}

// Join board by code
export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { joinCode, password } = body;

  if (typeof joinCode !== 'string' || !joinCode.trim()) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }
  const normalizedJoinCode = joinCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,8}$/.test(normalizedJoinCode)) {
    return NextResponse.json({ error: 'Invalid join code' }, { status: 400 });
  }

  const board = getBoardByJoinCode(normalizedJoinCode);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  const session = await getSession();
  const protectedBoard = !!board.ownerId || board.passkeyRequired || !!board.passwordHash;
  if (protectedBoard && !session?.userId) {
    return NextResponse.json({ error: 'Authentication required to join this board', requiresPasskey: board.passkeyRequired, requiresPassword: !!board.passwordHash }, { status: 401 });
  }

  // Check if board requires passkey authentication
  if (board.passkeyRequired) {
    if (!session?.userId) {
      return NextResponse.json({ error: 'This board requires passkey authentication', requiresPasskey: true }, { status: 401 });
    }
  }

  // Check password if board is protected
  if (board.passwordHash) {
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Password required', requiresPassword: true }, { status: 401 });
    }
    if (!verifyBoardPassword(normalizedJoinCode, password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }
  }

  if (session?.userId) {
    addBoardMember(board.id, session.userId, board.ownerId === session.userId ? 'owner' : 'editor');
  }

  // Return board info (without sensitive data)
  return NextResponse.json({
    id: board.id,
    name: board.name,
    emoji: board.emoji,
    websiteUrl: board.websiteUrl,
    slug: board.slug,
    joinCode: board.joinCode,
    hasPassword: !!board.passwordHash,
    passkeyRequired: board.passkeyRequired,
    createdAt: board.createdAt
  });
}
