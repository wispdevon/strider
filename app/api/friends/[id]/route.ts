import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { acceptFriendship, rejectFriendship, getIncomingFriendRequests, getUserByFriendCode, cancelOutgoingFriendship } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Handle incoming friend requests (when someone adds you)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { accept } = body;

  // Verify this request belongs to the current user
  const incoming = getIncomingFriendRequests(session.userId);
  const requestExists = incoming.some((r: any) => r.id === id);
  
  if (!requestExists) {
    return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
  }

  try {
    if (accept) {
      const success = acceptFriendship(id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
      }
    } else {
      const success = rejectFriendship(id);
      if (!success) {
        return NextResponse.json({ error: 'Failed to reject request' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to respond to friend request:', error);
    return NextResponse.json({ error: 'Failed to respond to request' }, { status: 500 });
  }
}

// Handle outgoing friend requests (cancel a request you sent)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // The id param is actually a friendCode here
  const friend = getUserByFriendCode(id);
  
  if (!friend) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  try {
    const success = cancelOutgoingFriendship(session.userId, friend.id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel friend request:', error);
    return NextResponse.json({ error: 'Failed to cancel request' }, { status: 500 });
  }
}