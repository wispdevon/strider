'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import ProjectCard from './ProjectCard';
import { Project, useProjects } from '@/lib/useProjects';
import { useState, useEffect } from 'react';

const STAGES = [
  { key: 'planning', label: 'Plan' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' }
];

interface BoardViewProps {
  boardSlug: string;
}

interface BoardInfo {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  hasPassword: boolean;
  projects: Project[];
}

export default function BoardView({ boardSlug }: BoardViewProps) {
  const { isLoaded, addProject, updateProject, deleteProject, getProjectProgress } = useProjects();
  const [board, setBoard] = useState<BoardInfo | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    note: '',
    stage: 'planning' as const,
    subtasks: '',
    category: ''
  });

  useEffect(() => {
    loadBoard();
  }, [boardSlug]);

  const loadBoard = async () => {
    try {
      const response = await fetch(`/api/boards/${boardSlug}`);
      if (response.ok) {
        const data = await response.json();
        setBoard(data);
      }
    } catch (error) {
      console.error('Failed to load board:', error);
    } finally {
      setBoardLoading(false);
    }
  };

  if (!isLoaded || boardLoading) {
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

  if (!board) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-5xl mb-4">❌</p>
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Board not found</h2>
          <Link href="/" className="text-[var(--accent)] hover:underline">
            ← Back to boards
          </Link>
        </div>
      </div>
    );
  }

  const projects = board.projects || [];
  const activeProjects = projects.filter((p) => p.stage !== 'done');
  const doneCount = projects.filter((p) => p.stage === 'done').length;

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
    
    const subtasks = formData.subtasks
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    
    addProject(formData.title, formData.note, formData.stage, subtasks, formData.category || 'General', board.id);
    
    setFormData({
      title: '',
      note: '',
      stage: 'planning',
      subtasks: '',
      category: ''
    });
    setShowForm(false);
    loadBoard();
  };

  const handleDeleteBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError('');

    try {
      const response = await fetch(`/api/boards/${board.slug}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: deletePin })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = '/';
      } else {
        setDeleteError(data.error || 'Failed to delete board');
      }
    } catch (error) {
      setDeleteError('Failed to delete board');
    }
  };

  const summary = {
    total: activeProjects.length,
    inMotion: activeProjects.filter((p) => p.stage === 'active' || p.stage === 'review').length,
    needsAttention: activeProjects.filter((p) => getProjectProgress(p) < 50).length
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
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-[var(--accent)] hover:text-[var(--accent)]/80 text-sm font-medium transition-colors"
            >
              ← Boards
            </Link>
            <div>
              <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">
                Code: {board.joinCode}
              </p>
              <h1 className="hero-title text-[var(--foreground)] text-2xl md:text-3xl mt-1">{board.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {doneCount > 0 && (
              <Link
                href={`/board/${board.slug}/hall-of-fame`}
                className="px-4 py-2 rounded-lg font-medium bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] shadow-[0_6px_14px_rgba(17,17,17,0.04)] transition-all duration-300"
              >
                🏆 Hall of Fame ({doneCount})
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-lg font-medium bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all duration-300"
            >
              Delete Board
            </motion.button>

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
        </div>
      </motion.header>

      {/* Delete Board Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <span className="text-5xl">⚠️</span>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mt-4">Delete Board?</h2>
                <p className="text-[var(--muted)] mt-2">
                  This will permanently delete "{board.name}" and all its projects.
                </p>
              </div>

              <form onSubmit={handleDeleteBoard}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Enter Author PIN to confirm
                  </label>
                  <input
                    type="text"
                    placeholder="6-digit PIN"
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full px-4 py-3 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-red-500/40 font-mono text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                  {deleteError && (
                    <p className="text-red-500 text-sm mt-2">{deleteError}</p>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-3 rounded-lg bg-[var(--panel-strong)] text-[var(--foreground)] font-medium hover:bg-[var(--panel)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
                  >
                    Delete Board
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STAGES.map((stage, stageIndex) => {
            const stageProjects = activeProjects.filter((p) => p.stage === stage.key);

            return (
              <motion.div
                key={stage.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + stageIndex * 0.05 }}
              >
                <div className="sticky top-32">
                  <h2 className="section-heading text-[var(--foreground)] text-lg mb-3 flex justify-between items-center">
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