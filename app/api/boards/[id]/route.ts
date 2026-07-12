import { NextResponse } from 'next/server';
import { getAllBoards, getBoardBySlug, updateBoard, transferBoardOwnership, deleteBoard, verifyAuthorPin, getBoardMembers, getFriendsByUserId } from '@/lib/db';
import { getUserById } from '@/lib/users';
import { getSession } from '@/lib/session';
import { generateAvatarFromSeed } from '@/lib/avatar';
import { getAvatarSeed } from '@/lib/users';
import { authorizeBoardRead } from '@/lib/board-access';

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

// Get board details by slug or ID
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorizeBoardRead(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const board = getBoardBySlug(access.board.slug) || access.board;

  // Get board members with avatars
  const members = access.isMember ? getBoardMembers(board.id) : [];
  const membersWithAvatars = members.map(member => {
    const user = getUserById(member.userId);
    return {
      ...member,
      name: user?.name || 'Unknown',
      friendCode: user?.friendCode || '',
      avatar: user ? generateAvatarFromSeed(getAvatarSeed(user.id)) : null
    };
  });

  // Check if current user is owner
  const isOwner = access.userId && board.ownerId === access.userId;

  // Don't expose sensitive data
  const { authorPin, passwordHash, ...safeBoard } = board;
  return NextResponse.json({
    ...safeBoard,
    joinCode: access.isMember || safeBoard.isPublic ? safeBoard.joinCode : undefined,
    hasPassword: !!passwordHash,
    isOwner: !!isOwner,
    members: membersWithAvatars
  });
}

// Update board settings or transfer ownership.
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { name, emoji, websiteUrl, password, isPublic, passkeyRequired, transferOwnerId } = body;

  // Get the board
  const board = getBoardBySlug(id) || getAllBoards().find(b => b.id === id);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Check if user is authorized to update
  const session = await getSession();
  const isOwner = session?.userId && board.ownerId === session.userId;
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!isOwner) {
    return NextResponse.json({ error: 'Only the board owner can update settings' }, { status: 403 });
  }
  if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 120)) {
    return NextResponse.json({ error: 'Invalid board name' }, { status: 400 });
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
  if (password !== undefined && password !== null && (typeof password !== 'string' || password.length > 200)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
  }
  if (isPublic !== undefined && typeof isPublic !== 'boolean') {
    return NextResponse.json({ error: 'Invalid public setting' }, { status: 400 });
  }
  if (passkeyRequired !== undefined && typeof passkeyRequired !== 'boolean') {
    return NextResponse.json({ error: 'Invalid passkey setting' }, { status: 400 });
  }
  if (transferOwnerId !== undefined && (typeof transferOwnerId !== 'string' || !transferOwnerId)) {
    return NextResponse.json({ error: 'Invalid transfer target' }, { status: 400 });
  }

  let transferred = false;
  if (typeof transferOwnerId === 'string') {
    const acceptedFriend = getFriendsByUserId(session.userId).some(
      (friendship) => friendship.friend.id === transferOwnerId && friendship.status === 'accepted'
    );

    if (!acceptedFriend) {
      return NextResponse.json({ error: 'Ownership can only be transferred to an accepted friend' }, { status: 403 });
    }

    const success = transferBoardOwnership(board.id, session.userId, transferOwnerId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 });
    }
    transferred = true;
  }

  const updated = updateBoard(board.id, {
    name: typeof name === 'string' ? name.trim() : undefined,
    emoji: typeof emoji === 'string' ? emoji.trim() : undefined,
    websiteUrl: normalizedWebsiteUrl,
    password: password !== undefined ? password : undefined,
    isPublic: isPublic !== undefined ? isPublic : undefined,
    passkeyRequired: passkeyRequired !== undefined ? passkeyRequired : undefined,
  });

  if (!updated) {
    return NextResponse.json({ error: 'Failed to update board' }, { status: 500 });
  }

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    emoji: updated.emoji,
    websiteUrl: updated.websiteUrl,
    slug: updated.slug,
    joinCode: updated.joinCode,
    hasPassword: !!updated.passwordHash,
    isPublic: updated.isPublic,
    passkeyRequired: updated.passkeyRequired,
    ownerId: transferred ? transferOwnerId : updated.ownerId,
    isOwner: !transferred,
    createdAt: updated.createdAt
  });
}

// Delete board with PIN verification (or owner session)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { pin } = body;

  // Get the board
  const board = getBoardBySlug(id) || getAllBoards().find(b => b.id === id);
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

  if (board.ownerId) {
    return NextResponse.json({ error: 'Only the board owner can delete this board' }, { status: 403 });
  }

  // Otherwise require PIN
  if (typeof pin !== 'string' || !pin) {
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
