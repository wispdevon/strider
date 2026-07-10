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
      friend_code TEXT UNIQUE NOT NULL,
      avatar_rerolls INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Add avatar_rerolls column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'avatar_rerolls')) {
      db.exec(`ALTER TABLE users ADD COLUMN avatar_rerolls INTEGER NOT NULL DEFAULT 0`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add avatar_seed column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'avatar_seed')) {
      db.exec(`ALTER TABLE users ADD COLUMN avatar_seed TEXT`);
      // Set default seed to user id for existing users
      const users = db.prepare("SELECT id FROM users").all() as Array<{ id: string }>;
      for (const u of users) {
        db.prepare("UPDATE users SET avatar_seed = ? WHERE id = ?").run(u.id, u.id);
      }
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add avatar_rerolls_date column if it doesn't exist (migration for daily reset)
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'avatar_rerolls_date')) {
      db.exec(`ALTER TABLE users ADD COLUMN avatar_rerolls_date TEXT`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add username_changed_date column if it doesn't exist (daily username change limit)
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'username_changed_date')) {
      db.exec(`ALTER TABLE users ADD COLUMN username_changed_date TEXT`);
    }
  } catch {
    // Column might already exist, ignore
  }

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

  // Temporary WebAuthn challenges table (no foreign key - stores ephemeral challenge data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS webauthn_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      challenge TEXT NOT NULL,
      options_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clean up any stale challenges older than 1 hour
  db.exec(`DELETE FROM webauthn_challenges WHERE created_at < datetime('now', '-1 hour')`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Boards must be created before board_members and board_invites (foreign key dependency)
  db.exec(`
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '📋',
      website_url TEXT,
      slug TEXT UNIQUE NOT NULL,
      join_code TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      author_pin TEXT NOT NULL,
      owner_id TEXT,
      passkey_required INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS board_members (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'editor',
      joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(board_id, user_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS friendships (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_id)
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS board_invites (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Add passkey_required column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(boards)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'passkey_required')) {
      db.exec(`ALTER TABLE boards ADD COLUMN passkey_required INTEGER NOT NULL DEFAULT 0`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add emoji column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(boards)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'emoji')) {
      db.exec(`ALTER TABLE boards ADD COLUMN emoji TEXT NOT NULL DEFAULT '📋'`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add website_url column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(boards)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'website_url')) {
      db.exec(`ALTER TABLE boards ADD COLUMN website_url TEXT`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add friend_code column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
    if (!columns.some(col => col.name === 'friend_code')) {
      db.exec(`ALTER TABLE users ADD COLUMN friend_code TEXT`);
      // Generate friend codes for existing users
      const users = db.prepare("SELECT id FROM users").all() as Array<{ id: string }>;
      for (const u of users) {
        const code = generateCode(8);
        db.prepare("UPDATE users SET friend_code = ? WHERE id = ?").run(code, u.id);
      }
      // Make column NOT NULL after populating
      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_friend_code ON users(friend_code)`);
    }
  } catch {
    // Column might already exist, ignore
  }

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
      assignee_id TEXT,
      completed_at TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  // Add assignee_id column if it doesn't exist (migration)
  try {
    const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
    if (columns.length > 0 && !columns.some(col => col.name === 'assignee_id')) {
      db.exec(`ALTER TABLE projects ADD COLUMN assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add completed_at column if it doesn't exist (completion history)
  try {
    const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
    if (columns.length > 0 && !columns.some(col => col.name === 'completed_at')) {
      db.exec(`ALTER TABLE projects ADD COLUMN completed_at TEXT`);
    }
  } catch {
    // Column might already exist, ignore
  }

  // Add sort_order column if it doesn't exist (manual card ordering)
  try {
    const columns = db.prepare("PRAGMA table_info(projects)").all() as Array<{ name: string }>;
    if (columns.length > 0 && !columns.some(col => col.name === 'sort_order')) {
      db.exec(`ALTER TABLE projects ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0`);
    }
  } catch {
    // Column might already exist, ignore
  }

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
    INSERT INTO boards (id, name, emoji, website_url, slug, join_code, password_hash, author_pin, owner_id, created_at)
    VALUES (@id, @name, @emoji, @websiteUrl, @slug, @joinCode, @passwordHash, @authorPin, @ownerId, @createdAt)
  `).run({
    id: defaultId,
    name: 'My Workspace',
    emoji: '📋',
    websiteUrl: null,
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
