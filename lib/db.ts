import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

type SqliteDatabase = InstanceType<typeof Database>;

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  note: string;
  stage: 'idea' | 'planning' | 'active' | 'review' | 'done';
  category: string;
  subtasks: Subtask[];
}

const dbDir = path.join(process.cwd(), 'data');
const dbPath = path.join(dbDir, 'strider.sqlite');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let dbInstance: SqliteDatabase | null = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    initializeDb();
  }

  return dbInstance;
}

function initializeDb() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      subtasks TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as count FROM projects').get() as { count: number };
  if (count.count === 0) {
    seedDefaultProjects();
  }
}

function seedDefaultProjects() {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks)
  `);

  const defaults: Project[] = [
    {
      id: 'project-1',
      slug: 'onboarding-refresh',
      title: 'Onboarding refresh',
      note: 'Simplify the first-run experience for new users.',
      stage: 'planning',
      category: 'Product',
      subtasks: [
        { id: 'sub-1', title: 'Gather feedback', done: true },
        { id: 'sub-2', title: 'Map the current flow', done: true },
        { id: 'sub-3', title: 'Prototype the new path', done: false },
        { id: 'sub-4', title: 'Ship the update', done: false }
      ]
    },
    {
      id: 'project-2',
      slug: 'workflow-automation',
      title: 'Workflow automation',
      note: 'Reduce manual handoffs between research and delivery.',
      stage: 'active',
      category: 'Operations',
      subtasks: [
        { id: 'sub-5', title: 'Document the pipeline', done: true },
        { id: 'sub-6', title: 'Automate the triage step', done: true },
        { id: 'sub-7', title: 'Monitor the first run', done: false }
      ]
    },
    {
      id: 'project-3',
      slug: 'skill-sprint',
      title: 'Skill sprint',
      note: 'Practice systems design with one weekly exercise.',
      stage: 'idea',
      category: 'Personal',
      subtasks: [
        { id: 'sub-8', title: 'Choose a topic', done: false },
        { id: 'sub-9', title: 'Build a small demo', done: false }
      ]
    }
  ];

  for (const project of defaults) {
    stmt.run({
      id: project.id,
      slug: project.slug,
      title: project.title,
      note: project.note,
      stage: project.stage,
      category: project.category,
      subtasks: JSON.stringify(project.subtasks)
    });
  }
}

export function getAllProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Array<{
    id: string;
    slug: string;
    title: string;
    note: string;
    stage: Project['stage'];
    category: string;
    subtasks: string;
  }>;

  return rows.map((row) => ({
    ...row,
    subtasks: JSON.parse(row.subtasks) as Subtask[]
  }));
}

export function createProject(input: {
  title: string;
  note: string;
  stage: Project['stage'];
  subtasks: string[];
  category: string;
}): Project {
  const slug = input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `project-${Date.now()}`;
  const subtasks = input.subtasks.map((title, index) => ({
    id: `sub-${Date.now()}-${index}`,
    title,
    done: false
  }));

  const project: Project = {
    id,
    slug,
    title: input.title,
    note: input.note,
    stage: input.stage,
    category: input.category || 'General',
    subtasks: subtasks.length > 0 ? subtasks : [{ id: `sub-${Date.now()}`, title: 'First milestone', done: false }]
  };

  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks)
  `).run({
    id: project.id,
    slug: project.slug,
    title: project.title,
    note: project.note,
    stage: project.stage,
    category: project.category,
    subtasks: JSON.stringify(project.subtasks)
  });

  return project;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const current = getAllProjects().find((project) => project.id === id);
  if (!current) return null;

  const merged = { ...current, ...updates };
  const db = getDb();
  db.prepare(`
    UPDATE projects
    SET slug = @slug, title = @title, note = @note, stage = @stage, category = @category, subtasks = @subtasks
    WHERE id = @id
  `).run({
    id,
    slug: merged.slug,
    title: merged.title,
    note: merged.note,
    stage: merged.stage,
    category: merged.category,
    subtasks: JSON.stringify(merged.subtasks)
  });

  return merged;
}

export function toggleSubtask(projectId: string, subtaskId: string): Project | null {
  const current = getAllProjects().find((project) => project.id === projectId);
  if (!current) return null;

  const updatedSubtasks = current.subtasks.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, done: !subtask.done } : subtask
  );

  return updateProject(projectId, { subtasks: updatedSubtasks });
}

export function deleteProject(id: string) {
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export function deleteSubtask(projectId: string, subtaskId: string): Project | null {
  const project = getAllProjects().find((item) => item.id === projectId);
  if (!project) return null;

  const updatedSubtasks = project.subtasks.filter((subtask) => subtask.id !== subtaskId);
  return updateProject(projectId, { subtasks: updatedSubtasks });
}
