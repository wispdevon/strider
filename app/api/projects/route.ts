import { NextResponse } from 'next/server';
import { getAllProjects, createProject } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projects = getAllProjects();
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { title, note, stage, subtasks, category } = body;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const project = createProject({
    title,
    note: note || '',
    stage: stage || 'idea',
    subtasks: subtasks || [],
    category: category || 'General'
  });

  return NextResponse.json(project, { status: 201 });
}