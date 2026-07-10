'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Project, BoardMemberInfo } from '@/lib/useProjects';
import AssigneeSelector from './AssigneeSelector';

interface ProjectCardProps {
  project: Project;
  progress: number;
  onMove: (direction: 'forward' | 'back') => void;
  onDelete: () => void;
  members?: BoardMemberInfo[];
  onAssignProject?: (userIds: string[]) => void;
  boardId?: string;
  isDragging?: boolean;
  isCompleting?: boolean;
  disableLayoutAnimation?: boolean;
  nextActionLabel?: string;
  nextActionIcon?: string;
}

export default function ProjectCard({
  project,
  progress,
  onMove,
  members,
  onAssignProject,
  boardId,
  isDragging = false,
  isCompleting = false,
  disableLayoutAnimation = false,
  nextActionLabel = 'Move forward',
  nextActionIcon = '→',
}: ProjectCardProps) {
  const completedSubtasks = project.subtasks.filter((s) => s.done).length;
  const hasMembers = members && members.length > 0;

  return (
    <motion.div
      layout={!disableLayoutAnimation}
      initial={disableLayoutAnimation ? false : { opacity: 0, y: 20 }}
      animate={isCompleting ? {
        opacity: 0,
        y: -34,
        scale: 0.94,
        rotate: -1.5,
        filter: 'blur(1px) saturate(1.4)',
      } : { opacity: isDragging ? 0.32 : 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: isCompleting ? 0.55 : 0.3 }}
      className={`relative overflow-hidden rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-4 shadow-[0_10px_30px_rgba(17,17,17,0.05)] hover:shadow-[0_14px_36px_rgba(17,17,17,0.08)] transition-all duration-300 ${
        isDragging ? 'ring-2 ring-[var(--accent)]/25 shadow-none' : ''
      }`}
    >
      {isCompleting && (
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: '-15%', opacity: [0, 1, 0.85] }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(circle_at_24%_80%,rgba(255,219,92,0.95)_0_14%,transparent_24%),radial-gradient(circle_at_48%_76%,rgba(255,116,49,0.9)_0_18%,transparent_30%),radial-gradient(circle_at_72%_82%,rgba(239,68,68,0.82)_0_16%,transparent_28%)]"
        />
      )}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">{project.category}</p>
          <h3 className="text-[var(--foreground)] font-bold text-sm mt-1">{project.title}</h3>
          <p className="text-[var(--muted)] text-xs mt-1 line-clamp-2">{project.note}</p>
        </div>
        <div className="flex items-start ml-2 shrink-0">
          {hasMembers && onAssignProject && (
            <AssigneeSelector
              members={members}
              assigneeId={project.assigneeId}
              assigneeIds={project.assigneeIds}
              onAssign={onAssignProject}
              size="sm"
            />
          )}
        </div>
      </div>

      <div className="space-y-3 mt-3">
        <div className="h-2 bg-[var(--panel-strong)] rounded-full overflow-hidden ring-1 ring-[var(--accent)]/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[var(--accent)] via-[#2b2f35] to-[var(--accent-sheen)]"
          />
        </div>

        <div className="text-xs text-[var(--muted)]">
          {completedSubtasks}/{project.subtasks.length} subtasks
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Link
          href={boardId ? `/project/${project.slug}?boardId=${encodeURIComponent(boardId)}` : `/project/${project.slug}`}
          className="flex-1 text-center px-3 py-2 rounded-lg bg-[var(--panel-strong)] hover:bg-[var(--accent-soft)] text-[var(--foreground)] text-xs font-semibold transition-colors duration-200"
        >
          Open
        </Link>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onMove('forward')}
          aria-label={nextActionLabel}
          title={nextActionLabel}
          className="px-2 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-medium transition-colors duration-200 shadow-[0_6px_16px_rgba(29,31,35,0.12)]"
        >
          {nextActionIcon}
        </motion.button>
      </div>
    </motion.div>
  );
}
