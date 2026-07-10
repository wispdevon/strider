import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createBoardInvite, getBoardInvitesToUser } from '@/lib/db';
import { getUserByFriendCode, getAvatarSeed } from '@/lib/users';
import { getBoardBySlug } from '@/lib/boards';
import { generateAvatarFromSeed } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

// Get all invites for the current user
export async function GET() {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const invites = getBoardInvitesToUser(session.userId);
  // Add avatars to each invite
  const invitesWithAvatars = invites.map((invite: any) => ({
    ...invite,
    fromUserAvatar: generateAvatarFromSeed(getAvatarSeed(invite.fromUserId)),
  }));
  return NextResponse.json(invitesWithAvatars);
}

// Create a board invite (invite a friend to a board)
export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { boardSlug, friendCode } = body;

  if (!boardSlug || !friendCode) {
    return NextResponse.json({ error: 'Board slug and friend code are required' }, { status: 400 });
  }

  // Get the board
  const board = getBoardBySlug(boardSlug);
  if (!board) {
    return NextResponse.json({ error: 'Board not found' }, { status: 404 });
  }

  // Check if user is the owner or a member
  const db = require('@/lib/db-core').getDb();
  const isOwner = board.ownerId === session.userId;
  if (!isOwner) {
    const isMember = db.prepare('SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?').get(board.id, session.userId);
    if (!isMember) {
      return NextResponse.json({ error: 'You must be a board member to invite others' }, { status: 403 });
    }
  }

  // Find friend by friend code
  const friend = getUserByFriendCode(friendCode);
  if (!friend) {
    return NextResponse.json({ error: 'User not found with this friend code' }, { status: 404 });
  }

  if (friend.id === session.userId) {
    return NextResponse.json({ error: 'Cannot invite yourself' }, { status: 400 });
  }

  // Check if already a member
  const alreadyMember = db.prepare('SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?').get(board.id, friend.id);
  if (alreadyMember) {
    return NextResponse.json({ error: 'User is already a member of this board' }, { status: 400 });
  }

  // Create invite
  const inviteId = createBoardInvite(board.id, session.userId, friend.id);

  return NextResponse.json({
    success: true,
    invite: {
      id: inviteId,
      boardId: board.id,
      toUserId: friend.id,
      toUserName: friend.name,
      boardName: board.name
    }
  });
}