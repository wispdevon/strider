'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import Link from 'next/link';
import ProjectCard from './ProjectCard';
import { Project, useProjects, BoardMemberInfo } from '@/lib/useProjects';
import { useCallback, useEffect, useRef, useState } from 'react';
import UserMenu from './UserMenu';
import InviteFriendsModal from './InviteFriendsModal';
import BoardIcon from './BoardIcon';
import { getAssignableMemberPool } from '@/lib/virtual-assignees';
import { useAuth } from '@/context/auth-context';

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
  friendCode?: string;
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
  isPublic: boolean;
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

interface FriendRequestState {
  id: string;
  name: string;
  friendCode: string;
  avatar?: string;
}

function getMemberFriendState(
  member: BoardMember,
  friends: FriendOption[],
  incomingRequests: FriendRequestState[],
  outgoingRequests: FriendRequestState[],
  currentUserId?: string
) {
  if (currentUserId && member.userId === currentUserId) return 'self';
  if (friends.some((friend) => friend.friendCode === member.friendCode)) return 'friend';
  if (incomingRequests.some((request) => request.friendCode === member.friendCode)) return 'incoming';
  if (outgoingRequests.some((request) => request.friendCode === member.friendCode)) return 'outgoing';
  return 'none';
}

interface ProjectFormData {
  title: string;
  note: string;
  stage: BoardStage;
  subtasks: string;
  category: string;
}

interface UndoProjectDeletion {
  project: Project;
}

