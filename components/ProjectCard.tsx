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
  onAssignProject?: (userId: string | null) => void;
  boardId?: string;
}

export default function ProjectCard({ project, progress, onMove, onDelete, members, onAssignProject, boardId }: ProjectCardProps) {
  const completedSubtasks = project.subtasks.filter((s) => s.done).length;
  const hasMembers = members && members.length > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-4 shadow-[0_10px_30px_rgba(17,17,17,0.05)] hover:shadow-[0_14px_36px_rgba(17,17,17,0.08)] transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <p className="text-[var(--accent)] text-xs font-semibold uppercase tracking-wider">{project.category}</p>
          <h3 className="text-[var(--foreground)] font-bold text-sm mt-1">{project.title}</h3>
          <p className="text-[var(--muted)] text-xs mt-1 line-clamp-2">{project.note}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          {hasMembers && onAssignProject && (
            <AssigneeSelector
              members={members}
              assigneeId={project.assigneeId}
              onAssign={onAssignProject}
              size="sm"
            />
          )}
          <span className="text-[var(--accent)] font-mono text-xs">{progress}%</span>
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
          onClick={() => onMove('back')}
          className="px-2 py-2 rounded-lg bg-[var(--panel-strong)] hover:bg-[var(--accent-soft)] text-[var(--foreground)] text-xs font-medium transition-colors duration-200"
        >
          ←
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onMove('forward')}
          className="px-2 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white text-xs font-medium transition-colors duration-200 shadow-[0_6px_16px_rgba(29,31,35,0.12)]"
        >
          →
        </motion.button>
      </div>
    </motion.div>
  );
}