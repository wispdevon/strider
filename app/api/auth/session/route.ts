import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/session';
import { getUserById } from '@/lib/users';
import { generateAvatarDataUri } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

export async function GET() {
  console.log('[API /api/auth/session GET] Checking session');
  try {
    const sessionData = await getSession();
    console.log('[API /api/auth/session GET] Session data:', sessionData ? { userId: sessionData.userId } : 'null (no session)');
    
    if (!sessionData) {
      console.log('[API /api/auth/session GET] No session found, returning unauthenticated');
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const user = getUserById(sessionData.userId);
    console.log('[API /api/auth/session GET] User lookup result:', user ? { id: user.id, name: user.name } : 'null (user not found)');
    if (!user) {
      // Session exists but user doesn't - clean up
      console.log('[API /api/auth/session GET] Session exists but user missing, destroying session');
      await destroySession();
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    console.log('[API /api/auth/session GET] Returning authenticated user:', { id: user.id, name: user.name });
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        friendCode: user.friendCode,
        avatar: generateAvatarDataUri(user.id),
      },
    });
  } catch (error) {
    console.error('[API /api/auth/session GET] Session check failed:', error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
