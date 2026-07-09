import { NextResponse } from 'next/server';
import { deleteSubtask, toggleSubtask } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const { id, subtaskId } = await params;
  const body = await request.json().catch(() => ({}));
  const mode = body.mode === 'delete' ? 'delete' : 'toggle';

  const updated = mode === 'delete' ? deleteSubtask(id, subtaskId) : toggleSubtask(id, subtaskId);

  if (!updated) {
    return NextResponse.json({ error: 'Project or subtask not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}
