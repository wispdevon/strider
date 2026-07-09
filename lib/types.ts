/**
 * Core type definitions for Strider
 */

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
  ownerId: string | null;
  createdAt: string;
}

export interface BoardWithProjects extends Board {
  projects: Project[];
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

export interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string | null;
  createdAt: string;
}

// Database row types (snake_case from SQLite)
export interface BoardRow {
  id: string;
  name: string;
  slug: string;
  join_code: string;
  password_hash: string | null;
  author_pin: string;
  owner_id: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  slug: string;
  title: string;
  note: string;
  stage: Project['stage'];
  category: string;
  subtasks: string;
  board_id: string;
}

export interface UserRow {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
}

export interface PasskeyRow {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: number;
  transports: string | null;
  created_at: string;
}