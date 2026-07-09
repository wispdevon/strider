import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await destroySession();
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Logout failed:', error);
    return NextResponse.json({ error: error.message || 'Logout failed' }, { status: 400 });
  }
}