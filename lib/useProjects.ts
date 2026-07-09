'use client';

import { useState, useEffect } from 'react';

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

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to load projects');
        const data = (await response.json()) as Project[];
        if (!cancelled) {
          setProjects(data);
        }
      } catch {
        if (!cancelled) {
          setProjects([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const addProject = async (title: string, note: string, stage: Project['stage'], subtasks: string[], category: string) => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, note, stage, subtasks, category })
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

  const deleteProject = async (id: string) => {
    const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!response.ok) return;
    setProjects((current) => current.filter((project) => project.id !== id));
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
    deleteProject,
    addSubtask,
    getProjectBySlug,
    getProjectProgress
  };
}
