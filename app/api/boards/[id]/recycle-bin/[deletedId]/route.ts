import { NextResponse } from 'next/server';
import { permanentlyDeleteArchivedProject } from '@/lib/db';
import { authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; deletedId: string }> }) {
  const { id, deletedId } = await params;
  const access = await authorizeBoardWrite(id);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const deleted = permanentlyDeleteArchivedProject(access.board.id, deletedId);
  if (!deleted) {
    return NextResponse.json({ error: 'Deleted task not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
