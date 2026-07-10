import { NextResponse } from 'next/server';
import { getSession, destroySession } from '@/lib/session';
import { getUserById, canChangeUsername, getAvatarRerolls, getAvatarSeed, hasUnlimitedRerolls, MAX_DAILY_REROLLS } from '@/lib/users';
import { generateAvatarFromSeed, getAvatarAccentColor } from '@/lib/avatar';

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

    const unlimited = hasUnlimitedRerolls(user.id);
    const avatarRerolls = getAvatarRerolls(user.id);
    const avatarSeed = getAvatarSeed(user.id);
    const avatar = generateAvatarFromSeed(avatarSeed);
    const avatarAccent = getAvatarAccentColor(avatarSeed);
    // For unlimited users, send a large number since Infinity serializes to null in JSON.
    // The avatarRerollsUnlimited flag is the source of truth on the client.
    const avatarRerollsRemaining = unlimited ? 999999 : Math.max(0, MAX_DAILY_REROLLS - avatarRerolls);

    console.log('[API /api/auth/session GET] Returning authenticated user:', { id: user.id, name: user.name, avatarRerolls, unlimited });
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        friendCode: user.friendCode,
        usernameChangedDate: user.usernameChangedDate,
        canChangeUsername: canChangeUsername(user.id),
        avatar: avatar,
        avatarAccent,
        avatarRerolls,
        avatarRerollsRemaining,
        avatarRerollsUnlimited: unlimited,
      },
    });
  } catch (error) {
    console.error('[API /api/auth/session GET] Session check failed:', error);
    return NextResponse.json({ authenticated: false }, { status: 200 });
  }
}
