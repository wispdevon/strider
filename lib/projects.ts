/**
 * Project CRUD functions
 */

import { getDb } from './db-core';
import type { DeletedProject, DeletedProjectRow, Project, ProjectRow, Subtask } from './types';

type CreateProjectInput = {
  id?: string;
  slug?: string;
  title: string;
  note: string;
  stage: Project['stage'];
  subtasks: Array<string | Subtask>;
  category: string;
  boardId: string;
  assigneeId?: string | null;
  assigneeIds?: string[];
  completedAt?: string | null;
  sortOrder?: number;
};

function normalizeAssigneeIds(assigneeIds?: string[] | null, fallbackId?: string | null): string[] {
  const ids = Array.isArray(assigneeIds) ? assigneeIds : [];
  const withFallback = fallbackId ? [fallbackId, ...ids] : ids;
  return Array.from(new Set(withFallback.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)));
}

function parseAssigneeIds(value: string | null | undefined, fallbackId?: string | null): string[] {
  if (!value) return normalizeAssigneeIds([], fallbackId);
  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeAssigneeIds(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [], fallbackId);
  } catch {
    return normalizeAssigneeIds([], fallbackId);
  }
}

function normalizeSubtasks(subtasks: Subtask[]): Subtask[] {
  return subtasks.map((subtask) => ({
    ...subtask,
    assigneeIds: normalizeAssigneeIds(subtask.assigneeIds, subtask.assigneeId),
  }));
}

function mapProjectRow(row: ProjectRow): Project {
  const assigneeIds = parseAssigneeIds(row.assignee_ids, row.assignee_id);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    note: row.note,
    stage: row.stage,
    category: row.category,
    subtasks: normalizeSubtasks(JSON.parse(row.subtasks) as Subtask[]),
    boardId: row.board_id,
    assigneeId: row.assignee_id ?? null,
    assigneeIds,
    completedAt: row.completed_at ?? null,
    sortOrder: row.sort_order ?? 0
  };
}

