import { NextResponse } from 'next/server';
import { createProject, getProjectsByBoardId } from '@/lib/db';
import { authorizeBoardRead, authorizeBoardWrite } from '@/lib/board-access';

export const dynamic = 'force-dynamic';

type ProjectCreateSubtaskInput = string | {
  id: string;
  title: string;
  done: boolean;
  assigneeId: string | null;
  assigneeIds?: string[];
};

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
  const normalizedSubtasks: ProjectCreateSubtaskInput[] = Array.isArray(subtasks)
    ? subtasks
        .map((item): ProjectCreateSubtaskInput | null => {
          if (typeof item === 'string') {
            const trimmed = item.trim();
            return trimmed ? trimmed : null;
          }
          if (!item || typeof item !== 'object' || typeof item.title !== 'string') {
            return null;
          }
          const trimmedTitle = item.title.trim();
          if (!trimmedTitle) {
            return null;
          }
          return {
            id: typeof item.id === 'string' ? item.id : '',
            title: trimmedTitle,
            done: !!item.done,
            assigneeId: typeof item.assigneeId === 'string' ? item.assigneeId : null,
            assigneeIds: Array.isArray(item.assigneeIds)
              ? item.assigneeIds.filter((id: unknown): id is string => typeof id === 'string')
              : undefined,
          };
        })
        .filter((item): item is ProjectCreateSubtaskInput => item !== null)
        .slice(0, 50)
    : [];

  const project = createProject({
    id: typeof body.id === 'string' && body.id.trim() ? body.id : undefined,
    slug: typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : undefined,
    title: title.trim(),
    note: typeof note === 'string' ? note.slice(0, 5000) : '',
    stage: validStage,
    subtasks: normalizedSubtasks,
    category: typeof category === 'string' && category.trim() ? category.trim().slice(0, 80) : 'General',
    boardId: access.board.id,
    assigneeId: typeof body.assigneeId === 'string' ? body.assigneeId : null,
    assigneeIds: Array.isArray(body.assigneeIds)
      ? body.assigneeIds.filter((id: unknown): id is string => typeof id === 'string')
      : undefined,
    completedAt: typeof body.completedAt === 'string' ? body.completedAt : body.completedAt === null ? null : undefined,
    sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
  });

  return NextResponse.json(project, { status: 201 });
}
