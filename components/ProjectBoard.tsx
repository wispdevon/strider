'use client';

import { motion, AnimatePresence } from 'framer-motion';
import ProjectCard from './ProjectCard';
import { Project, useProjects } from '@/lib/useProjects';
import { useState } from 'react';

const STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'planning', label: 'Planning' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' }
];

export default function ProjectBoard() {
  const { projects, isLoaded, updateProject, deleteProject, getProjectProgress } = useProjects();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    note: '',
    stage: 'idea' as const,
    subtasks: '',
    category: ''
  });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-[var(--muted)]"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  const handleMoveProject = (projectId: string, direction: 'forward' | 'back') => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const currentIndex = STAGES.findIndex((s) => s.key === project.stage);
    let newIndex = currentIndex;

    if (direction === 'forward') {
      newIndex = Math.min(STAGES.length - 1, currentIndex + 1);
    } else {
      newIndex = Math.max(0, currentIndex - 1);
    }

    updateProject(projectId, { stage: STAGES[newIndex].key as any });
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    // Re-export addProject from useProjects and use it
    const { addProject } = useProjects();
    const subtasks = formData.subtasks
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    addProject(formData.title, formData.note, formData.stage, subtasks, formData.category || 'General');
    
    setFormData({
      title: '',
      note: '',
      stage: 'idea',
      subtasks: '',
      category: ''
    });
    setShowForm(false);
  };

  const summary = {
    total: projects.length,
    inMotion: projects.filter((p) => p.stage !== 'done' && p.stage !== 'idea').length,
    needsAttention: projects.filter((p) => getProjectProgress(p) < 50 && p.stage !== 'done').length
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.9)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-full mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="text-[var(--accent)] text-xs uppercase tracking-widest font-bold">Project Workspaces</p>
            <h1 className="text-[var(--foreground)] text-3xl font-bold mt-1">Strider Flow</h1>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(!showForm)}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              showForm
                ? 'bg-[var(--accent)] text-white border border-[var(--accent)] shadow-[0_8px_20px_rgba(29,31,35,0.16)]'
                : 'bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] shadow-[0_6px_14px_rgba(17,17,17,0.04)]'
            }`}
          >
            + New project
          </motion.button>
        </div>
      </motion.header>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.96)] backdrop-blur-sm"
          >
            <form
              onSubmit={handleAddProject}
              className="max-w-full mx-auto px-6 py-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              <input
                type="text"
                placeholder="Project title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
              />
              <input
                type="text"
                placeholder="Category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
              />
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
                className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent-glow)]"
              >
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Subtasks (comma separated)"
                value={formData.subtasks}
                onChange={(e) => setFormData({ ...formData, subtasks: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/50 focus:ring-2 focus:ring-[var(--accent-glow)] lg:col-span-2"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/95 transition-all duration-300 col-span-full sm:col-span-1 shadow-[0_8px_20px_rgba(29,31,35,0.16)]"
              >
                Create
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-full mx-auto px-6 py-6 grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Total projects', value: summary.total },
          { label: 'In motion', value: summary.inMotion },
          { label: 'Needs attention', value: summary.needsAttention }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
            className="rounded-xl bg-[var(--panel)] border border-[var(--border)] p-4 shadow-[0_10px_30px_rgba(17,17,17,0.05)]"
          >
            <p className="text-[var(--muted)] text-xs uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-[var(--foreground)] mt-2">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Board */}
      <div className="max-w-full mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {STAGES.map((stage, stageIndex) => {
            const stageProjects = projects.filter((p) => p.stage === stage.key);

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + stageIndex * 0.05 }}
              >
                <div className="sticky top-32">
                  <h2 className="text-[var(--foreground)] font-bold mb-3 flex justify-between items-center">
                    <span>{stage.label}</span>
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="text-xs px-2 py-1 rounded-full bg-[var(--panel-strong)] text-[var(--muted)]"
                    >
                      {stageProjects.length}
                    </motion.span>
                  </h2>

                  <motion.div
                    layout
                    className="space-y-3 min-h-[200px] rounded-2xl bg-[rgba(248,246,242,0.75)] border border-[var(--border)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                  >
                    <AnimatePresence mode="popLayout">
                      {stageProjects.length > 0 ? (
                        stageProjects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            progress={getProjectProgress(project)}
                            onMove={(direction) => handleMoveProject(project.id, direction)}
                            onDelete={() => deleteProject(project.id)}
                          />
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[var(--muted)] text-xs text-center py-8"
                        >
                          No projects here yet
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
