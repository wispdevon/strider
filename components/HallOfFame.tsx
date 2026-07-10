'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Project, useProjects } from '@/lib/useProjects';
import { CLAUDE_ASSIGNEE_ID, CODEX_ASSIGNEE_ID, VIRTUAL_ASSIGNEES, withVirtualAssignees } from '@/lib/virtual-assignees';

interface HallOfFameProps {
  boardSlug?: string;
}

interface BoardHistory {
  name: string;
  slug: string;
  ownerId?: string | null;
  projects: Project[];
  members?: Array<{
    id: string;
    userId: string;
    name: string;
    avatar: string | null;
    role: string;
  }>;
}

interface CompletionLeader {
  userId: string;
  name: string;
  avatar: string | null;
  completedTasks: number;
  completedSubtasks: number;
}

interface TimelineAssignee {
  userId: string;
  name: string;
  avatar: string | null;
}

const FALLBACK_LEADERS: Record<number, CompletionLeader> = {
  2: {
    userId: CODEX_ASSIGNEE_ID,
    name: 'Codex',
    avatar: VIRTUAL_ASSIGNEES.find((member) => member.userId === CODEX_ASSIGNEE_ID)?.avatar ?? null,
    completedTasks: 0,
    completedSubtasks: 0,
  },
  3: {
    userId: CLAUDE_ASSIGNEE_ID,
    name: 'Claude',
    avatar: VIRTUAL_ASSIGNEES.find((member) => member.userId === CLAUDE_ASSIGNEE_ID)?.avatar ?? null,
    completedTasks: 0,
    completedSubtasks: 0,
  },
};

