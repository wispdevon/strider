'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BoardMemberInfo } from '@/lib/useProjects';

interface AssigneeSelectorProps {
  members: BoardMemberInfo[];
  assigneeId?: string | null;
  onAssign: (userId: string | null) => void;
  size?: 'sm' | 'md';
  label?: string;
}

export default function AssigneeSelector({ members, assigneeId, onAssign, size = 'sm', label = 'Assign' }: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const assignee = assigneeId ? members.find((m) => m.userId === assigneeId) : null;
  const avatarSize = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
  const assignedPadding = size === 'sm' ? 'p-0.5' : 'py-1 pl-1 pr-2';
  const unassignedPadding = size === 'sm' ? 'p-1' : 'py-1 px-2';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  // Don't render if there are no members (single-user board)
  if (members.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        className={`flex items-center gap-1.5 rounded-full border transition-all duration-200 ${
          assignee
            ? `bg-[var(--accent-soft)] border-[var(--accent)]/20 ${assignedPadding}`
            : `bg-[var(--panel-strong)] border-[var(--border)] hover:border-[var(--accent)]/30 ${unassignedPadding}`
        }`}
        title={assignee ? `Assigned to ${assignee.name}` : label}
      >
        {assignee ? (
          <>
            {assignee.avatar ? (
              <img
                src={assignee.avatar}
                alt={assignee.name}
                className={`${avatarSize} rounded-full`}
              />
            ) : (
              <div className={`${avatarSize} rounded-full bg-[var(--accent)]/20 flex items-center justify-center font-bold text-[var(--accent)]`}>
                {assignee.name.charAt(0).toUpperCase()}
              </div>
            )}
            {size === 'md' && (
              <span className="text-xs font-medium text-[var(--foreground)]">{assignee.name}</span>
            )}
          </>
        ) : (
          <span className="text-[var(--muted)] text-xs font-medium flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14a6 6 0 1112 0H2z" />
            </svg>
            {size === 'md' && label}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[200] mt-1 right-0 min-w-[180px] rounded-xl bg-[var(--panel)] border border-[var(--border)] shadow-[0_12px_40px_rgba(17,17,17,0.12)] overflow-hidden"
          >
            <div className="p-1">
              {assignee && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(null);
                    setOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--panel-strong)] text-xs text-[var(--muted)] transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--panel-strong)] flex items-center justify-center text-[10px]">✕</span>
                  Unassign
                </button>
              )}
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign(member.userId);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    member.userId === assigneeId
                      ? 'bg-[var(--accent-soft)]'
                      : 'hover:bg-[var(--panel-strong)]'
                  }`}
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-5 h-5 rounded-full"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent)]">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-[var(--foreground)] flex-1 truncate">{member.name}</span>
                  {member.userId === assigneeId && (
                    <span className="text-[var(--accent)] text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
