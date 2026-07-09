import { NextResponse } from 'next/server';
import { getAllProjects, createProject, getProjectsByBoardId } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');

  const projects = boardId ? getProjectsByBoardId(boardId) : getAllProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, note, stage, subtasks, category, boardId } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  if (!boardId) {
    return NextResponse.json({ error: 'Board ID is required' }, { status: 400 });
  }

  const project = createProject({
    title,
    note: note || '',
    stage: stage || 'idea',
    subtasks: subtasks || [],
    category: category || 'General',
    boardId
  });

  return NextResponse.json(project, { status: 201 });
}