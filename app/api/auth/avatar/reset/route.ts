import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db-core';

// Admin endpoint to reset all avatar reroll counts
// In production, you'd want to add authentication/authorization
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const db = getDb();
    
    // Reset all users' avatar_rerolls to 0
    db.prepare('UPDATE users SET avatar_rerolls = 0').run();
    
    return NextResponse.json({ success: true, message: 'All avatar reroll counts reset' });
  } catch (error) {
    console.error('[API /api/auth/avatar/reset POST] Failed:', error);
    return NextResponse.json({ error: 'Failed to reset avatar counts' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getDb();
    
    const rows = db.prepare('SELECT id, name, avatar_rerolls FROM users').all() as Array<{ id: string; name: string; avatar_rerolls: number }>;
    
    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error('[API /api/auth/avatar/reset GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 });
  }
}