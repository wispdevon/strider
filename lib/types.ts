/**
 * Core type definitions for Strider
 */

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  assigneeId?: string | null;
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
  assigneeId?: string | null;
}

export interface Board {
  id: string;
  name: string;
  emoji: string;
  websiteUrl: string | null;
  slug: string;
  joinCode: string;
  passwordHash: string | null;
  authorPin: string;
  ownerId: string | null;
  passkeyRequired: boolean;
  createdAt: string;
}

export interface BoardWithProjects extends Board {
  projects: Project[];
}

export interface User {
  id: string;
  name: string;
  email: string | null;
  friendCode: string;
  usernameChangedDate: string | null;
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
  emoji: string;
  website_url: string | null;
  slug: string;
  join_code: string;
  password_hash: string | null;
  author_pin: string;
  owner_id: string | null;
  passkey_required: number;
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
  assignee_id: string | null;
}

export interface UserRow {
  id: string;
  name: string;
  email: string | null;
  friend_code: string;
  avatar_rerolls: number;
  avatar_rerolls_date: string | null;
  avatar_seed: string | null;
  username_changed_date: string | null;
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

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: string;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}

export interface BoardInvite {
  id: string;
  boardId: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

// Database row types (snake_case from SQLite)
export interface SessionRow {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface BoardMemberRow {
  id: string;
  board_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

export interface BoardInviteRow {
  id: string;
  board_id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  created_at: string;
}
