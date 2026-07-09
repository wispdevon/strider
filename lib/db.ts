import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import crypto from 'crypto';

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
  boardId: string;
}

export interface Board {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  passwordHash: string | null;
  authorPin: string;
  createdAt: string;
}

export interface BoardWithProjects extends Board {
  projects: Project[];
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

function generateCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function initializeDb() {
  const db = getDb();

  // Check if we need to migrate the schema
  const needsMigration = checkNeedsMigration(db);

  if (needsMigration) {
    // Drop old tables and recreate
    db.exec('DROP TABLE IF EXISTS projects');
    db.exec('DROP TABLE IF EXISTS boards');
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      join_code TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      author_pin TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      stage TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      subtasks TEXT NOT NULL DEFAULT '[]',
      board_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `);

  const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get() as { count: number };
  if (boardCount.count === 0) {
    seedDefaultBoard();
  }
}

function checkNeedsMigration(db: SqliteDatabase): boolean {
  try {
    // Check if projects table exists and has board_id column
    const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
    if (columns.length === 0) return false; // Table doesn't exist, no migration needed
    return !columns.some(col => col.name === 'board_id');
  } catch {
    return false;
  }
}

function seedDefaultBoard() {
  const db = getDb();
  
  const defaultBoard: Board = {
    id: 'board-default',
    name: 'My Workspace',
    slug: 'my-workspace',
    joinCode: 'DEFAULT1',
    passwordHash: null,
    authorPin: '123456',
    createdAt: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO boards (id, name, slug, join_code, password_hash, author_pin, created_at)
    VALUES (@id, @name, @slug, @joinCode, @passwordHash, @authorPin, @createdAt)
  `).run({
    id: defaultBoard.id,
    name: defaultBoard.name,
    slug: defaultBoard.slug,
    joinCode: defaultBoard.joinCode,
    passwordHash: defaultBoard.passwordHash,
    authorPin: defaultBoard.authorPin,
    createdAt: defaultBoard.createdAt
  });

  const stmt = db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks, board_id)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks, @boardId)
  `);

  const defaults: Project[] = [
    {
      id: 'project-1',
      slug: 'onboarding-refresh',
      title: 'Onboarding refresh',
      note: 'Simplify the first-run experience for new users.',
      stage: 'planning',
      category: 'Product',
      boardId: defaultBoard.id,
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
      boardId: defaultBoard.id,
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
      boardId: defaultBoard.id,
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
      subtasks: JSON.stringify(project.subtasks),
      boardId: project.boardId
    });
  }
}

// Board functions
export function getAllBoards(): Board[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM boards ORDER BY created_at DESC').all() as Array<{
    id: string;
    name: string;
    slug: string;
    join_code: string;
    password_hash: string | null;
    author_pin: string;
    created_at: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    createdAt: row.created_at
  }));
}

export function getBoardBySlug(slug: string): BoardWithProjects | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM boards WHERE slug = ?').get(slug) as {
    id: string;
    name: string;
    slug: string;
    join_code: string;
    password_hash: string | null;
    author_pin: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  const board: Board = {
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    createdAt: row.created_at
  };

  const projects = getProjectsByBoardId(board.id);

  return { ...board, projects };
}

export function getBoardByJoinCode(joinCode: string): Board | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM boards WHERE join_code = ?').get(joinCode.toUpperCase()) as {
    id: string;
    name: string;
    slug: string;
    join_code: string;
    password_hash: string | null;
    author_pin: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    joinCode: row.join_code,
    passwordHash: row.password_hash,
    authorPin: row.author_pin,
    createdAt: row.created_at
  };
}

export function createBoard(input: {
  name: string;
  password?: string;
}): Board & { authorPin: string } {
  const db = getDb();
  const id = `board-${Date.now()}`;
  const slug = input.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const joinCode = generateCode(6);
  const authorPin = generatePin();
  const passwordHash = input.password ? hashPassword(input.password) : null;

  db.prepare(`
    INSERT INTO boards (id, name, slug, join_code, password_hash, author_pin)
    VALUES (@id, @name, @slug, @joinCode, @passwordHash, @authorPin)
  `).run({
    id,
    name: input.name,
    slug: `${slug}-${Date.now().toString(36)}`,
    joinCode,
    passwordHash,
    authorPin
  });

  return {
    id,
    name: input.name,
    slug: `${slug}-${Date.now().toString(36)}`,
    joinCode,
    passwordHash,
    authorPin,
    createdAt: new Date().toISOString()
  };
}

export function verifyBoardPassword(joinCode: string, password: string): boolean {
  const board = getBoardByJoinCode(joinCode);
  if (!board) return false;
  if (!board.passwordHash) return true;
  return board.passwordHash === hashPassword(password);
}

export function verifyAuthorPin(boardId: string, pin: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT author_pin FROM boards WHERE id = ?').get(boardId) as { author_pin: string } | undefined;
  if (!row) return false;
  return row.author_pin === pin;
}

export function deleteBoard(boardId: string, pin: string): boolean {
  if (!verifyAuthorPin(boardId, pin)) return false;
  
  const db = getDb();
  db.prepare('DELETE FROM projects WHERE board_id = ?').run(boardId);
  db.prepare('DELETE FROM boards WHERE id = ?').run(boardId);
  return true;
}

// Project functions
export function getProjectsByBoardId(boardId: string): Project[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects WHERE board_id = ? ORDER BY created_at DESC').all(boardId) as Array<{
    id: string;
    slug: string;
    title: string;
    note: string;
    stage: Project['stage'];
    category: string;
    subtasks: string;
    board_id: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    note: row.note,
    stage: row.stage,
    category: row.category,
    subtasks: JSON.parse(row.subtasks) as Subtask[],
    boardId: row.board_id
  }));
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
    board_id: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    note: row.note,
    stage: row.stage,
    category: row.category,
    subtasks: JSON.parse(row.subtasks) as Subtask[],
    boardId: row.board_id
  }));
}

export function createProject(input: {
  title: string;
  note: string;
  stage: Project['stage'];
  subtasks: string[];
  category: string;
  boardId: string;
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
    subtasks: subtasks.length > 0 ? subtasks : [{ id: `sub-${Date.now()}`, title: 'First milestone', done: false }],
    boardId: input.boardId
  };

  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks, board_id)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks, @boardId)
  `).run({
    id: project.id,
    slug: project.slug,
    title: project.title,
    note: project.note,
    stage: project.stage,
    category: project.category,
    subtasks: JSON.stringify(project.subtasks),
    boardId: project.boardId
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