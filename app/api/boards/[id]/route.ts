import { NextResponse } from 'next/server';
import { getBoardBySlug, updateBoard, deleteBoard, verifyAuthorPin, getBoardMembers } from '@/lib/db';
import { getUserById } from '@/lib/users';
import { getSession } from '@/lib/session';
import { getBoardByJoinCode, getAllBoards } from '@/lib/db';
import { generateAvatarDataUri } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

// Get board details by slug or ID
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const board = getBoardBySlug(id) || getAllBoards().find(b => b.id === id) || null;
  
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Check if board requires passkey and user is not authenticated
  const session = await getSession();
  if (board.passkeyRequired && !session?.userId) {
    return NextResponse.json({ error: 'This board requires passkey authentication', requiresPasskey: true }, { status: 401 });
  }

  // Get board members with avatars
  const members = getBoardMembers(board.id);
  const membersWithAvatars = members.map(member => {
    const user = getUserById(member.userId);
    return {
      ...member,
      name: user?.name || 'Unknown',
      avatar: user ? generateAvatarDataUri(user.id) : null
    };
  });

  // Check if current user is owner
  const isOwner = session?.userId && board.ownerId === session.userId;

  // Don't expose sensitive data
  const { authorPin, passwordHash, ...safeBoard } = board;
  return NextResponse.json({
    ...safeBoard,
    hasPassword: !!passwordHash,
    isOwner: !!isOwner,
    members: membersWithAvatars
  });
}

// Update board (name, password, passkeyRequired)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { name, password, passkeyRequired } = body;

  // Get the board
  const board = getBoardBySlug(id) || getAllBoards().find(b => b.id === id);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Check if user is authorized to update
  const session = await getSession();
  const isOwner = session?.userId && board.ownerId === session.userId;
  
  if (!isOwner) {
    return NextResponse.json({ error: 'Only the board owner can update settings' }, { status: 403 });
  }

  const updated = updateBoard(board.id, {
    name: name ?? undefined,
    password: password !== undefined ? password : undefined,
    passkeyRequired: passkeyRequired !== undefined ? passkeyRequired : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    slug: updated.slug,
    joinCode: updated.joinCode,
    hasPassword: !!updated.passwordHash,
    passkeyRequired: updated.passkeyRequired,
    createdAt: updated.createdAt
  });
}

// Delete board with PIN verification (or owner session)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const { pin } = body;

  // Get the board
  const board = getBoardBySlug(id);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Check if the requester is the authenticated owner (bypasses PIN)
  const session = await getSession();
  const isOwner = session && board.ownerId === session.userId;

  if (isOwner) {
    // Owner can delete without PIN
    const success = deleteBoard(board.id, board.authorPin);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete board' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Otherwise require PIN
  if (!pin) {
    return NextResponse.json({ error: 'Author PIN is required for deletion' }, { status: 400 });
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