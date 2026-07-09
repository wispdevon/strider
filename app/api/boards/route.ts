import { NextResponse } from 'next/server';
import { getAllBoards, createBoard, getBoardByJoinCode, verifyBoardPassword } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const boards = getAllBoards();
  // Don't expose sensitive data like authorPin or passwordHash
  const safeBoards = boards.map(({ authorPin, passwordHash, ...rest }) => rest);
  return NextResponse.json(safeBoards);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, password } = body;

  if (!name) {
    return NextResponse.json({ error: 'Board name is required' }, { status: 400 });
  }

  const board = createBoard({ name, password });

  // Return the board with the authorPin (only time it's exposed)
  return NextResponse.json({
    id: board.id,
    name: board.name,
    slug: board.slug,
    joinCode: board.joinCode,
    authorPin: board.authorPin,
    hasPassword: !!board.passwordHash,
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
    createdAt: board.createdAt
  });
}