import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { createFriendship, getFriendsByUserId, getIncomingFriendRequests, getOutgoingFriendRequests, getUserByFriendCode, updateFriendshipStatus } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const friends = getFriendsByUserId(session.userId);
  const incomingRequests = getIncomingFriendRequests(session.userId);
  const outgoingRequests = getOutgoingFriendRequests(session.userId);

  return NextResponse.json({
    friends: friends.map(f => ({
      id: f.friend.id,
      name: f.friend.name,
      friendCode: f.friend.friendCode,
      status: f.status
    })),
    incomingRequests: incomingRequests.map(r => ({
      id: r.id,
      name: r.user.name,
      friendCode: r.user.friendCode
    })),
    outgoingRequests: outgoingRequests.map(r => ({
      id: r.friend.id,
      name: r.friend.name,
      friendCode: r.friend.friendCode
    }))
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { friendCode } = body;

  if (!friendCode) {
    return NextResponse.json({ error: 'Friend code is required' }, { status: 400 });
  }

  // Find user by friend code
  const friend = getUserByFriendCode(friendCode);
  
  if (!friend) {
    return NextResponse.json({ error: 'User not found with this friend code' }, { status: 404 });
  }

  if (friend.id === session.userId) {
    return NextResponse.json({ error: 'Cannot add yourself as a friend' }, { status: 400 });
  }

  // Create friendship (will auto-accept if they already added us)
  const friendship = createFriendship(session.userId, friend.id);

  // Check if there's a pending request from the other user and auto-accept
  const pending = getIncomingFriendRequests(session.userId).find(r => r.user.id === friend.id);
  if (pending) {
    updateFriendshipStatus(session.userId, friend.id, 'accepted');
  }

  return NextResponse.json({ 
    success: true, 
    friend: {
      id: friend.id,
      name: friend.name,
      friendCode: friend.friendCode
    }
  });
}