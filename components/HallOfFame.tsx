'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useProjects } from '@/lib/useProjects';

export default function HallOfFame() {
  const { projects, isLoaded, getProjectProgress } = useProjects();

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

  const doneProjects = projects.filter((p) => p.stage === 'done');

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[var(--header-surface)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="text-[var(--accent)] hover:text-[var(--accent)]/80 text-sm font-medium transition-colors mb-3 inline-flex items-center gap-1"
          >
            ← Back to board
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">Completed Projects</p>
              <h1 className="hero-title text-[var(--foreground)] text-3xl md:text-4xl mt-1">Hall of Fame</h1>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        {doneProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <p className="text-6xl mb-4">🎯</p>
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">No completed projects yet</h2>
            <p className="text-[var(--muted)]">Keep pushing forward — your first victory awaits!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {doneProjects.map((project, index) => {
                const progress = getProjectProgress(project);
                const completedSubtasks = project.subtasks.filter((s) => s.done).length;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/project/${project.slug}`}>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -4 }}
                        className="rounded-2xl bg-gradient-to-br from-[var(--panel)] to-[var(--panel-strong)] border border-[var(--border)] p-6 shadow-[0_18px_50px_rgba(17,17,17,0.06)] hover:shadow-[0_24px_60px_rgba(17,17,17,0.1)] transition-shadow"
                      >
                        {/* Trophy badge */}
                        <div className="flex justify-between items-start mb-4">
                          <span className="text-3xl">🏆</span>
                          <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            100% Complete
                          </span>
                        </div>

                        {/* Project info */}
                        <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold mb-1">
                          {project.category}
                        </p>
                        <h3 className="hero-title text-[var(--foreground)] text-xl mb-2">{project.title}</h3>
                        <p className="text-[var(--muted)] text-sm mb-4 line-clamp-2">{project.note}</p>

                        {/* Progress bar */}
                        <div className="h-2 bg-[var(--panel)] rounded-full overflow-hidden mb-2">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1, delay: index * 0.1 }}
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
                          />
                        </div>
                        <p className="text-[var(--muted)] text-xs">
                          {completedSubtasks} subtasks completed
                        </p>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}