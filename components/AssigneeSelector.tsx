'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BoardMemberInfo } from '@/lib/useProjects';
import { CODEX_ASSIGNEE_ID } from '@/lib/virtual-assignees';

interface AssigneeSelectorProps {
  members: BoardMemberInfo[];
  assigneeId?: string | null;
  assigneeIds?: string[];
  onAssign: (userIds: string[]) => void;
  size?: 'sm' | 'md';
  label?: string;
}

function normalizeAssigneeIds(assigneeIds?: string[], assigneeId?: string | null) {
  const ids = Array.isArray(assigneeIds) ? assigneeIds : [];
  const withFallback = assigneeId ? [assigneeId, ...ids] : ids;
  return Array.from(new Set(withFallback.filter(Boolean)));
}

function avatarClass(userId: string, sizeClass: string) {
  return `${sizeClass} rounded-full bg-[var(--panel-strong)] ${userId === CODEX_ASSIGNEE_ID ? 'codex-agent-avatar' : ''}`;
}

export default function AssigneeSelector({ members, assigneeId, assigneeIds, onAssign, size = 'sm', label = 'Assign' }: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedIds = normalizeAssigneeIds(assigneeIds, assigneeId);
  const selectedMembers = selectedIds
    .map((id) => members.find((member) => member.userId === id))
    .filter((member): member is BoardMemberInfo => Boolean(member));
  const avatarSize = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
  const assignedPadding = size === 'sm' ? 'py-0.5 pl-0.5 pr-1.5' : 'py-1 pl-1 pr-2';
  const unassignedPadding = size === 'sm' ? 'p-1' : 'py-1 px-2';
  const assignedNames = selectedMembers.map((member) => member.name).join(', ');

  const toggleAssignee = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onAssign(selectedIds.filter((id) => id !== userId));
      return;
    }
    onAssign([...selectedIds, userId]);
  };

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
          selectedMembers.length > 0
            ? `bg-[var(--accent-soft)] border-[var(--accent)]/20 ${assignedPadding}`
            : `bg-[var(--panel-strong)] border-[var(--border)] hover:border-[var(--accent)]/30 ${unassignedPadding}`
        }`}
        title={selectedMembers.length > 0 ? `Assigned to ${assignedNames}` : label}
      >
        {selectedMembers.length > 0 ? (
          <>
            <span className="flex -space-x-1">
              {selectedMembers.slice(0, 3).map((member) => (
                member.avatar ? (
                  <img
                    key={member.userId}
                    src={member.avatar}
                    alt={member.name}
                    className={`${avatarClass(member.userId, avatarSize)} ring-1 ring-[var(--panel)]`}
                  />
                ) : (
                  <span
                    key={member.userId}
                    className={`${avatarSize} rounded-full bg-[var(--accent)]/20 flex items-center justify-center font-bold text-[var(--accent)] ring-1 ring-[var(--panel)]`}
                  >
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                )
              ))}
            </span>
            {selectedMembers.length > 3 && (
              <span className="text-[10px] font-bold text-[var(--foreground)]">+{selectedMembers.length - 3}</span>
            )}
            {size === 'md' && (
              <span className="max-w-32 truncate text-xs font-medium text-[var(--foreground)]">
                {selectedMembers.length === 1 ? selectedMembers[0].name : `${selectedMembers.length} assigned`}
              </span>
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
            className="absolute right-0 z-[200] mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_40px_rgba(17,17,17,0.12)]"
          >
            <div className="max-h-80 overflow-y-auto overscroll-contain p-1.5">
              {selectedMembers.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign([]);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--panel-strong)] text-sm text-[var(--muted)] transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-[var(--panel-strong)] flex items-center justify-center text-[10px]">✕</span>
                  Clear assignees
                </button>
              )}
              {members.map((member) => (
                <button
                  key={member.userId}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAssignee(member.userId);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${
                    selectedIds.includes(member.userId)
                      ? 'bg-[var(--accent-soft)]'
                      : 'hover:bg-[var(--panel-strong)]'
                  }`}
                >
                  {member.avatar ? (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className={avatarClass(member.userId, 'w-7 h-7')}
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold text-[var(--accent)]">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">{member.name}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] text-xs text-[var(--accent)]">
                    {selectedIds.includes(member.userId) ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
