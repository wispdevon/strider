import { NextResponse } from 'next/server';
import { updateProject, deleteProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  const updated = updateProject(id, body);
  if (!updated) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteProject(id);
  return NextResponse.json({ success: true });
}