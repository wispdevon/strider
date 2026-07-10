import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  getAvatarRerolls,
  setAvatarSeed,
  hasUnlimitedRerolls,
  incrementAvatarReroll,
  MAX_DAILY_REROLLS,
} from '@/lib/users';
import { generateAvatarOptions, generateAvatarFromSeed } from '@/lib/avatar';

export const dynamic = 'force-dynamic';

// POST: Select an avatar option and save it (consumes one reroll)
export async function POST(request: Request) {
  try {
    const { seed } = await request.json();

    const sessionData = await getSession();

    if (!sessionData) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const unlimited = hasUnlimitedRerolls(sessionData.userId);
    const currentRerolls = getAvatarRerolls(sessionData.userId);

    if (!unlimited && currentRerolls >= MAX_DAILY_REROLLS) {
      return NextResponse.json({ error: 'Maximum daily avatar rerolls reached' }, { status: 400 });
    }

    if (!seed || typeof seed !== 'string') {
      return NextResponse.json({ error: 'Invalid seed' }, { status: 400 });
    }

    // Save the selected seed and increment the reroll counter
    setAvatarSeed(sessionData.userId, seed);
    incrementAvatarReroll(sessionData.userId);

    const avatar = generateAvatarFromSeed(seed);
    // For unlimited users, send a large number since Infinity serializes to null in JSON.
    const rerollsRemaining = unlimited ? 999999 : MAX_DAILY_REROLLS - currentRerolls - 1;

    return NextResponse.json({
      success: true,
      rerollsRemaining,
      unlimited,
      avatar,
    });
  } catch (error) {
    console.error('[API /api/auth/avatar POST] Reroll failed:', error);
    return NextResponse.json({ error: 'Failed to reroll avatar' }, { status: 500 });
  }
}

// GET: Fetch 3 preview options for the reroll modal
export async function GET() {
  try {
    const sessionData = await getSession();

    if (!sessionData) {
      return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    const unlimited = hasUnlimitedRerolls(sessionData.userId);
    const rerollsUsed = getAvatarRerolls(sessionData.userId);
    // For unlimited users, send a large number since Infinity serializes to null in JSON.
    const rerollsRemaining = unlimited ? 999999 : Math.max(0, MAX_DAILY_REROLLS - rerollsUsed);

    if (!unlimited && rerollsRemaining <= 0) {
      return NextResponse.json({
        authenticated: true,
        rerollsRemaining: 0,
        rerollsUsed,
        unlimited,
        options: [],
      });
    }

    // Generate 3 fresh options with random seeds
    const options = generateAvatarOptions(sessionData.userId);

    return NextResponse.json({
      authenticated: true,
      rerollsRemaining,
      rerollsUsed,
      unlimited,
      options: options.map(o => ({ dataUri: o.dataUri, seed: o.seed })),
    });
  } catch (error) {
    console.error('[API /api/auth/avatar GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to get avatar info' }, { status: 500 });
  }
}