import { NextResponse } from 'next/server';
import { createProject, getProjectsByBoardId } from '@/lib/db';
import { authorizeBoardRead, authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');

  if (boardId) {
    const access = await authorizeBoardRead(boardId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    return NextResponse.json(getProjectsByBoardId(access.board.id));
  }

  return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { title, note, stage, subtasks, category, boardId } = body;

  if (typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (title.length > 160) {
    return NextResponse.json({ error: 'Title is too long' }, { status: 400 });
  }

  if (typeof boardId !== 'string' || !boardId.trim()) {
    return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
  }

  const access = await authorizeBoardWrite(boardId);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const validStage = ['idea', 'planning', 'active', 'review', 'done'].includes(stage) ? stage : 'idea';
  const normalizedSubtasks = Array.isArray(subtasks)
    ? subtasks.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean).slice(0, 50)
    : [];

  const project = createProject({
    title: title.trim(),
    note: typeof note === 'string' ? note.slice(0, 5000) : '',
    stage: validStage,
    subtasks: normalizedSubtasks,
    category: typeof category === 'string' && category.trim() ? category.trim().slice(0, 80) : 'General',
    boardId: access.board.id
  });

  return NextResponse.json(project, { status: 201 });
}
