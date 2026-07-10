'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Link from 'next/link';
import ProjectCard from './ProjectCard';
import { Project, useProjects, BoardMemberInfo } from '@/lib/useProjects';
import { useCallback, useEffect, useState } from 'react';
import UserMenu from './UserMenu';
import InviteFriendsModal from './InviteFriendsModal';
import BoardIcon from './BoardIcon';

type BoardStage = 'planning' | 'active' | 'review';
type ProjectStage = Project['stage'];

const STAGES: Array<{ key: BoardStage; label: string; accepts: ProjectStage[] }> = [
  { key: 'planning', label: 'Plan', accepts: ['idea', 'planning'] },
  { key: 'active', label: 'Active', accepts: ['active'] },
  { key: 'review', label: 'Review', accepts: ['review'] }
];

const STAGE_LABELS: Record<ProjectStage, string> = {
  idea: 'Plan',
  planning: 'Plan',
  active: 'Active',
  review: 'Review',
  done: 'Done',
};

interface BoardViewProps {
  boardSlug: string;
}

interface BoardMember {
  id: string;
  boardId: string;
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  name: string;
  avatar: string | null;
  joinedAt: string;
}

interface BoardInfo {
  id: string;
  name: string;
  emoji: string;
  websiteUrl: string | null;
  slug: string;
  joinCode: string;
  ownerId?: string | null;
  hasPassword: boolean;
  passkeyRequired?: boolean;
  isOwner?: boolean;
  projects: Project[];
  members?: BoardMember[];
}

interface FriendOption {
  id: string;
  name: string;
  friendCode: string;
  avatar?: string;
}

interface ProjectFormData {
  title: string;
  note: string;
  stage: BoardStage;
  subtasks: string;
  category: string;
}

function getNextStage(stage: ProjectStage): ProjectStage {
  if (stage === 'idea' || stage === 'planning') return 'active';
  if (stage === 'active') return 'review';
  if (stage === 'review') return 'done';
  return 'done';
}

function getPreviousStage(stage: ProjectStage): ProjectStage {
  if (stage === 'review') return 'active';
  if (stage === 'active') return 'planning';
  return stage;
}

function isProjectInBoardStage(project: Project, stage: BoardStage) {
  return STAGES.find((item) => item.key === stage)?.accepts.includes(project.stage) ?? false;
}

function StageDropZone({
  id,
  children,
}: {
  id: string;
  children: (isOver: boolean) => React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef}>
      {children(isOver)}
    </div>
  );
}

function DraggableProjectCard({
  project,
  progress,
  onMove,
  onDelete,
  members,
  onAssignProject,
  boardId,
  isCompleting,
}: {
  project: Project;
  progress: number;
  onMove: (direction: 'forward' | 'back') => void;
  onDelete: () => void;
  members?: BoardMemberInfo[];
  onAssignProject?: (userId: string | null) => void;
  boardId: string;
  isCompleting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging,
  } = useDraggable({
    id: project.id,
    data: { projectId: project.id, stage: project.stage },
  });

  const style = {
    position: 'relative' as const,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab touch-none select-none active:cursor-grabbing"
    >
      <ProjectCard
        project={project}
        progress={progress}
        onMove={onMove}
        onDelete={onDelete}
        members={members}
        onAssignProject={onAssignProject}
        boardId={boardId}
        isDragging={isDragging}
        isCompleting={isCompleting}
        disableLayoutAnimation={isDragging}
        nextActionLabel={project.stage === 'review' ? 'Complete project' : `Move to ${STAGE_LABELS[getNextStage(project.stage)]}`}
        nextActionIcon={project.stage === 'review' ? '🔥' : '→'}
      />
    </div>
  );
}