function formatCompletedDate(value?: string | null) {
  if (!value) return '';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getAssigneeIds(assigneeIds?: string[], assigneeId?: string | null) {
  const ids = Array.isArray(assigneeIds) ? assigneeIds : [];
  return Array.from(new Set([...(assigneeId ? [assigneeId] : []), ...ids].filter(Boolean)));
}

function codexAvatarClass(userId: string) {
  return userId === CODEX_ASSIGNEE_ID ? ' codex-agent-avatar' : '';
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
  const assignableMembers = withVirtualAssignees(board?.members ?? []);
  const memberLookup = new Map(assignableMembers.map((member) => [member.userId, member]));
  const userStats = Array.from(
    doneProjects.reduce((stats, project) => {
      for (const assigneeId of getAssigneeIds(project.assigneeIds, project.assigneeId)) {
        const member = memberLookup.get(assigneeId);
        const current = stats.get(assigneeId) ?? {
          userId: assigneeId,
          name: member?.name ?? 'Unknown',
          avatar: member?.avatar ?? null,
          completedTasks: 0,
          completedSubtasks: 0,
        };
        current.completedTasks += 1;
        stats.set(assigneeId, current);
      }

      for (const subtask of project.subtasks) {
        if (!subtask.done) continue;
        const subtaskAssignees = getAssigneeIds(subtask.assigneeIds, subtask.assigneeId);
        const fallbackAssignees = getAssigneeIds(project.assigneeIds, project.assigneeId);
        for (const assigneeId of subtaskAssignees.length > 0 ? subtaskAssignees : fallbackAssignees) {
          const member = memberLookup.get(assigneeId);
          const current = stats.get(assigneeId) ?? {
            userId: assigneeId,
            name: member?.name ?? 'Unknown',
            avatar: member?.avatar ?? null,
            completedTasks: 0,
            completedSubtasks: 0,
          };
          current.completedSubtasks += 1;
          stats.set(assigneeId, current);
        }
      }

      return stats;
    }, new Map<string, CompletionLeader>())
      .values()
  )
    .filter((user) => user.completedTasks > 0 || user.completedSubtasks > 0)
    .sort((a, b) => b.completedSubtasks - a.completedSubtasks || b.completedTasks - a.completedTasks || a.name.localeCompare(b.name));
  const userPodium = userStats.slice(0, 3);
  const ownerMember = board?.members?.find((member) => member.userId === board.ownerId || member.role === 'owner');
  const fallbackOwner: CompletionLeader = {
    userId: ownerMember?.userId ?? 'fallback-board-owner',
    name: ownerMember?.name ?? 'Board Owner',
    avatar: ownerMember?.avatar ?? null,
    completedTasks: 0,
    completedSubtasks: 0,
  };
  const getFallbackLeader = (rank: number) => {
    if (rank === 1) return fallbackOwner;
    return FALLBACK_LEADERS[rank] ?? null;
  };
  const podiumSlots: Array<{
    rank: number;
    leader: CompletionLeader;
    isFallback: boolean;
    columnClass: string;
    orderClass: string;
    columnMaxClass: string;
    shaftClass: string;
    bottomRingClass: string;
    bottomFlareClass: string;
    bottomSlabClass: string;
    topSlabClass: string;
    topFlareClass: string;
    topNeckClass: string;
    columnSkin: string;
    crownSkin: string;
    medalSkin: string;
    glowSkin: string;
    plaqueSkin: string;
    numeral: string;
  }> = [
    {
      rank: 2,
      columnClass: 'md:h-52',
      orderClass: 'md:order-1',
      columnMaxClass: 'max-w-60',
      shaftClass: 'w-34',
      bottomRingClass: 'w-40',
      bottomFlareClass: 'w-44',
      bottomSlabClass: 'w-52',
      topSlabClass: 'w-56',
      topFlareClass: 'w-52',
      topNeckClass: 'w-36',
      columnSkin: 'from-stone-50 via-stone-200 to-stone-500',
      crownSkin: 'from-white via-[#efe6cf] to-stone-300',
      medalSkin: 'from-stone-50 via-stone-200 to-stone-400',
      glowSkin: 'shadow-stone-200/35',
      plaqueSkin: 'from-white via-slate-300 to-zinc-600',
      numeral: 'II',
    },
    {
      rank: 1,
      columnClass: 'md:h-72',
      orderClass: 'md:order-2',
      columnMaxClass: 'max-w-60',
      shaftClass: 'w-34',
      bottomRingClass: 'w-40',
      bottomFlareClass: 'w-44',
      bottomSlabClass: 'w-52',
      topSlabClass: 'w-48',
      topFlareClass: 'w-44',
      topNeckClass: 'w-34',
      columnSkin: 'from-stone-50 via-stone-200 to-stone-500',
      crownSkin: 'from-white via-[#efe6cf] to-stone-300',
      medalSkin: 'from-stone-50 via-stone-200 to-stone-400',
      glowSkin: 'shadow-stone-200/35',
      plaqueSkin: 'from-yellow-100 via-amber-300 to-yellow-700',
      numeral: 'I',
    },
    {
      rank: 3,
      columnClass: 'md:h-48',
      orderClass: 'md:order-3',
      columnMaxClass: 'max-w-60',
      shaftClass: 'w-34',
      bottomRingClass: 'w-40',
      bottomFlareClass: 'w-44',
      bottomSlabClass: 'w-52',
      topSlabClass: 'w-56',
      topFlareClass: 'w-52',
      topNeckClass: 'w-36',
      columnSkin: 'from-stone-100 via-[#cbbd99] to-stone-600',
      crownSkin: 'from-white via-[#efe6cf] to-stone-300',
      medalSkin: 'from-stone-50 via-[#d4c6a5] to-stone-500',
      glowSkin: 'shadow-stone-300/35',
      plaqueSkin: 'from-orange-100 via-amber-600 to-stone-800',
      numeral: 'III',
    },
  ].map((slot) => {
    const leader = userPodium[slot.rank - 1] ?? getFallbackLeader(slot.rank);

    return {
      ...slot,
      leader: leader ?? fallbackOwner,
      isFallback: !userPodium[slot.rank - 1],
    };
  });
  const honorableMentions = userStats.slice(3);
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
            <motion.section
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-16 max-w-4xl text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/45">
                Subtask Completion Leaders
              </p>
              <h2 className="mt-4 text-3xl font-black uppercase leading-none text-white md:text-5xl">
                The Podium
              </h2>
              <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3 md:items-end md:gap-0">
                {podiumSlots.map(({ rank, leader, columnClass, orderClass, columnMaxClass, shaftClass, bottomRingClass, bottomFlareClass, bottomSlabClass, topSlabClass, topFlareClass, topNeckClass, columnSkin, crownSkin, medalSkin, glowSkin, plaqueSkin }) => {
                  const contributionCount = leader.completedTasks + leader.completedSubtasks;

                  return (
                    <div
                      key={rank}
                      tabIndex={0}
                      className={`group relative text-center outline-none ${orderClass}`}
                    >
                      <div className={`relative z-20 mx-auto -mb-1 flex h-24 w-24 items-center justify-center rounded-full border-4 border-stone-100 bg-gradient-to-br ${medalSkin} shadow-2xl ${glowSkin}`}>
                        <div className="absolute -inset-2 rounded-full border border-stone-100/45" />
                        <div className="absolute -left-8 top-9 h-10 w-12 rotate-[-30deg] rounded-full border-l-4 border-t-2 border-stone-100/75" />
                        <div className="absolute -right-8 top-9 h-10 w-12 rotate-[30deg] rounded-full border-r-4 border-t-2 border-stone-100/75" />
                        {leader.avatar ? (
                          <div
                            className={`h-20 w-20 rounded-full bg-white bg-[length:68%_68%] bg-center bg-no-repeat shadow-[inset_0_0_18px_rgba(255,255,255,0.7)]${codexAvatarClass(leader.userId)}`}
                            style={{ backgroundImage: `url(${leader.avatar})` }}
                          />
                        ) : (
                          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-black/70 text-3xl font-black uppercase text-white shadow-[inset_0_0_18px_rgba(255,255,255,0.22)]">
                            {leader.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className={`relative mx-auto flex w-full ${columnMaxClass} flex-col items-center drop-shadow-[0_30px_28px_rgba(0,0,0,0.42)] ${columnClass}`}>
                        <div className={`relative z-10 h-4 ${topSlabClass} rounded-t-xl border-x-4 border-t-4 border-stone-100/75 bg-gradient-to-r ${crownSkin} shadow-[inset_0_7px_12px_rgba(255,255,255,0.58),inset_0_-5px_8px_rgba(85,67,43,0.18),0_10px_20px_rgba(0,0,0,0.28)]`} />
                        <div className={`relative z-10 h-7 ${topFlareClass} rounded-t-lg border-x-4 border-stone-100/70 bg-gradient-to-r ${crownSkin} [clip-path:polygon(0_0,100%_0,88%_100%,12%_100%)] shadow-[inset_0_8px_14px_rgba(255,255,255,0.46),inset_0_-7px_12px_rgba(85,67,43,0.2)]`} />
                        <div className={`relative z-10 h-5 ${topNeckClass} border-x-4 border-b-4 border-stone-100/70 bg-gradient-to-r ${crownSkin} shadow-[inset_0_-8px_12px_rgba(92,74,48,0.2),0_8px_12px_rgba(0,0,0,0.12)]`} />

                        <div
                          className={`relative -mt-1 flex min-h-40 ${shaftClass} flex-1 flex-col justify-start overflow-hidden border-x-4 border-stone-100/70 bg-gradient-to-br ${columnSkin} px-3 pb-4 pt-7 shadow-2xl ${glowSkin}`}
                        >
                          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.7),transparent_25%),radial-gradient(circle_at_18%_34%,rgba(80,64,42,0.18)_0_1px,transparent_2px),radial-gradient(circle_at_74%_62%,rgba(255,255,255,0.28)_0_1px,transparent_2px),repeating-linear-gradient(90deg,rgba(255,255,255,0.26)_0,rgba(255,255,255,0.06)_7px,rgba(92,74,48,0.2)_15px,rgba(255,255,255,0.05)_24px),radial-gradient(circle_at_22%_72%,rgba(95,73,45,0.22)_0,transparent_18%)] opacity-95" />
                          <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/18 to-transparent" />
                          <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white/20 to-transparent" />
                          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-stone-900/14" />
                          <div className="relative">
                            <div className={`mx-auto max-w-36 rounded-lg border border-stone-950/45 bg-gradient-to-br ${plaqueSkin} px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),inset_0_-10px_18px_rgba(0,0,0,0.24),0_12px_20px_rgba(0,0,0,0.38)]`}>
                              <h3 className="text-base font-black uppercase leading-none text-stone-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.42)]">
                                {leader.name}
                              </h3>
                            </div>
                            <p className="mt-3 text-3xl font-black text-stone-950 drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]">
                              {contributionCount}
                            </p>
                          </div>
                        </div>

                        <div className={`relative z-10 h-5 ${bottomRingClass} rounded-t-[50%] border-x-4 border-t-4 border-stone-100/70 bg-gradient-to-r ${crownSkin} shadow-[inset_0_8px_12px_rgba(255,255,255,0.45),0_-5px_10px_rgba(0,0,0,0.12)]`} />
                        <div className={`relative z-10 h-6 ${bottomFlareClass} rounded-b-lg border-x-4 border-stone-100/70 bg-gradient-to-r ${crownSkin} shadow-[inset_0_-8px_14px_rgba(92,74,48,0.18)]`} />
                        <div className={`relative z-10 h-4 ${bottomSlabClass} rounded-b-xl border-x-4 border-b-4 border-stone-100/75 bg-gradient-to-r ${crownSkin} shadow-[inset_0_-7px_12px_rgba(92,74,48,0.22)]`} />
                      </div>
                      <div className="pointer-events-none absolute left-1/2 top-full z-30 mt-3 w-52 -translate-x-1/2 rounded-xl border border-stone-100/25 bg-black/88 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/70 opacity-0 shadow-2xl backdrop-blur transition duration-150 group-hover:opacity-100 group-focus:opacity-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xl font-black text-white">{leader.completedTasks}</p>
                            <p className="mt-1">Tasks</p>
                          </div>
                          <div>
                            <p className="text-xl font-black text-white">{leader.completedSubtasks}</p>
                            <p className="mt-1">Subtasks</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {honorableMentions.length > 0 && (
                <div className="mx-auto mt-8 max-w-2xl border-t border-white/14 pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/45">
                    Honorable Mentions
                  </p>
                  <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
                    {honorableMentions.map((user, index) => (
                      <div
                        key={user.userId}
                        className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 py-3 text-left"
                      >
                        <p className="text-center text-sm font-black text-white/55">
                          #{index + 4}
                        </p>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black uppercase text-white">{user.name}</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                            {user.completedTasks} task{user.completedTasks === 1 ? '' : 's'}
                          </p>
                        </div>
                        <p className="text-right text-sm font-black text-white">
                          {user.completedSubtasks} subtask{user.completedSubtasks === 1 ? '' : 's'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.section>

            <div className="relative mx-auto mt-16 h-16 max-w-3xl px-6">
              <svg
                className="h-full w-full overflow-visible"
                viewBox="0 0 720 64"
                role="img"
                aria-label="Curling vine divider"
              >
                <defs>
                  <linearGradient id="vineStroke" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#064e3b" stopOpacity="0" />
                    <stop offset="16%" stopColor="#047857" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#6ee7b7" stopOpacity="0.95" />
                    <stop offset="84%" stopColor="#047857" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#064e3b" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M24 35 C92 18 136 52 196 33 C254 15 283 22 329 36 C376 50 419 53 462 32 C525 2 569 19 610 34 C650 49 682 43 704 30"
                  fill="none"
                  stroke="url(#vineStroke)"
                  strokeLinecap="round"
                  strokeWidth="3"
                />
                <path d="M126 35 C109 14 135 2 148 17 C161 32 139 43 126 35" fill="none" stroke="#34d399" strokeLinecap="round" strokeWidth="2" />
                <path d="M236 30 C255 9 283 21 273 42 C265 58 239 50 247 34" fill="none" stroke="#059669" strokeLinecap="round" strokeWidth="2" />
                <path d="M360 39 C342 22 352 4 371 10 C391 16 387 42 367 42" fill="none" stroke="#6ee7b7" strokeLinecap="round" strokeWidth="2" />
                <path d="M492 27 C510 7 538 17 529 39 C522 58 494 50 501 31" fill="none" stroke="#10b981" strokeLinecap="round" strokeWidth="2" />
                <path d="M596 34 C580 52 552 42 561 21 C569 3 595 13 589 30" fill="none" stroke="#047857" strokeLinecap="round" strokeWidth="2" />
                <circle cx="190" cy="34" r="3" fill="#a7f3d0" opacity="0.9" />
                <circle cx="329" cy="36" r="2.5" fill="#bef264" opacity="0.85" />
                <circle cx="462" cy="32" r="3" fill="#a7f3d0" opacity="0.9" />
                <circle cx="610" cy="34" r="2.5" fill="#bef264" opacity="0.85" />
              </svg>
            </div>

            <div className="relative mx-auto mt-14 max-w-3xl">
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/20" />
              <AnimatePresence mode="popLayout">
              {doneProjects.map((project, index) => {
                const completedSubtasks = project.subtasks.filter((s) => s.done).length;
                const totalSubtasks = project.subtasks.length;
                const side = index % 2 === 0 ? 'md:pr-[55%]' : 'md:pl-[55%]';
                const assignees = new Map<string, TimelineAssignee>();

                for (const assigneeId of getAssigneeIds(project.assigneeIds, project.assigneeId)) {
                  const member = memberLookup.get(assigneeId);
                  assignees.set(assigneeId, {
                    userId: assigneeId,
                    name: member?.name ?? 'Unknown',
                    avatar: member?.avatar ?? null,
                  });
                }

                for (const subtask of project.subtasks) {
                  if (!subtask.done) continue;
                  const subtaskAssignees = getAssigneeIds(subtask.assigneeIds, subtask.assigneeId);
                  const fallbackAssignees = getAssigneeIds(project.assigneeIds, project.assigneeId);
                  for (const assigneeId of subtaskAssignees.length > 0 ? subtaskAssignees : fallbackAssignees) {
                    if (assignees.has(assigneeId)) continue;
                    const member = memberLookup.get(assigneeId);
                    assignees.set(assigneeId, {
                      userId: assigneeId,
                      name: member?.name ?? 'Unknown',
                      avatar: member?.avatar ?? null,
                    });
                  }
                }

                const timelineAssignees = Array.from(assignees.values());

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
                        {timelineAssignees.length > 0 && (
                          <div className="mt-4 flex items-center justify-center">
                            <div className="flex -space-x-2">
                              {timelineAssignees.slice(0, 4).map((assignee) => (
                                <div
                                  key={assignee.userId}
                                  title={assignee.name}
                                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white bg-cover bg-center text-xs font-black uppercase text-black shadow-[0_0_0_1px_rgba(255,255,255,0.45)]${codexAvatarClass(assignee.userId)}`}
                                  style={assignee.avatar ? { backgroundImage: `url(${assignee.avatar})` } : undefined}
                                >
                                  {!assignee.avatar && assignee.name.charAt(0)}
                                </div>
                              ))}
                              {timelineAssignees.length > 4 && (
                                <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-white text-xs font-black text-black shadow-[0_0_0_1px_rgba(255,255,255,0.45)]">
                                  +{timelineAssignees.length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
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
