import { NextResponse } from 'next/server';
import { getDeletedProjectsByBoardId, restoreDeletedProject } from '@/lib/db';
import { authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorizeBoardWrite(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json(getDeletedProjectsByBoardId(access.board.id));
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await authorizeBoardWrite(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => null);
  const deletedProjectId = body && typeof body.deletedProjectId === 'string' ? body.deletedProjectId : '';
  if (!deletedProjectId) {
    return NextResponse.json({ error: 'Deleted project ID is required' }, { status: 400 });
  }

  const restored = restoreDeletedProject(access.board.id, deletedProjectId);
  if (!restored) {
    return NextResponse.json({ error: 'Deleted task not found' }, { status: 404 });
  }

  return NextResponse.json(restored);
}
