import { NextResponse } from 'next/server';
import { updateProject, deleteProject, getProjectById } from '@/lib/db';
import { authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json();
  const updated = updateProject(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const project = getProjectById(id);
  if (!project) {
    // Already gone; report success to avoid leaking existence.
    return NextResponse.json({ success: true });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  deleteProject(id);
  return NextResponse.json({ success: true });
}