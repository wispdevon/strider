'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Project, useProjects } from '@/lib/useProjects';

interface HallOfFameProps {
  boardSlug?: string;
}

interface BoardHistory {
  name: string;
  slug: string;
  projects: Project[];
  members?: Array<{
    id: string;
    userId: string;
    name: string;
    avatar: string | null;
    role: string;
  }>;
}

function formatCompletedDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

export default function HallOfFame({ boardSlug }: HallOfFameProps) {
  const { projects, isLoaded } = useProjects();
  const [board, setBoard] = useState<BoardHistory | null>(null);
  const [boardLoaded, setBoardLoaded] = useState(!boardSlug);

  const loadBoard = useCallback(async () => {
    if (!boardSlug) return;
    try {
      const response = await fetch(`/api/boards/${boardSlug}`);
      if (response.ok) {
        const data = await response.json() as BoardHistory;
        setBoard(data);
      }
    } finally {
      setBoardLoaded(true);
    }
  }, [boardSlug]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  if ((boardSlug && !boardLoaded) || (!boardSlug && !isLoaded)) {
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

  const sourceProjects = boardSlug ? board?.projects ?? [] : projects;
  const doneProjects = sourceProjects
    .filter((p) => p.stage === 'done')
    .sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || ''));
  const memberLookup = new Map((board?.members ?? []).map((member) => [member.userId, member]));
  const userPodium = Array.from(
    doneProjects.reduce((stats, project) => {
      if (project.assigneeId) {
        const current = stats.get(project.assigneeId) ?? {
          userId: project.assigneeId,
          name: memberLookup.get(project.assigneeId)?.name ?? 'Unknown',
          completedTasks: 0,
          completedSubtasks: 0,
        };
        current.completedTasks += 1;
        stats.set(project.assigneeId, current);
      }

      for (const subtask of project.subtasks) {
        if (!subtask.done || !subtask.assigneeId) continue;
        const current = stats.get(subtask.assigneeId) ?? {
          userId: subtask.assigneeId,
          name: memberLookup.get(subtask.assigneeId)?.name ?? 'Unknown',
          completedTasks: 0,
          completedSubtasks: 0,
        };
        current.completedSubtasks += 1;
        stats.set(subtask.assigneeId, current);
      }

      return stats;
    }, new Map<string, { userId: string; name: string; completedTasks: number; completedSubtasks: number }>())
      .values()
  )
    .filter((user) => user.completedTasks > 0 || user.completedSubtasks > 0)
    .sort((a, b) => b.completedTasks - a.completedTasks || b.completedSubtasks - a.completedSubtasks || a.name.localeCompare(b.name))
    .slice(0, 3);
  const backHref = boardSlug ? `/board/${boardSlug}` : '/';

  return (
    <div className="min-h-screen bg-black text-white">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 border-b border-white/12 bg-black/90 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-5xl px-6 py-4 text-center">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            ← Back to board
          </Link>
        </div>
      </motion.header>

      <main className="mx-auto max-w-5xl px-6 py-14">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/55">
            Completed Work
          </p>
          <h1 className="mt-5 text-5xl font-black uppercase leading-[0.92] tracking-normal text-white md:text-7xl">
            The Road Behind Us
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-white/62">
            {board?.name ? `${board.name} records every finished task as a milestone.` : 'Every finished task becomes a milestone.'}
          </p>
        </motion.div>

        {doneProjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-24 text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-white/40">No milestones yet</p>
            <h2 className="mt-4 text-3xl font-black uppercase text-white">Nothing has crossed the line</h2>
          </motion.div>
        ) : (
          <>
            {userPodium.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mt-16 max-w-4xl text-center"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/45">
                  Assigned Completion Leaders
                </p>
                <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3 md:items-end">
                  {userPodium.map((user, index) => (
                    <div
                      key={user.userId}
                      className={`border border-white/18 bg-black px-5 py-6 text-center ${
                        index === 0 ? 'md:min-h-64' : index === 1 ? 'md:min-h-52' : 'md:min-h-44'
                      }`}
                    >
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white text-lg font-black uppercase">
                        {user.name.charAt(0)}
                      </div>
                      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
                        #{index + 1}
                      </p>
                      <h2 className="mt-2 text-2xl font-black uppercase leading-none text-white">
                        {user.name}
                      </h2>
                      <div className="mt-6 grid grid-cols-2 border-t border-white/14 pt-4 text-xs uppercase tracking-[0.16em] text-white/52">
                        <div>
                          <p className="text-xl font-black text-white">{user.completedTasks}</p>
                          <p className="mt-1">Tasks</p>
                        </div>
                        <div>
                          <p className="text-xl font-black text-white">{user.completedSubtasks}</p>
                          <p className="mt-1">Subtasks</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.section>
            )}

            <div className="relative mx-auto mt-20 max-w-3xl">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/20" />
              <AnimatePresence mode="popLayout">
              {doneProjects.map((project, index) => {
                const completedSubtasks = project.subtasks.filter((s) => s.done).length;
                const totalSubtasks = project.subtasks.length;
                const side = index % 2 === 0 ? 'md:pr-[55%]' : 'md:pl-[55%]';

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 32 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ delay: index * 0.06 }}
                    className={`relative mb-12 text-center ${side}`}
                  >
                    <div className="absolute left-1/2 top-8 z-10 h-4 w-4 -translate-x-1/2 rounded-full border border-white bg-black shadow-[0_0_0_8px_rgba(255,255,255,0.06)]" />
                    <Link href={`/project/${project.slug}?boardId=${encodeURIComponent(project.boardId || '')}`}>
                      <motion.div
                        whileHover={{ y: -3 }}
                        className="relative mx-auto max-w-sm border-y border-white/22 bg-black px-2 py-5 text-center transition-colors hover:border-white/70"
                      >
                        <div className="mb-3 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                          <span className="h-px w-8 bg-white/25" />
                          <span>{project.category}</span>
                        </div>
                        <h2 className="text-xl font-black uppercase leading-none text-white">
                          {project.title}
                        </h2>
                        {project.note && (
                          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/56">
                            {project.note}
                          </p>
                        )}
                        <div className="mt-4 flex items-center justify-center gap-4 text-xs uppercase tracking-[0.14em] text-white/48">
                          <div>
                            <p className="text-white">{formatCompletedDate(project.completedAt) || 'Completed'}</p>
                          </div>
                          <span className="h-1 w-1 rounded-full bg-white/35" />
                          <div>
                            <p className="text-white">{completedSubtasks}/{totalSubtasks} subtasks</p>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
