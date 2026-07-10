import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { acceptBoardInviteForUser, cancelBoardInviteForUser, declineBoardInviteForUser } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Accept or decline an invite
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const { accept } = body;

  if (accept) {
    const success = acceptBoardInviteForUser(id, session.userId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to accept invite or invite not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } else {
    const success = declineBoardInviteForUser(id, session.userId);
    if (!success) {
      return NextResponse.json({ error: 'Failed to decline invite or invite not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  }
}

// Cancel a pending invite (when sender cancels)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const success = cancelBoardInviteForUser(id, session.userId);
  
  if (!success) {
    return NextResponse.json({ error: 'Failed to cancel invite or invite not found' }, { status: 404 });
  }
  
  return NextResponse.json({ success: true });
}
