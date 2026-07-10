/**
 * Project CRUD functions
 */

import { getDb } from './db-core';
import type { Project, ProjectRow, Subtask } from './types';

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    note: row.note,
    stage: row.stage,
    category: row.category,
    subtasks: JSON.parse(row.subtasks) as Subtask[],
    boardId: row.board_id,
    assigneeId: row.assignee_id ?? null,
    completedAt: row.completed_at ?? null,
    sortOrder: row.sort_order ?? 0
  };
}

// Project functions
export function getProjectsByBoardId(boardId: string): Project[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects WHERE board_id = ? ORDER BY sort_order ASC, created_at DESC').all(boardId) as ProjectRow[];

  return rows.map(mapProjectRow);
}

export function getAllProjects(): Project[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM projects ORDER BY sort_order ASC, created_at DESC').all() as ProjectRow[];

  return rows.map(mapProjectRow);
}

export function getProjectById(id: string): Project | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
  if (!row) return null;

  return mapProjectRow(row);
}

/**
 * Create a project. Internal use for seeding accepts optional pre-done subtasks.
 */
export function createProject(
  input: {
    title: string;
    note: string;
    stage: Project['stage'];
    subtasks: string[];
    category: string;
    boardId: string;
  },
  preDoneTitles: string[] = []
): Project {
  const slug = input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = `project-${Date.now()}`;
  
  const subtasks = input.subtasks.map((title, index) => ({
    id: `sub-${Date.now()}-${index}`,
    title,
    done: preDoneTitles.includes(title)
  }));

  const project: Project = {
    id,
    slug,
    title: input.title,
    note: input.note,
    stage: input.stage,
    category: input.category || 'General',
    subtasks: subtasks.length > 0 ? subtasks : [{ id: `sub-${Date.now()}`, title: 'First milestone', done: false }],
    boardId: input.boardId,
    completedAt: input.stage === 'done' ? new Date().toISOString() : null,
    sortOrder: Date.now()
  };

  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks, board_id, completed_at, sort_order)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks, @boardId, @completedAt, @sortOrder)
  `).run({
    id: project.id,
    slug: project.slug,
    title: project.title,
    note: project.note,
    stage: project.stage,
    category: project.category,
    subtasks: JSON.stringify(project.subtasks),
    boardId: project.boardId,
    completedAt: project.completedAt,
    sortOrder: project.sortOrder
  });

  return project;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const current = getAllProjects().find((project) => project.id === id);
  if (!current) return null;

  const merged = { ...current, ...updates };
  const completedAt = merged.stage === 'done'
    ? (updates.completedAt !== undefined ? updates.completedAt : current.completedAt ?? new Date().toISOString())
    : null;
  const db = getDb();
  db.prepare(`
    UPDATE projects
    SET slug = @slug, title = @title, note = @note, stage = @stage, category = @category, subtasks = @subtasks, assignee_id = @assigneeId, completed_at = @completedAt, sort_order = @sortOrder
    WHERE id = @id
  `).run({
    id,
    slug: merged.slug,
    title: merged.title,
    note: merged.note,
    stage: merged.stage,
    category: merged.category,
    subtasks: JSON.stringify(merged.subtasks),
    assigneeId: merged.assigneeId ?? null,
    completedAt,
    sortOrder: merged.sortOrder ?? 0
  });

  return { ...merged, completedAt, sortOrder: merged.sortOrder ?? 0 };
}

/**
 * Assign a user to a project (task-level assignment).
 * Pass null to unassign.
 */
export function assignProject(projectId: string, userId: string | null): Project | null {
  const current = getAllProjects().find((project) => project.id === projectId);
  if (!current) return null;

  const db = getDb();
  db.prepare('UPDATE projects SET assignee_id = ? WHERE id = ?').run(userId, projectId);

  return { ...current, assigneeId: userId };
}

/**
 * Assign a user to a specific subtask.
 * Pass null to unassign.
 */
export function assignSubtask(projectId: string, subtaskId: string, userId: string | null): Project | null {
  const current = getAllProjects().find((project) => project.id === projectId);
  if (!current) return null;

  const updatedSubtasks = current.subtasks.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, assigneeId: userId } : subtask
  );

  return updateProject(projectId, { subtasks: updatedSubtasks });
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