export default function BoardView({ boardSlug }: BoardViewProps) {
  const { isLoaded, addProject, updateProject, deleteProject, getProjectProgress } = useProjects();
  const [board, setBoard] = useState<BoardInfo | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    note: '',
    stage: 'planning',
    subtasks: '',
    category: ''
  });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmoji, setEditEmoji] = useState('📋');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [activeDragProjectId, setActiveDragProjectId] = useState<string | null>(null);
  const [completingProjectIds, setCompletingProjectIds] = useState<Set<string>>(new Set());
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const loadBoard = useCallback(async () => {
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
  }, [boardSlug]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBoard();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadBoard]);

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
  const categoryOptions = Array.from(
    new Set(projects.map((project) => project.category.trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const patchLocalProject = (projectId: string, updates: Partial<Project>) => {
    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.map((project) =>
          project.id === projectId ? { ...project, ...updates } : project
        ),
      };
    });
  };

  const finishProject = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.stage !== 'review' || completingProjectIds.has(projectId)) return;

    setCompletingProjectIds((current) => new Set(current).add(projectId));
    window.setTimeout(() => {
      const completedAt = new Date().toISOString();
      patchLocalProject(projectId, { stage: 'done', completedAt });
      void updateProject(projectId, { stage: 'done', completedAt });
      setCompletingProjectIds((current) => {
        const next = new Set(current);
        next.delete(projectId);
        return next;
      });
    }, 560);
  };

  const moveProjectToStage = (projectId: string, stage: ProjectStage) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || project.stage === stage) return;

    if (stage === 'done') {
      finishProject(projectId);
      return;
    }

    patchLocalProject(projectId, { stage });
    void updateProject(projectId, { stage });
  };

  const handleMoveProject = (projectId: string, direction: 'forward' | 'back') => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const nextStage = direction === 'forward'
      ? getNextStage(project.stage)
      : getPreviousStage(project.stage);

    moveProjectToStage(projectId, nextStage);
  };

  const handleAssignProject = (projectId: string, userId: string | null) => {
    patchLocalProject(projectId, { assigneeId: userId });
    void updateProject(projectId, { assigneeId: userId });
  };

  const handleDeleteProject = (projectId: string) => {
    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.filter((project) => project.id !== projectId),
      };
    });
    void deleteProject(projectId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragProjectId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const projectId = String(event.active.id);
    const targetId = event.over?.id ? String(event.over.id) : null;
    setActiveDragProjectId(null);

    if (!targetId) return;
    const project = projects.find((item) => item.id === projectId);
    if (!project) return;

    const targetStage = STAGES.find((stage) => `stage:${stage.key}` === targetId);
    if (!targetStage || isProjectInBoardStage(project, targetStage.key)) return;

    moveProjectToStage(projectId, targetStage.key);
  };

  const handleDragCancel = () => {
    setActiveDragProjectId(null);
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
    setShowCategoryOptions(false);
    setShowForm(false);
    loadBoard();
  };

  const summary = {
    total: activeProjects.length,
    inMotion: activeProjects.filter((p) => p.stage === 'active' || p.stage === 'review').length,
    needsAttention: activeProjects.filter((p) => getProjectProgress(p) < 50).length
  };

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends || []);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const openBoardSettings = () => {
    if (!board?.isOwner) return;
    setEditName(board.name);
    setEditEmoji(board.emoji || '📋');
    setEditWebsiteUrl(board.websiteUrl || '');
    setTransferOwnerId('');
    setTransferConfirm('');
    setSettingsError('');
    setShowRenameModal(true);
    void loadFriends();
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[var(--header-surface)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-full mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="profile-accent-link text-sm font-medium transition-colors"
            >
              ← Boards
            </Link>
            <div>
              <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">
                Code: {board.joinCode}
              </p>
              <button
                type="button"
                className={`hero-title text-[var(--foreground)] text-xl md:text-2xl mt-1 transition-colors text-left ${
                  board.isOwner ? 'cursor-pointer hover:text-[var(--accent)]' : 'cursor-default'
                }`}
                onClick={openBoardSettings}
                title={board.isOwner ? 'Board settings' : board.name}
              >
                <BoardIcon
                  emoji={board.emoji}
                  websiteUrl={board.websiteUrl}
                  className="mr-2 inline-block"
                  imageClassName="mr-2 inline-block w-6 h-6 rounded-md align-[-0.12em]"
                />
                {board.name}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Member Avatars */}
            {board.members && board.members.length > 0 && (
              <div className="flex -space-x-2">
                {board.members.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="relative group"
                    title={`${member.name} (${member.role})`}
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-7 h-7 rounded-full border-2 border-[var(--panel)] shadow-sm"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[var(--accent)]/20 border-2 border-[var(--panel)] flex items-center justify-center text-[11px] font-bold text-[var(--accent)]">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {member.role === 'owner' && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[13px] drop-shadow-[0_1px_1px_rgba(255,255,255,0.9)] pointer-events-none">👑</span>
                    )}
                  </div>
                ))}
                {board.members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-[var(--panel-strong)] border-2 border-[var(--panel)] flex items-center justify-center text-[11px] font-medium text-[var(--muted)]">
                    +{board.members.length - 5}
                  </div>
                )}
              </div>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowInviteModal(true)}
              aria-label="Invite"
              title="Invite"
              className="app-toolbar-button app-toolbar-button-neutral transition-all duration-300"
            >
              <span aria-hidden="true">📧</span>
            </motion.button>
            {doneCount > 0 && (
              <Link
                href={`/board/${board.slug}/hall-of-fame`}
                aria-label={`Hall of Fame, ${doneCount} completed`}
                title={`Hall of Fame (${doneCount})`}
                className="app-toolbar-button app-toolbar-button-neutral transition-all duration-300"
              >
                <span aria-hidden="true">🏆</span>
              </Link>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowForm(!showForm)}
              aria-label="New project"
              title="New project"
              className={`app-toolbar-button transition-all duration-300 ${
                showForm
                  ? 'app-toolbar-button-primary'
                  : 'app-toolbar-button-neutral'
              }`}
            >
              <span aria-hidden="true">+</span>
            </motion.button>

            <UserMenu />
          </div>
        </div>
      </motion.header>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--border)] bg-[var(--header-strong)] backdrop-blur-sm"
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
              <div className="relative">
                <input
                  type="text"
                  placeholder="Category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  onFocus={() => categoryOptions.length > 0 && setShowCategoryOptions(true)}
                  onBlur={() => window.setTimeout(() => setShowCategoryOptions(false), 120)}
                  className="w-full px-3 py-2 pr-11 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowCategoryOptions((open) => !open)}
                  className="absolute right-1 top-1 bottom-1 w-9 rounded-md bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90 transition-colors"
                  aria-label="Show categories"
                  title="Show categories"
                >
                  ▾
                </button>
                {showCategoryOptions && categoryOptions.length > 0 && (
                  <div className="absolute z-[80] mt-1 w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-[0_12px_36px_rgba(17,17,17,0.12)]">
                    {categoryOptions.map((category) => (
                      <button
                        key={category}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setFormData({ ...formData, category });
                          setShowCategoryOptions(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors"
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value as BoardStage })}
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

      {/* Board Settings Modal */}
      <AnimatePresence>
        {showRenameModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setShowRenameModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Board Settings</h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!editName.trim() || !editEmoji.trim() || !board) return;
                  if (transferOwnerId && transferConfirm !== board.name) {
                    setSettingsError(`Type ${board.name} to confirm ownership transfer.`);
                    return;
                  }
                  try {
                    const response = await fetch(`/api/boards/${board.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: editName.trim(),
                        emoji: editEmoji.trim(),
                        websiteUrl: editWebsiteUrl.trim() || null,
                        transferOwnerId: transferOwnerId || undefined,
                      }),
                    });
                    if (response.ok) {
                      const updated = await response.json();
                      setBoard({
                        ...board,
                        name: updated.name,
                        emoji: updated.emoji,
                        websiteUrl: updated.websiteUrl,
                        ownerId: updated.ownerId,
                        isOwner: updated.isOwner,
                        members: board.members?.map((member) => {
                          if (member.userId === transferOwnerId) return { ...member, role: 'owner' };
                          if (member.role === 'owner') return { ...member, role: 'editor' };
                          return member;
                        }),
                      });
                      setShowRenameModal(false);
                      void loadBoard();
                    } else {
                      const data = await response.json().catch(() => ({}));
                      setSettingsError(data.error || 'Failed to update board settings');
                    }
                  } catch (err) {
                    console.error('Failed to rename board:', err);
                    setSettingsError('Failed to update board settings');
                  }
                }}
              >
                <div className="grid grid-cols-[4.5rem_1fr] gap-3 mb-4">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-[var(--muted)]">Emoji</span>
                    <input
                      type="text"
                      value={editEmoji}
                      onChange={(e) => setEditEmoji(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)] text-[var(--foreground)] text-2xl text-center focus:outline-none focus:border-[var(--accent)]/40"
                      maxLength={16}
                      autoFocus
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-[var(--muted)]">Name</span>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/40"
                    />
                  </label>
                </div>

                <label className="block mb-4">
                  <span className="text-xs font-semibold uppercase text-[var(--muted)]">Website</span>
                  <input
                    type="url"
                    value={editWebsiteUrl}
                    onChange={(e) => setEditWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1 w-full px-3 py-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                  />
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    When set, the board icon uses this site&apos;s favicon.
                  </span>
                </label>

                <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-3">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Transfer ownership</p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Transfer this board to an accepted friend. You will become an editor.
                  </p>
                  <select
                    value={transferOwnerId}
                    onChange={(e) => {
                      setTransferOwnerId(e.target.value);
                      setTransferConfirm('');
                      setSettingsError('');
                    }}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/40"
                  >
                    <option value="">Keep current owner</option>
                    {friends.map((friend) => (
                      <option key={friend.id} value={friend.id}>
                        {friend.name} ({friend.friendCode})
                      </option>
                    ))}
                  </select>
                  {transferOwnerId && (
                    <input
                      type="text"
                      value={transferConfirm}
                      onChange={(e) => setTransferConfirm(e.target.value)}
                      placeholder={`Type "${board.name}" to confirm`}
                      className="mt-3 w-full px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                    />
                  )}
                </div>

                {settingsError && (
                  <p className="text-sm text-red-600 mb-3">{settingsError}</p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRenameModal(false)}
                    className="flex-1 px-4 py-2 rounded-lg bg-[var(--panel-strong)] text-[var(--foreground)] font-medium hover:bg-[var(--panel)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/90 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Friends Modal */}
      <InviteFriendsModal
        boardSlug={boardSlug}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

      {/* Board */}
      <div className="max-w-full mx-auto px-6 pb-12">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STAGES.map((stage, stageIndex) => {
              const stageProjects = activeProjects.filter((p) => isProjectInBoardStage(p, stage.key));

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

                    <StageDropZone id={`stage:${stage.key}`}>
                      {(isOver) => (
                        <div
                          className={`space-y-3 min-h-[200px] rounded-2xl bg-[var(--lane-surface)] border p-4 shadow-[inset_0_1px_0_var(--inset-highlight)] transition-colors ${
                            isOver
                              ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                              : 'border-[var(--border)]'
                          }`}
                        >
                          <AnimatePresence mode="popLayout">
                            {stageProjects.length > 0 ? (
                              stageProjects.map((project) => (
                                <DraggableProjectCard
                                  key={project.id}
                                  project={project}
                                  progress={getProjectProgress(project)}
                                  onMove={(direction) => handleMoveProject(project.id, direction)}
                                  onDelete={() => handleDeleteProject(project.id)}
                                  members={board.members as BoardMemberInfo[] | undefined}
                                  onAssignProject={(userId) => handleAssignProject(project.id, userId)}
                                  boardId={board.id}
                                  isCompleting={completingProjectIds.has(project.id)}
                                />
                              ))
                            ) : (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[var(--muted)] text-xs text-center py-8"
                              >
                                Drop projects here
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </StageDropZone>
                  </div>
                </motion.div>
              );
            })}

          </div>
          <DragOverlay dropAnimation={{
            duration: 180,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}>
            {activeDragProjectId ? (() => {
              const activeProject = activeProjects.find((project) => project.id === activeDragProjectId);
              if (!activeProject) return null;

              return (
                <div className="w-[min(28rem,calc(100vw-3rem))] cursor-grabbing drop-shadow-[0_18px_42px_rgba(17,17,17,0.18)]">
                  <ProjectCard
                    project={activeProject}
                    progress={getProjectProgress(activeProject)}
                    onMove={() => {}}
                    onDelete={() => {}}
                    members={board.members as BoardMemberInfo[] | undefined}
                    onAssignProject={undefined}
                    boardId={board.id}
                    disableLayoutAnimation
                    nextActionLabel={activeProject.stage === 'review' ? 'Complete project' : `Move to ${STAGE_LABELS[getNextStage(activeProject.stage)]}`}
                    nextActionIcon={activeProject.stage === 'review' ? '🔥' : '→'}
                  />
                </div>
              );
            })() : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
