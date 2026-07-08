'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Project, useProjects } from '@/lib/useProjects';
import { useEffect, useState } from 'react';

const STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'planning', label: 'Planning' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' }
];

interface ProjectDetailProps {
  slug: string;
}

export default function ProjectDetail({ slug }: ProjectDetailProps) {
  const { projects, isLoaded, getProjectBySlug, toggleSubtask, updateProject, deleteProject, getProjectProgress } = useProjects();
  const [project, setProject] = useState<Project | null>(null);

  useEffect(() => {
    if (isLoaded) {
      setProject(getProjectBySlug(slug) || null);
    }
  }, [isLoaded, slug, projects]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
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

  const progress = getProjectProgress(project);
  const completedSubtasks = project.subtasks.filter((s) => s.done).length;
  const currentStageIndex = STAGES.findIndex((s) => s.key === project.stage);

  const handleMoveStage = (direction: 'forward' | 'back') => {
    let newIndex = currentStageIndex;
    if (direction === 'forward') {
      newIndex = Math.min(STAGES.length - 1, currentStageIndex + 1);
    } else {
      newIndex = Math.max(0, currentStageIndex - 1);
    }
    updateProject(project.id, { stage: STAGES[newIndex].key as any });
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.9)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="text-[var(--accent)] hover:text-[var(--accent)]/80 text-sm font-medium transition-colors mb-3 inline-flex items-center gap-1"
          >
            ← Back to board
          </Link>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-8 shadow-[0_18px_50px_rgba(17,17,17,0.06)]"
        >
          {/* Title Section */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">{project.category}</p>
              <h1 className="hero-title text-[var(--foreground)] text-4xl md:text-5xl mt-2">{project.title}</h1>
              <p className="text-[var(--muted)] mt-3 text-lg">{project.note}</p>
            </div>
          </div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-6 rounded-2xl bg-[var(--panel-strong)] border border-[var(--border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[var(--foreground)] font-semibold">Overall Progress</span>
              <span className="text-2xl font-bold text-[var(--accent)]">{progress}%</span>
            </div>
            <div className="h-3 bg-[var(--panel)] rounded-full overflow-hidden mb-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[var(--accent)] via-[#2b2f35] to-[var(--accent-sheen)]"
              />
            </div>
            <p className="text-[var(--muted)] text-sm">
              {completedSubtasks} of {project.subtasks.length} subtasks completed
            </p>
          </motion.div>

          {/* Stage Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 flex gap-3 items-center"
          >
            <div className="flex-1 flex items-center gap-2">
              {STAGES.map((stage, index) => (
                <motion.div
                  key={stage.key}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    index <= currentStageIndex
                      ? 'bg-gradient-to-r from-[var(--accent)] via-[#2b2f35] to-[var(--accent-sheen)]'
                      : 'bg-[var(--panel-strong)]'
                  }`}
                />
              ))}
            </div>
            <div className="text-[var(--foreground)] font-semibold text-sm">{STAGES[currentStageIndex].label}</div>
          </motion.div>

          {/* Subtasks Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="section-heading text-[var(--foreground)] text-xl mb-4">Subtasks</h2>
            <motion.div
              layout
              className="space-y-2"
            >
              <AnimatePresence mode="popLayout">
                {project.subtasks.map((subtask, index) => (
                  <motion.button
                    key={subtask.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => toggleSubtask(project.id, subtask.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
                      subtask.done
                        ? 'bg-[#ecebe7] border-[#b3b2ae] text-[#3f3f3f]'
                        : 'bg-[var(--panel)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]'
                    }`}
                  >
                    <motion.div
                      animate={{ scale: subtask.done ? 1 : 0.9 }}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center font-bold ${
                        subtask.done
                          ? 'bg-[#7a7c82] border-[#7a7c82] text-white'
                          : 'border-[var(--muted)]'
                      }`}
                    >
                      {subtask.done && '✓'}
                    </motion.div>
                    <span className="flex-1 text-left font-medium">{subtask.title}</span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 flex-wrap"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoveStage('back')}
              className="px-4 py-2 rounded-lg bg-[var(--panel)] hover:bg-[var(--panel-strong)] text-[var(--foreground)] font-medium transition-colors shadow-[0_6px_14px_rgba(17,17,17,0.04)]"
            >
              ← Move back stage
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoveStage('forward')}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/95 text-white font-medium transition-colors shadow-[0_8px_20px_rgba(29,31,35,0.16)]"
            >
              Advance stage →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                deleteProject(project.id);
                window.location.href = '/';
              }}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition-colors ml-auto"
            >
              Delete workspace
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