function mapDeletedProjectRow(row: DeletedProjectRow): DeletedProject {
  const parsed = JSON.parse(row.project_json) as Project;
  return {
    id: row.id,
    boardId: row.board_id,
    deletedAt: row.deleted_at,
    project: {
      ...parsed,
      subtasks: normalizeSubtasks(parsed.subtasks),
      assigneeIds: normalizeAssigneeIds(parsed.assigneeIds, parsed.assigneeId),
    },
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

export function getDeletedProjectsByBoardId(boardId: string): DeletedProject[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM deleted_projects WHERE board_id = ? ORDER BY deleted_at DESC').all(boardId) as DeletedProjectRow[];
  return rows.map(mapDeletedProjectRow);
}

function archiveProjectDeletion(project: Project) {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO deleted_projects (id, board_id, project_json, deleted_at)
    VALUES (@id, @boardId, @projectJson, CURRENT_TIMESTAMP)
  `).run({
    id: project.id,
    boardId: project.boardId,
    projectJson: JSON.stringify(project),
  });
}

/**
 * Create a project. Internal use for seeding accepts optional pre-done subtasks.
 */
export function createProject(input: CreateProjectInput, preDoneTitles: string[] = []): Project {
  const slug = input.slug ?? input.title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const id = input.id ?? `project-${Date.now()}`;
  const assigneeIds = normalizeAssigneeIds(input.assigneeIds, input.assigneeId);

  const subtasks = normalizeSubtasks(
    input.subtasks.map((subtask, index) => {
      if (typeof subtask === 'string') {
        return {
          id: `sub-${Date.now()}-${index}`,
          title: subtask,
          done: preDoneTitles.includes(subtask)
        };
      }

      return {
        id: subtask.id || `sub-${Date.now()}-${index}`,
        title: subtask.title,
        done: !!subtask.done,
        assigneeId: subtask.assigneeId ?? null,
        assigneeIds: subtask.assigneeIds
      };
    })
  );

  const project: Project = {
    id,
    slug,
    title: input.title,
    note: input.note,
    stage: input.stage,
    category: input.category || 'General',
    subtasks: subtasks.length > 0 ? subtasks : [{ id: `sub-${Date.now()}`, title: 'First milestone', done: false }],
    boardId: input.boardId,
    assigneeId: assigneeIds[0] ?? null,
    assigneeIds,
    completedAt: input.completedAt !== undefined ? input.completedAt : input.stage === 'done' ? new Date().toISOString() : null,
    sortOrder: input.sortOrder ?? Date.now()
  };

  const db = getDb();
  db.prepare(`
    INSERT INTO projects (id, slug, title, note, stage, category, subtasks, board_id, assignee_id, assignee_ids, completed_at, sort_order)
    VALUES (@id, @slug, @title, @note, @stage, @category, @subtasks, @boardId, @assigneeId, @assigneeIds, @completedAt, @sortOrder)
  `).run({
    id: project.id,
    slug: project.slug,
    title: project.title,
    note: project.note,
    stage: project.stage,
    category: project.category,
    subtasks: JSON.stringify(project.subtasks),
    boardId: project.boardId,
    assigneeId: project.assigneeId ?? null,
    assigneeIds: JSON.stringify(project.assigneeIds ?? []),
    completedAt: project.completedAt,
    sortOrder: project.sortOrder
  });

  return project;
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const current = getAllProjects().find((project) => project.id === id);
  if (!current) return null;

  const merged = { ...current, ...updates };
  const assigneeIds = normalizeAssigneeIds(merged.assigneeIds, merged.assigneeId);
  const subtasks = normalizeSubtasks(merged.subtasks);
  const completedAt = merged.stage === 'done'
    ? (updates.completedAt !== undefined ? updates.completedAt : current.completedAt ?? new Date().toISOString())
    : null;
  const db = getDb();
  db.prepare(`
    UPDATE projects
    SET slug = @slug, title = @title, note = @note, stage = @stage, category = @category, subtasks = @subtasks, assignee_id = @assigneeId, assignee_ids = @assigneeIds, completed_at = @completedAt, sort_order = @sortOrder
    WHERE id = @id
  `).run({
    id,
    slug: merged.slug,
    title: merged.title,
    note: merged.note,
    stage: merged.stage,
    category: merged.category,
    subtasks: JSON.stringify(subtasks),
    assigneeId: assigneeIds[0] ?? null,
    assigneeIds: JSON.stringify(assigneeIds),
    completedAt,
    sortOrder: merged.sortOrder ?? 0
  });

  return { ...merged, subtasks, assigneeId: assigneeIds[0] ?? null, assigneeIds, completedAt, sortOrder: merged.sortOrder ?? 0 };
}

/**
 * Assign a user to a project (task-level assignment).
 * Pass null to unassign.
 */
export function assignProject(projectId: string, userId: string | null): Project | null {
  const current = getAllProjects().find((project) => project.id === projectId);
  if (!current) return null;

  const assigneeIds = normalizeAssigneeIds(userId ? [userId] : []);
  const db = getDb();
  db.prepare('UPDATE projects SET assignee_id = ?, assignee_ids = ? WHERE id = ?').run(assigneeIds[0] ?? null, JSON.stringify(assigneeIds), projectId);

  return { ...current, assigneeId: assigneeIds[0] ?? null, assigneeIds };
}

/**
 * Assign a user to a specific subtask.
 * Pass null to unassign.
 */
export function assignSubtask(projectId: string, subtaskId: string, userIds: string[] | string | null): Project | null {
  const current = getAllProjects().find((project) => project.id === projectId);
  if (!current) return null;

  const assigneeIds = normalizeAssigneeIds(Array.isArray(userIds) ? userIds : userIds ? [userIds] : []);
  const updatedSubtasks = current.subtasks.map((subtask) =>
    subtask.id === subtaskId ? { ...subtask, assigneeId: assigneeIds[0] ?? null, assigneeIds } : subtask
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
  const project = getProjectById(id);
  if (project) {
    archiveProjectDeletion(project);
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
}

export function restoreDeletedProject(boardId: string, deletedProjectId: string): Project | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM deleted_projects WHERE id = ? AND board_id = ?').get(deletedProjectId, boardId) as DeletedProjectRow | undefined;
  if (!row) return null;

  const archived = mapDeletedProjectRow(row);
  const restored = createProject({
    ...archived.project,
    boardId,
    subtasks: archived.project.subtasks,
  });

  db.prepare('DELETE FROM deleted_projects WHERE id = ?').run(deletedProjectId);
  return restored;
}

export function permanentlyDeleteArchivedProject(boardId: string, deletedProjectId: string) {
  const db = getDb();
  const result = db.prepare('DELETE FROM deleted_projects WHERE id = ? AND board_id = ?').run(deletedProjectId, boardId);
  return result.changes > 0;
}

export function deleteSubtask(projectId: string, subtaskId: string): Project | null {
  const project = getAllProjects().find((item) => item.id === projectId);
  if (!project) return null;

  const updatedSubtasks = project.subtasks.filter((subtask) => subtask.id !== subtaskId);
  return updateProject(projectId, { subtasks: updatedSubtasks });
}
