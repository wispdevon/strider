import { NextResponse } from 'next/server';
import {
  getProjectById,
  getSubtaskDocumentById,
  updateSubtaskDocumentById,
} from '@/lib/db';
import { authorizeBoardRead, authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const document = getSubtaskDocumentById(id);
  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const project = getProjectById(document.projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardRead(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  return NextResponse.json({ document, project });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = getSubtaskDocumentById(id);
  if (!current) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const project = getProjectById(current.projectId);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await request.json().catch(() => ({}));
  const document = updateSubtaskDocumentById(id, {
    title: typeof body.title === 'string' ? body.title : undefined,
    content: typeof body.content === 'string' ? body.content : undefined,
  });

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return NextResponse.json({ document, project });
}
