import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { canChangeUsername, updateUsername } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Username is required' }, { status: 400 });
  }

  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 40) {
    return NextResponse.json({ error: 'Username must be 2-40 characters' }, { status: 400 });
  }

  if (!canChangeUsername(session.userId)) {
    return NextResponse.json({ error: 'Username can only be changed once per day' }, { status: 429 });
  }

  const user = updateUsername(session.userId, trimmed);
  if (!user) {
    return NextResponse.json({ error: 'Username can only be changed once per day' }, { status: 429 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      usernameChangedDate: user.usernameChangedDate,
      canChangeUsername: false,
    },
  });
}
