'use client';

import { useCallback, useState, useEffect } from 'react';

type UseProjectsOptions = {
  syncIntervalMs?: number;
  pauseWhenHidden?: boolean;
};

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
  assigneeId?: string | null;
  assigneeIds?: string[];
  documentId?: string | null;
  documentTitle?: string | null;
  documentKind?: 'text' | 'csv' | null;
}

export interface Project {
  id: string;
  slug: string;
  title: string;
  note: string;
  stage: 'idea' | 'planning' | 'active' | 'review' | 'done';
  category: string;
  subtasks: Subtask[];
  boardId?: string;
  assigneeId?: string | null;
  assigneeIds?: string[];
  completedAt?: string | null;
  sortOrder?: number;
}

export interface BoardMemberInfo {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  role: string;
}

export function useProjects(boardId?: string, options: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { syncIntervalMs = 0, pauseWhenHidden = true } = options;
  const normalizedSyncMs = syncIntervalMs > 0 ? syncIntervalMs : 0;

  const loadProjects = useCallback(async (cancelledRef?: { current: boolean }) => {
    if (!boardId) {
      setProjects([]);
      setIsLoaded(true);
      return;
    }

    try {
      const url = `/api/projects?boardId=${encodeURIComponent(boardId)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load projects');
      const data = (await response.json()) as Project[];
      if (!cancelledRef?.current) {
        setProjects(data);
      }
    } catch {
      if (!cancelledRef?.current) {
        setProjects([]);
      }
    } finally {
      if (!cancelledRef?.current) {
        setIsLoaded(true);
      }
    }
  }, [boardId]);

  useEffect(() => {
    const cancelledRef = { current: false };
    const initialLoadId = window.setTimeout(() => {
      void loadProjects(cancelledRef);
    }, 0);

    if (!boardId || normalizedSyncMs <= 0) {
      return () => {
        cancelledRef.current = true;
        window.clearTimeout(initialLoadId);
      };
    }

    let poller: number | null = null;
    const poll = () => {
      void loadProjects(cancelledRef);
    };

    if (pauseWhenHidden && typeof document !== 'undefined') {
      const onVisibility = () => {
        if (!document.hidden) {
          void loadProjects(cancelledRef);
        }
      };
      window.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('focus', onVisibility);
      poller = window.setInterval(poll, normalizedSyncMs);

      return () => {
        cancelledRef.current = true;
        window.clearTimeout(initialLoadId);
        if (poller) {
          window.clearInterval(poller);
        }
        window.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('focus', onVisibility);
      };
    }

    poller = window.setInterval(poll, normalizedSyncMs);

    return () => {
      cancelledRef.current = true;
      window.clearTimeout(initialLoadId);
      if (poller) {
        window.clearInterval(poller);
      }
    };
  }, [boardId, loadProjects, normalizedSyncMs, pauseWhenHidden]);

  const addProject = async (title: string, note: string, stage: Project['stage'], subtasks: string[], category: string, boardId?: string) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, note, stage, subtasks, category, boardId })
    });

    if (!response.ok) throw new Error('Failed to create project');

    const newProject = (await response.json()) as Project;
    setProjects((current) => [newProject, ...current]);
    return newProject;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });

    if (!response.ok) return;

    const updated = (await response.json()) as Project;
    setProjects((current) => current.map((project) => (project.id === id ? updated : project)));
  };

  const toggleSubtask = async (projectId: string, subtaskId: string, mode: 'toggle' | 'delete' = 'toggle') => {
    const response = await fetch(`/api/projects/${projectId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });

    if (!response.ok) return;

    const updated = (await response.json()) as Project;
    setProjects((current) => current.map((project) => (project.id === projectId ? updated : project)));
  };

  const assignSubtask = async (projectId: string, subtaskId: string, assigneeIds: string[]) => {
    const response = await fetch(`/api/projects/${projectId}/subtasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'assign', assigneeIds })
    });

    if (!response.ok) return;

    const updated = (await response.json()) as Project;
    setProjects((current) => current.map((project) => (project.id === projectId ? updated : project)));
  };

  const deleteProject = async (id: string) => {
    const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!response.ok) return false;
    setProjects((current) => current.filter((project) => project.id !== id));
    return true;
  };

  const addSubtask = async (projectId: string, title: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const newSubtask: Subtask = {
      id: `sub-${Date.now()}`,
      title,
      done: false
    };

    const updatedSubtasks = [...project.subtasks, newSubtask];
    await updateProject(projectId, { subtasks: updatedSubtasks });
  };

  const getProjectBySlug = (slug: string) => {
    return projects.find((p) => p.slug === slug);
  };

  const getProjectProgress = (project: Project): number => {
    if (!project.subtasks.length) return 0;
    return Math.round((project.subtasks.filter((s) => s.done).length / project.subtasks.length) * 100);
  };

  return {
    projects,
    isLoaded,
    addProject,
    updateProject,
    toggleSubtask,
    assignSubtask,
    deleteProject,
    addSubtask,
    refreshProjects: () => loadProjects(),
    getProjectBySlug,
    getProjectProgress
  };
}
