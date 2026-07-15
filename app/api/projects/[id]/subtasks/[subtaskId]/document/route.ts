import { NextResponse } from 'next/server';
import {
  createSubtaskDocument,
  deleteSubtaskDocument,
  getProjectById,
  getSubtaskDocument,
  updateProject,
  updateSubtaskDocument,
} from '@/lib/db';
import { authorizeBoardRead, authorizeBoardWrite } from '@/lib/board-access';
import type { HostedDocumentKind, Project, Subtask } from '@/lib/types';

export const dynamic = 'force-dynamic';

function isDocumentKind(value: unknown): value is HostedDocumentKind {
  return value === 'text' || value === 'csv';
}

function findSubtask(project: Project, subtaskId: string) {
  return project.subtasks.find((subtask) => subtask.id === subtaskId) ?? null;
}

function withDocumentMetadata(project: Project, subtaskId: string, updates: Partial<Subtask>) {
  return updateProject(project.id, {
    subtasks: project.subtasks.map((subtask) =>
      subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
    ),
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const { id, subtaskId } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardRead(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!findSubtask(project, subtaskId)) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const document = getSubtaskDocument(id, subtaskId);
  if (!document) {
    return NextResponse.json({ document: null });
  }

  return NextResponse.json({ document });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const { id, subtaskId } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const subtask = findSubtask(project, subtaskId);
  if (!subtask) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  if (getSubtaskDocument(id, subtaskId)) {
    return NextResponse.json({ error: 'Subtask already has a document' }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isDocumentKind(body.kind)) {
    return NextResponse.json({ error: 'Document kind must be text or csv' }, { status: 400 });
  }

  const title = typeof body.title === 'string' && body.title.trim()
    ? body.title.trim()
    : `${subtask.title}.${body.kind === 'csv' ? 'csv' : 'txt'}`;
  const content = typeof body.content === 'string' ? body.content : '';
  const document = createSubtaskDocument({ projectId: id, subtaskId, kind: body.kind, title, content });
  const updatedProject = withDocumentMetadata(project, subtaskId, {
    documentId: document.id,
    documentTitle: document.title,
    documentKind: document.kind,
  });

  return NextResponse.json({ document, project: updatedProject }, { status: 201 });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const { id, subtaskId } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!findSubtask(project, subtaskId)) {
    return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const document = updateSubtaskDocument(id, subtaskId, {
    title: typeof body.title === 'string' ? body.title : undefined,
    content: typeof body.content === 'string' ? body.content : undefined,
  });

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const updatedProject = withDocumentMetadata(project, subtaskId, {
    documentId: document.id,
    documentTitle: document.title,
    documentKind: document.kind,
  });

  return NextResponse.json({ document, project: updatedProject });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; subtaskId: string }> }) {
  const { id, subtaskId } = await params;
  const project = getProjectById(id);
  if (!project) {
    return NextResponse.json({ success: true });
  }

  const access = await authorizeBoardWrite(project.boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  deleteSubtaskDocument(id, subtaskId);
  const updatedProject = withDocumentMetadata(project, subtaskId, {
    documentId: null,
    documentTitle: null,
    documentKind: null,
  });

  return NextResponse.json({ success: true, project: updatedProject });
}
