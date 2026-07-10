import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db-core';

// Admin endpoint to reset all avatar reroll counts.
// Requires Authorization: Bearer <ADMIN_API_TOKEN>; disabled if the token is unset.
export const dynamic = 'force-dynamic';

function authorizeAdmin(request: Request) {
  const token = process.env.ADMIN_API_TOKEN;
  if (!token) {
    return { ok: false as const, response: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }

  const auth = request.headers.get('authorization') || '';
  const provided = auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
  if (provided !== token) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  return { ok: true as const };
}

export async function POST(request: Request) {
  const admin = authorizeAdmin(request);
  if (!admin.ok) return admin.response;

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

export async function GET(request: Request) {
  const admin = authorizeAdmin(request);
  if (!admin.ok) return admin.response;

  try {
    const db = getDb();
    
    const rows = db.prepare('SELECT id, name, avatar_rerolls FROM users').all() as Array<{ id: string; name: string; avatar_rerolls: number }>;
    
    return NextResponse.json({ users: rows });
  } catch (error) {
    console.error('[API /api/auth/avatar/reset GET] Failed:', error);
    return NextResponse.json({ error: 'Failed to get user data' }, { status: 500 });
  }
}
