/**
 * Database core - connection, schema initialization, and helper functions
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import crypto from 'crypto';

type SqliteDatabase = InstanceType<typeof Database>;

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

export function generateCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function hashPassword(password: string): string {
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

  // Users table for passkey authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Passkey credentials table
  db.exec(`
    CREATE TABLE IF NOT EXISTS passkey_credentials (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      credential_id TEXT UNIQUE NOT NULL,
      public_key TEXT NOT NULL,
      counter INTEGER NOT NULL DEFAULT 0,
      device_type TEXT NOT NULL DEFAULT 'singleDevice',
      backed_up INTEGER NOT NULL DEFAULT 0,
      transports TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      join_code TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      author_pin TEXT NOT NULL,
      owner_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
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
  
  // Insert default board
  const defaultId = 'board-default';
  const defaultSlug = 'my-workspace';
  const defaultJoinCode = 'DEFAULT1';
  const defaultAuthorPin = '123456';
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO boards (id, name, slug, join_code, password_hash, author_pin, owner_id, created_at)
    VALUES (@id, @name, @slug, @joinCode, @passwordHash, @authorPin, @ownerId, @createdAt)
  `).run({
    id: defaultId,
    name: 'My Workspace',
    slug: defaultSlug,
    joinCode: defaultJoinCode,
    passwordHash: null,
    authorPin: defaultAuthorPin,
    ownerId: null,
    createdAt: now
  });

  // Insert seed projects
  const stmt = db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks, board_id)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks, @boardId)
  `);

  const projects = [
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

  for (const project of projects) {
    stmt.run({
      id: project.id,
      slug: project.slug,
      title: project.title,
      note: project.note,
      stage: project.stage,
      category: project.category,
      subtasks: JSON.stringify(project.subtasks),
      boardId: defaultId
    });
  }
}
