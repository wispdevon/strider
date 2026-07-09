import { NextResponse } from 'next/server';
import { deleteBoard, verifyAuthorPin, getBoardBySlug } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Get board details by slug
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = getBoardBySlug(id);
  
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Don't expose sensitive data
  const { authorPin, passwordHash, ...safeBoard } = board;
  return NextResponse.json(safeBoard);
}

// Delete board with PIN verification
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { pin } = body;

  if (!pin) {
    return NextResponse.json({ error: 'Author PIN is required for deletion' }, { status: 400 });
  }

  // First verify the PIN to get the board ID
  const board = getBoardBySlug(id);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  if (!verifyAuthorPin(board.id, pin)) {
    return NextResponse.json({ error: 'Invalid author PIN' }, { status: 401 });
  }

  const success = deleteBoard(board.id, pin);
  if (!success) {
    return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}