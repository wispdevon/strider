'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { BoardMemberInfo } from '@/lib/useProjects';
import { CLAUDE_ASSIGNEE_ID, CODEX_ASSIGNEE_ID } from '@/lib/virtual-assignees';

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

function MemberAvatar({
  member,
  sizeClass,
  ringClass = '',
}: {
  member: BoardMemberInfo;
  sizeClass: string;
  ringClass?: string;
}) {
  const isCodex = member.userId === CODEX_ASSIGNEE_ID;
  const isAgent = isCodex || member.userId === CLAUDE_ASSIGNEE_ID;

  if (member.avatar && isAgent) {
    return (
      <span
        className={`${sizeClass} ${isCodex ? 'codex-agent-avatar-surface' : ''} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--panel-strong)] ${ringClass}`}
      >
        <img
          src={member.avatar}
          alt={member.name}
          className={`${isCodex ? 'codex-agent-avatar ' : ''}h-[78%] w-[78%] object-contain`}
        />
      </span>
    );
  }

  if (member.avatar) {
    return (
      <img
        src={member.avatar}
        alt={member.name}
        className={`${sizeClass} shrink-0 rounded-full bg-[var(--panel-strong)] object-cover ${ringClass}`}
      />
    );
  }

  return (
    <span
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 font-bold text-[var(--accent)] ${ringClass}`}
    >
      {member.name.charAt(0).toUpperCase()}
    </span>
  );
}

interface PanelPosition {
  left: number;
  top?: number;
  bottom?: number;
  width: number;
  maxHeight: number;
  transformOrigin: 'top right' | 'bottom right';
}

export default function AssigneeSelector({ members, assigneeId, assigneeIds, onAssign, size = 'sm', label = 'Assign' }: AssigneeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectedIds = normalizeAssigneeIds(assigneeIds, assigneeId);
  const selectedMembers = selectedIds
    .map((id) => members.find((member) => member.userId === id))
    .filter((member): member is BoardMemberInfo => Boolean(member));
  const avatarSize = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs';
  const assignedPadding = size === 'sm' ? 'p-0.5' : 'py-1 pl-1 pr-2';
  const unassignedPadding = size === 'sm' ? 'p-1' : 'py-1 px-2';
  const assignedNames = selectedMembers.map((member) => member.name).join(', ');

  const positionPanel = () => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const viewportPadding = 16;
    const panelGap = 8;
    const width = Math.min(384, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.right - width),
      window.innerWidth - width - viewportPadding,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding - panelGap;
    const spaceAbove = rect.top - viewportPadding - panelGap;
    const openBelow = spaceBelow >= 240 || spaceBelow >= spaceAbove;
    const maxHeight = Math.max(160, Math.min(448, openBelow ? spaceBelow : spaceAbove));
    setPanelPosition({
      left,
      top: openBelow ? rect.bottom + panelGap : undefined,
      bottom: openBelow ? undefined : window.innerHeight - rect.top + panelGap,
      width,
      maxHeight,
      transformOrigin: openBelow ? 'top right' : 'bottom right',
    });
  };

  const toggleAssignee = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onAssign(selectedIds.filter((id) => id !== userId));
      return;
    }
    onAssign([...selectedIds, userId]);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    positionPanel();
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    return () => {
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
    };
  }, [open]);

  // Don't render if there are no members (single-user board)
  if (members.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen(!open);
        }}
        className={`flex items-center rounded-full border transition-all duration-200 ${
          selectedMembers.length > 0
            ? `bg-[var(--accent-soft)] border-[var(--accent)]/20 ${assignedPadding} ${size === 'md' || selectedMembers.length > 3 ? 'gap-1.5' : ''}`
            : `bg-[var(--panel-strong)] border-[var(--border)] hover:border-[var(--accent)]/30 ${unassignedPadding} ${size === 'md' ? 'gap-1.5' : ''}`
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={selectedMembers.length > 0 ? `Assigned to ${assignedNames}` : label}
      >
        {selectedMembers.length > 0 ? (
          <>
            <span className="flex -space-x-1">
              {selectedMembers.slice(0, 3).map((member) => (
                <MemberAvatar
                  key={member.userId}
                  member={member}
                  sizeClass={avatarSize}
                  ringClass="ring-1 ring-[var(--panel)]"
                />
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

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
        {open && panelPosition && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              left: panelPosition.left,
              top: panelPosition.top,
              bottom: panelPosition.bottom,
              width: panelPosition.width,
              maxHeight: panelPosition.maxHeight,
              transformOrigin: panelPosition.transformOrigin,
            }}
            className="fixed z-[300] flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-[0_16px_48px_rgba(17,17,17,0.16)]"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Assign people</p>
                <p className="text-xs text-[var(--muted)]">
                  {selectedMembers.length === 0
                    ? 'No one assigned'
                    : `${selectedMembers.length} selected`}
                </p>
              </div>
              {selectedMembers.length > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAssign([]);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
                >
                  Clear
                </button>
              )}
            </div>
            <div
              role="listbox"
              aria-label="Board members"
              aria-multiselectable="true"
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
            >
              <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Board members
              </p>
              {members.map((member) => (
                <button
                  type="button"
                  key={member.userId}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAssignee(member.userId);
                  }}
                  role="option"
                  aria-selected={selectedIds.includes(member.userId)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors text-left ${
                    selectedIds.includes(member.userId)
                      ? 'bg-[var(--accent-soft)]'
                      : 'hover:bg-[var(--panel-strong)]'
                  }`}
                >
                  <MemberAvatar member={member} sizeClass="h-7 w-7 text-xs" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--foreground)]">{member.name}</span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--border)] text-xs text-[var(--accent)]">
                    {selectedIds.includes(member.userId) ? '✓' : ''}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