interface DeletedProjectEntry {
  id: string;
  boardId: string;
  deletedAt: string;
  project: Project;
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

function sortProjects(projects: Project[]) {
  return [...projects].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

function exportFileName(name: string) {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const date = new Date().toISOString().slice(0, 10);
  return `${slug || 'board'}-${date}.json`;
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
  onUpdateProject,
  boardId,
  isCompleting,
}: {
  project: Project;
  progress: number;
  onMove: (direction: 'forward' | 'back') => void;
  onDelete: () => void;
  members?: BoardMemberInfo[];
  onAssignProject?: (userIds: string[]) => void;
  onUpdateProject?: (updates: Partial<Project>) => void;
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
  const {
    isOver,
    setNodeRef: setDropNodeRef,
  } = useDroppable({
    id: `project:${project.id}`,
    data: { projectId: project.id, stage: project.stage },
  });

  const style = {
    position: 'relative' as const,
  };

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        setDropNodeRef(node);
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={`w-[min(18rem,80vw)] shrink-0 cursor-grab touch-pan-x select-none active:cursor-grabbing md:w-full md:touch-none ${
        isOver && !isDragging ? 'rounded-2xl ring-2 ring-[var(--accent)]/25' : ''
      }`}
    >
      <ProjectCard
        project={project}
        progress={progress}
        onMove={onMove}
        onDelete={onDelete}
        members={members}
        onAssignProject={onAssignProject}
        onUpdateProject={onUpdateProject}
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
  const { authenticated, user } = useAuth();
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
  const [editPassword, setEditPassword] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [showBoardPassword, setShowBoardPassword] = useState(false);
  const [transferOwnerId, setTransferOwnerId] = useState('');
  const [transferConfirm, setTransferConfirm] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [friends, setFriends] = useState<FriendOption[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestState[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestState[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showRecycleBinModal, setShowRecycleBinModal] = useState(false);
  const [memberActionState, setMemberActionState] = useState<Record<string, 'idle' | 'loading'>>({});
  const [activeDragProjectId, setActiveDragProjectId] = useState<string | null>(null);
  const [completingProjectIds, setCompletingProjectIds] = useState<Set<string>>(new Set());
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [undoProjectDeletion, setUndoProjectDeletion] = useState<UndoProjectDeletion | null>(null);
  const [deletedProjects, setDeletedProjects] = useState<DeletedProjectEntry[]>([]);
  const [recycleBinLoading, setRecycleBinLoading] = useState(false);
  const undoProjectTimerRef = useRef<number | null>(null);

  const clearUndoProjectTimer = () => {
    if (undoProjectTimerRef.current) {
      window.clearTimeout(undoProjectTimerRef.current);
      undoProjectTimerRef.current = null;
    }
  };

  const queueUndoProjectDeletion = (project: Project) => {
    clearUndoProjectTimer();
    setUndoProjectDeletion({ project });
    undoProjectTimerRef.current = window.setTimeout(() => {
      setUndoProjectDeletion(null);
      undoProjectTimerRef.current = null;
    }, 6000);
  };

  const loadRecycleBin = async () => {
    if (!board) return false;
    setRecycleBinLoading(true);
    try {
      const response = await fetch(`/api/boards/${board.id}/recycle-bin`);
      if (!response.ok) return false;
      const data = await response.json() as DeletedProjectEntry[];
      setDeletedProjects(data);
      return true;
    } finally {
      setRecycleBinLoading(false);
    }
  };

  const restoreDeletedProject = async (deletedProjectId: string) => {
    if (!board) return false;

    const response = await fetch(`/api/boards/${board.id}/recycle-bin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deletedProjectId }),
    });

    if (!response.ok) return false;

    await loadBoard();
    await loadRecycleBin();
    return true;
  };

  const permanentlyDeleteRecycleBinEntry = async (deletedProjectId: string) => {
    if (!board) return false;

    const response = await fetch(`/api/boards/${board.id}/recycle-bin/${deletedProjectId}`, {
      method: 'DELETE',
    });
    if (!response.ok) return false;

    await loadRecycleBin();
    return true;
  };

  useEffect(() => () => clearUndoProjectTimer(), []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
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
    const refresh = () => {
      void loadBoard();
    };

    const intervalMs = 3000;

    refresh();
    const poller = window.setInterval(refresh, intervalMs);
    const onVisibility = () => {
      if (!document.hidden) {
        refresh();
      }
    };
    window.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onVisibility);

    return () => {
      window.clearInterval(poller);
      window.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onVisibility);
    };
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

  const reorderProjectsInStage = (projectId: string, targetProjectId: string) => {
    const project = projects.find((item) => item.id === projectId);
    const targetProject = projects.find((item) => item.id === targetProjectId);
    if (!project || !targetProject || project.id === targetProject.id) return;

    const targetStage = targetProject.stage;
    const stageProjects = sortProjects(activeProjects.filter((item) => item.stage === targetStage));
    const currentStageProjects = project.stage === targetStage
      ? stageProjects
      : sortProjects([...stageProjects, { ...project, stage: targetStage }]);
    const oldIndex = currentStageProjects.findIndex((item) => item.id === projectId);
    const targetIndex = currentStageProjects.findIndex((item) => item.id === targetProjectId);
    if (oldIndex === -1 || targetIndex === -1) return;

    const nextProjects = [...currentStageProjects];
    const [movedProject] = nextProjects.splice(oldIndex, 1);
    nextProjects.splice(targetIndex, 0, movedProject);

    const orderedUpdates = nextProjects.map((item, index) => ({
      id: item.id,
      updates: {
        stage: targetStage,
        sortOrder: index + 1,
      },
    }));

    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.map((item) => {
          const update = orderedUpdates.find((entry) => entry.id === item.id);
          return update ? { ...item, ...update.updates } : item;
        }),
      };
    });

    for (const update of orderedUpdates) {
      void updateProject(update.id, update.updates);
    }
  };

  const handleMoveProject = (projectId: string, direction: 'forward' | 'back') => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const nextStage = direction === 'forward'
      ? getNextStage(project.stage)
      : getPreviousStage(project.stage);

    moveProjectToStage(projectId, nextStage);
  };

  const handleAssignProject = (projectId: string, userIds: string[]) => {
    patchLocalProject(projectId, { assigneeId: userIds[0] ?? null, assigneeIds: userIds });
    void updateProject(projectId, { assigneeId: userIds[0] ?? null, assigneeIds: userIds });
  };

  const handleInlineProjectUpdate = (projectId: string, updates: Partial<Project>) => {
    patchLocalProject(projectId, updates);
    void updateProject(projectId, updates);
  };

  const handleDeleteProject = async (projectId: string) => {
    const previousBoard = board;
    const deletedProject = board?.projects.find((item) => item.id === projectId);
    if (!deletedProject) return;

    setBoard((current) => {
      if (!current) return current;
      return {
        ...current,
        projects: current.projects.filter((project) => project.id !== projectId),
      };
    });

    const deleted = await deleteProject(projectId);
    if (!deleted) {
      setBoard(previousBoard);
      window.alert('Failed to delete task');
      return;
    }

    queueUndoProjectDeletion(deletedProject);
  };

  const handleUndoDeleteProject = () => {
    if (!undoProjectDeletion) return;
    const deletedProjectId = undoProjectDeletion.project.id;
    clearUndoProjectTimer();
    setUndoProjectDeletion(null);
    void (async () => {
      const restored = await restoreDeletedProject(deletedProjectId);
      if (!restored) {
        window.alert('Failed to restore task');
      }
    })();
  };

  const openRecycleBin = () => {
    setShowRecycleBinModal(true);
    void loadRecycleBin();
  };

  const handleDeleteBoard = async () => {
    if (!board?.isOwner) return;

    const confirmed = window.confirm(`Delete "${board.name}" and all of its tasks? This cannot be undone.`);
    if (!confirmed) return;

    setSettingsError('');
    try {
      const response = await fetch(`/api/boards/${board.id}`, { method: 'DELETE' });
      if (response.ok) {
        window.location.href = '/';
        return;
      }

      const data = await response.json().catch(() => ({}));
      setSettingsError(data.error || 'Failed to delete board');
    } catch (err) {
      console.error('Failed to delete board:', err);
      setSettingsError('Failed to delete board');
    }
  };

  const handleExportBoard = () => {
    if (!board?.isOwner) return;
    const link = document.createElement('a');
    link.href = `/api/boards/${board.id}/export`;
    link.download = exportFileName(board.name);
    document.body.appendChild(link);
    link.click();
    link.remove();
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

    if (targetId.startsWith('project:')) {
      reorderProjectsInStage(projectId, targetId.slice('project:'.length));
      return;
    }

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

  const handleOpenAddProject = async (stage: BoardStage) => {
    const created = await addProject(
      'Untitled task',
      '',
      stage,
      [],
      'General',
      board.id
    );

    if (!created) return;
    await loadBoard();
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
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
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
    setEditPassword('');
    setEditIsPublic(!!board.isPublic);
    setShowBoardPassword(false);
    setTransferOwnerId('');
    setTransferConfirm('');
    setSettingsError('');
    setShowRenameModal(true);
    void loadFriends();
  };

  const openMembersModal = () => {
    setShowMembersModal(true);
    if (authenticated) {
      void loadFriends();
    }
  };

  const handleSendFriendRequest = async (member: BoardMember) => {
    if (!member.friendCode) return;

    setMemberActionState((current) => ({ ...current, [member.userId]: 'loading' }));
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendCode: member.friendCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error || 'Failed to send friend request');
        return;
      }
      await loadFriends();
    } catch (error) {
      console.error('Failed to send friend request:', error);
      window.alert('Failed to send friend request');
    } finally {
      setMemberActionState((current) => ({ ...current, [member.userId]: 'idle' }));
    }
  };

  const handleRespondToFriendRequest = async (member: BoardMember, accept: boolean) => {
    const request = incomingRequests.find((entry) => entry.friendCode === member.friendCode);
    if (!request) return;

    setMemberActionState((current) => ({ ...current, [member.userId]: 'loading' }));
    try {
      const response = await fetch(`/api/friends/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        window.alert(data.error || 'Failed to update friend request');
        return;
      }
      await loadFriends();
    } catch (error) {
      console.error('Failed to update friend request:', error);
      window.alert('Failed to update friend request');
    } finally {
      setMemberActionState((current) => ({ ...current, [member.userId]: 'idle' }));
    }
  };

  const assignableMembers = board
    ? getAssignableMemberPool((board.members ?? []) as BoardMemberInfo[])
    : [];

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
              <button
                type="button"
                onClick={openMembersModal}
                className="flex -space-x-2 rounded-full transition-transform hover:scale-[1.02]"
                aria-label="Board members"
                title="Board members"
              >
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
              </button>
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
              onClick={openRecycleBin}
              aria-label="Recycle bin"
              title="Recycle bin"
              className="app-toolbar-button app-toolbar-button-neutral transition-all duration-300"
            >
              <span aria-hidden="true">🗑️</span>
            </motion.button>

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

      {undoProjectDeletion && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-full mx-auto px-6 -mt-2 mb-4"
        >
          <div className="rounded-lg border border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--foreground)] px-4 py-2 text-sm flex items-center justify-between gap-3">
            <span>Task deleted.</span>
            <button
              type="button"
              onClick={handleUndoDeleteProject}
              className="app-toolbar-button app-toolbar-button-primary px-3 py-1 text-xs h-auto"
            >
              Undo
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showRecycleBinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowRecycleBinModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Recycle Bin</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Deleted tasks stay here until you restore them or remove them permanently.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRecycleBinModal(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel)]"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {recycleBinLoading ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
                    Loading deleted tasks...
                  </div>
                ) : deletedProjects.length === 0 ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 text-sm text-[var(--muted)]">
                    The recycle bin is empty.
                  </div>
                ) : (
                  deletedProjects.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                            {entry.project.category}
                          </p>
                          <p className="mt-1 truncate text-base font-semibold text-[var(--foreground)]">
                            {entry.project.title}
                          </p>
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Deleted {new Date(entry.deletedAt).toLocaleString()}
                          </p>
                          <p className="mt-2 text-sm text-[var(--muted)]">
                            {entry.project.subtasks.length} subtasks
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            onClick={() => { void restoreDeletedProject(entry.id); }}
                            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent)]/90"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={() => { void permanentlyDeleteRecycleBinEntry(entry.id); }}
                            className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/15"
                          >
                            Delete forever
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
        {showMembersModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowMembersModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 18 }}
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-2xl rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)]">Board Members</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Send friend requests to people already working in this board.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMembersModal(false)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel)]"
                >
                  Close
                </button>
              </div>

              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {(board.members ?? []).map((member) => {
                  const state = getMemberFriendState(member, friends, incomingRequests, outgoingRequests, user?.id);
                  const isLoading = memberActionState[member.userId] === 'loading';

                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-3"
                    >
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="h-11 w-11 rounded-full"
                        />
                      ) : (
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-bold text-[var(--accent)]">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-semibold text-[var(--foreground)]">{member.name}</p>
                          {member.role === 'owner' && (
                            <span className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                              Owner
                            </span>
                          )}
                        </div>
                        {member.friendCode && (
                          <p className="mt-1 font-mono text-xs text-[var(--muted)]">{member.friendCode}</p>
                        )}
                      </div>

                      {!authenticated ? (
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
                          Sign in
                        </span>
                      ) : state === 'self' ? (
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
                          You
                        </span>
                      ) : state === 'friend' ? (
                        <span className="rounded-lg bg-[var(--accent)]/12 px-3 py-2 text-xs font-semibold text-[var(--accent)]">
                          Friends
                        </span>
                      ) : state === 'outgoing' ? (
                        <span className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium text-[var(--muted)]">
                          Pending
                        </span>
                      ) : state === 'incoming' ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => { void handleRespondToFriendRequest(member, false); }}
                            disabled={isLoading}
                            className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-[var(--panel-strong)] disabled:opacity-60"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => { void handleRespondToFriendRequest(member, true); }}
                            disabled={isLoading}
                            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-60"
                          >
                            {isLoading ? '...' : 'Accept'}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { void handleSendFriendRequest(member); }}
                          disabled={isLoading || !member.friendCode}
                          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent)]/90 disabled:opacity-60"
                        >
                          {isLoading ? '...' : 'Add friend'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                        password: editPassword ? editPassword : undefined,
                        isPublic: editIsPublic,
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
                        isPublic: updated.isPublic,
                        hasPassword: updated.hasPassword,
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
                      className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 text-center text-2xl leading-none text-[var(--foreground)] focus:border-[var(--accent)]/40 focus:outline-none"
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
                      className="mt-1 h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 text-[var(--foreground)] focus:border-[var(--accent)]/40 focus:outline-none"
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

                <div className="mb-4">
                  <label className="mb-3 flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsPublic}
                      onChange={(e) => setEditIsPublic(e.target.checked)}
                      className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    />
                    <span className="text-sm text-[var(--foreground)]">
                      🌐 Public board (listed for newcomers and open without sign-in)
                    </span>
                  </label>
                  <span className="text-xs font-semibold uppercase text-[var(--muted)]">Board Password</span>
                  <div className="mt-1 flex gap-2">
                    <input
                      type={showBoardPassword ? 'text' : 'password'}
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder={board.hasPassword ? 'Password set - enter a new password to change it' : 'Optional board password'}
                      className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)]/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBoardPassword((visible) => !visible)}
                      className="h-11 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--panel)]"
                    >
                      {showBoardPassword ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    Current passwords are stored securely and cannot be shown. Leave blank to keep the existing password.
                  </span>
                </div>

                <div className="mb-4 rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Transfer ownership</p>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        Transfer this board to an accepted friend. You will become an editor.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleExportBoard}
                      className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_18px_var(--accent-glow)] hover:bg-[var(--accent)]/90 transition-colors"
                    >
                      Export
                    </button>
                  </div>
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

                <div className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">Delete board</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">Deletes this board and its tasks permanently.</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteBoard}
                      className="shrink-0 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>

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
              const stageProjects = sortProjects(activeProjects.filter((p) => isProjectInBoardStage(p, stage.key)));

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
                          className={`flex min-h-[200px] gap-3 overflow-x-auto overscroll-x-contain rounded-2xl bg-[var(--lane-surface)] border p-4 pb-5 shadow-[inset_0_1px_0_var(--inset-highlight)] transition-colors md:block md:space-y-3 md:overflow-visible md:pb-4 ${
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
                                  onDelete={() => { void handleDeleteProject(project.id); }}
                                  members={assignableMembers as BoardMemberInfo[]}
                                  onAssignProject={(userIds) => handleAssignProject(project.id, userIds)}
                                  onUpdateProject={(updates) => handleInlineProjectUpdate(project.id, updates)}
                                  boardId={board.id}
                                  isCompleting={completingProjectIds.has(project.id)}
                                />
                              ))
                            ) : (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full text-[var(--muted)] text-xs text-center py-8"
                              >
                                Drop projects here
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </StageDropZone>
                    <button
                      type="button"
                      onClick={() => handleOpenAddProject(stage.key)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--panel)] px-4 py-3 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent-sheen)] hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]"
                    >
                      <span aria-hidden="true">+</span>
                      <span>Add task</span>
                    </button>
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
                <div className="w-[min(18rem,80vw)] cursor-grabbing drop-shadow-[0_18px_42px_rgba(17,17,17,0.18)] md:w-full">
                  <ProjectCard
                    project={activeProject}
                    progress={getProjectProgress(activeProject)}
                    onMove={() => {}}
                    onDelete={() => {}}
                    members={assignableMembers as BoardMemberInfo[]}
                    onAssignProject={undefined}
                    onUpdateProject={undefined}
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
