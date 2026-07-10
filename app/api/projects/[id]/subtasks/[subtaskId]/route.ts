import { NextResponse } from 'next/server';
import { deleteSubtask, toggleSubtask, assignSubtask, getProjectById } from '@/lib/db';
import { authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const { id, subtaskId } = await params;

  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'delete' ? 'delete' : body.mode === 'assign' ? 'assign' : 'toggle';

  let updated;
  if (mode === 'delete') {
    updated = deleteSubtask(id, subtaskId);
  } else if (mode === 'assign') {
    // body.assigneeId is a user id or null (to unassign)
    updated = assignSubtask(id, subtaskId, body.assigneeId ?? null);
  } else {
    updated = toggleSubtask(id, subtaskId);
  }

  if (!updated) {
    return NextResponse.json({ error: 'Project or subtask not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}