'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Project, Subtask, useProjects, BoardMemberInfo } from '@/lib/useProjects';
import { useEffect, useState } from 'react';
import AssigneeSelector from './AssigneeSelector';
import FriendsList from './FriendsList';
import UserMenu from './UserMenu';

const STAGES = [
  { key: 'planning', label: 'Plan' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' }
];

interface ProjectDetailProps {
  slug: string;
}

interface SortableSubtaskProps {
  subtask: Subtask;
  onToggle: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
  members?: BoardMemberInfo[];
  onAssign?: (userId: string | null) => void;
}

interface ProjectBoardInfo {
  id: string;
  name: string;
  slug: string;
}

function getNextStage(stage: Project['stage']): Project['stage'] {
  if (stage === 'idea' || stage === 'planning') return 'active';
  if (stage === 'active') return 'review';
  if (stage === 'review') return 'done';
  return 'done';
}

function getPreviousStage(stage: Project['stage']): Project['stage'] {
  if (stage === 'review') return 'active';
  if (stage === 'active') return 'planning';
  return stage;
}

function getStageBarIndex(stage: Project['stage']) {
  if (stage === 'active') return 1;
  if (stage === 'review' || stage === 'done') return 2;
  return 0;
}

function getStageLabel(stage: Project['stage']) {
  if (stage === 'done') return 'Done';
  return STAGES[getStageBarIndex(stage)].label;
}

function SortableSubtask({ subtask, onToggle, onRename, onDelete, members, onAssign }: SortableSubtaskProps) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(subtask.title);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setTitleDraft(subtask.title);
      setEditing(false);
      return;
    }

    if (trimmed !== subtask.title) {
      onRename(trimmed);
    }
    setEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`grid min-w-[40rem] grid-cols-[auto_auto_minmax(18rem,1fr)_auto_auto] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg border transition-all duration-300 ${
        subtask.done
          ? 'bg-[#ecebe7] border-[#b3b2ae] text-[#3f3f3f]'
          : 'bg-[var(--panel)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--panel-strong)]'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[var(--muted)] hover:text-[var(--foreground)] p-1"
        aria-label="Drag to reorder"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="4" r="1.5" />
          <circle cx="11" cy="4" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="11" cy="12" r="1.5" />
        </svg>
      </button>

      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center font-bold transition-colors shrink-0 ${
          subtask.done
            ? 'bg-[#7a7c82] border-[#7a7c82] text-white'
            : 'border-[var(--muted)] hover:border-[var(--accent)]'
        }`}
      >
        {subtask.done && '✅'}
      </button>

      {/* Title */}
      {editing ? (
        <input
          value={titleDraft}
          onChange={(event) => setTitleDraft(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={(event) => {
            if (event.key === 'Enter') saveTitle();
            if (event.key === 'Escape') {
              setTitleDraft(subtask.title);
              setEditing(false);
            }
          }}
          className="min-w-0 w-full px-2 py-1 rounded-md bg-[var(--panel-strong)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/50"
          autoFocus
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setTitleDraft(subtask.title);
            setEditing(true);
          }}
          className="min-w-0 text-left font-medium leading-snug break-words pr-1 hover:text-[var(--accent)] transition-colors"
          title="Rename subtask"
        >
          {subtask.title}
        </button>
      )}

      {/* Assignee selector */}
      {members && members.length > 0 && onAssign && (
        <AssigneeSelector
          members={members}
          assigneeId={subtask.assigneeId}
          onAssign={onAssign}
          size="sm"
        />
      )}
      {(!members || members.length === 0 || !onAssign) && <span />}
      <button
        type="button"
        onClick={onDelete}
        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
        aria-label="Delete subtask"
        title="Delete subtask"
      >
        🔥
      </button>
    </div>
  );
}

export default function ProjectDetail({ slug }: ProjectDetailProps) {
  const searchParams = useSearchParams();
  const boardId = searchParams.get('boardId') || undefined;
  const { isLoaded, getProjectBySlug, toggleSubtask, updateProject, deleteProject, addSubtask, assignSubtask, getProjectProgress } = useProjects(boardId);
  const project = getProjectBySlug(slug) || null;
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [members, setMembers] = useState<BoardMemberInfo[]>([]);
  const [board, setBoard] = useState<ProjectBoardInfo | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch board members when project is loaded
  useEffect(() => {
    if (project?.boardId) {
      fetch(`/api/boards/${project.boardId}`)
        .then(res => res.ok ? res.json() : null)
        .then((data: {
          id?: string;
          name?: string;
          slug?: string;
          members?: Array<{ id: string; userId: string; name: string; avatar: string | null; role: string }>;
        } | null) => {
          if (data?.id && data.name && data.slug) {
            setBoard({ id: data.id, name: data.name, slug: data.slug });
          }
          if (data?.members) {
            setMembers(data.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              name: m.name,
              avatar: m.avatar,
              role: m.role
            })));
          }
        })
        .catch(() => {});
    }
  }, [project?.boardId]);

  if (!isLoaded || !project) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
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

  const progress = getProjectProgress(project);
  const currentStageIndex = getStageBarIndex(project.stage);
  const hasMembers = members.length > 0;
  const boardHref = board?.slug ? `/board/${board.slug}` : project.boardId ? `/board/${project.boardId}` : '/';

  const handleMoveStage = (direction: 'forward' | 'back') => {
    const nextStage = direction === 'forward'
      ? getNextStage(project.stage)
      : getPreviousStage(project.stage);

    if (nextStage === project.stage) return;

    if (nextStage === 'done') {
      setIsCompleting(true);
      window.setTimeout(() => {
        updateProject(project.id, { stage: 'done', completedAt: new Date().toISOString() });
        setIsCompleting(false);
      }, 620);
      return;
    }

    updateProject(project.id, { stage: nextStage });
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim()) return;
    addSubtask(project.id, newSubtaskTitle.trim());
    setNewSubtaskTitle('');
    setShowAddSubtask(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = project.subtasks.findIndex((s) => s.id === active.id);
      const newIndex = project.subtasks.findIndex((s) => s.id === over.id);
      const newSubtasks = arrayMove(project.subtasks, oldIndex, newIndex);
      updateProject(project.id, { subtasks: newSubtasks });
    }
  };

  const handleAssignProject = (userId: string | null) => {
    updateProject(project.id, { assigneeId: userId });
  };

  const handleRenameSubtask = (subtaskId: string, title: string) => {
    updateProject(project.id, {
      subtasks: project.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, title } : subtask
      ),
    });
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    updateProject(project.id, {
      subtasks: project.subtasks.filter((subtask) => subtask.id !== subtaskId),
    });
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[var(--header-surface)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-3">
          <Link
            href={boardHref}
            aria-label={board?.name ? `Back to ${board.name}` : 'Back to board'}
            title={board?.name ? `Back to ${board.name}` : 'Back to board'}
            className="app-toolbar-button app-toolbar-button-neutral transition-all duration-300"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back to board</span>
          </Link>
          <div className="flex items-center gap-3">
            <FriendsList />
            <UserMenu />
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isCompleting ? {
            opacity: 0,
            y: -44,
            scale: 0.96,
            filter: 'blur(1px) saturate(1.35)',
          } : { opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: isCompleting ? 0.62 : 0.3 }}
          className="relative overflow-hidden rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-8 shadow-[0_18px_50px_rgba(17,17,17,0.06)]"
        >
          {isCompleting && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: '-20%', opacity: [0, 1, 0.9] }}
              transition={{ duration: 0.62, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-x-0 bottom-0 h-52 bg-[radial-gradient(circle_at_18%_86%,rgba(255,232,112,0.95)_0_10%,transparent_22%),radial-gradient(circle_at_38%_78%,rgba(251,146,60,0.92)_0_16%,transparent_30%),radial-gradient(circle_at_62%_86%,rgba(239,68,68,0.84)_0_15%,transparent_29%),radial-gradient(circle_at_82%_80%,rgba(249,115,22,0.88)_0_13%,transparent_26%)]"
            />
          )}
          {/* Title Section */}
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1 pr-20">
              <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">{project.category}</p>
              <h1 className="hero-title text-[var(--foreground)] text-4xl md:text-5xl mt-2">{project.title}</h1>
              <p className="text-[var(--muted)] mt-3 text-lg">{project.note}</p>
            </div>
            <div className="absolute right-6 top-6 flex flex-col items-end gap-2">
              {hasMembers && (
                <AssigneeSelector
                  members={members}
                  assigneeId={project.assigneeId}
                  onAssign={handleAssignProject}
                  size="md"
                  label="Assign"
                />
              )}
              <p className="text-2xl font-bold leading-none text-[var(--accent)]">{progress}%</p>
            </div>
          </div>

          {/* Stage Controls */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8 flex gap-3 items-center"
          >
            <div className="flex-1 flex items-center gap-2">
              {STAGES.map((stage, index) => (
                <motion.div
                  key={stage.key}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    index <= currentStageIndex
                      ? 'bg-gradient-to-r from-[var(--accent)] via-[#2b2f35] to-[var(--accent-sheen)]'
                      : 'bg-[var(--panel-strong)]'
                  }`}
                />
              ))}
            </div>
            <div className="text-[var(--foreground)] font-semibold text-sm">{getStageLabel(project.stage)}</div>
          </motion.div>

          {/* Subtasks Section with Drag and Drop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="section-heading text-[var(--foreground)] text-xl">Subtasks</h2>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowAddSubtask(!showAddSubtask)}
                aria-label="Add subtask"
                title="Add subtask"
                className={`app-toolbar-button transition-all duration-300 ${
                  showAddSubtask
                    ? 'app-toolbar-button-primary'
                    : 'app-toolbar-button-neutral'
                }`}
              >
                <span aria-hidden="true">+</span>
                <span className="hidden sm:inline">Add subtask</span>
              </motion.button>
            </div>

            {/* Add Subtask Form */}
            <AnimatePresence>
              {showAddSubtask && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleAddSubtask}
                  className="mb-4 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Subtask title"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    autoFocus
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/95 transition-all duration-300 shadow-[0_8px_20px_rgba(29,31,35,0.16)]"
                  >
                    Add
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Draggable Subtasks List */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={project.subtasks.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2 overflow-x-auto overscroll-x-contain pb-2">
                  <AnimatePresence mode="popLayout">
                    {project.subtasks.map((subtask) => (
                      <SortableSubtask
                        key={subtask.id}
                        subtask={subtask}
                        onToggle={() => toggleSubtask(project.id, subtask.id)}
                        onRename={(title) => handleRenameSubtask(subtask.id, title)}
                        onDelete={() => handleDeleteSubtask(subtask.id)}
                        members={hasMembers ? members : undefined}
                        onAssign={hasMembers ? (userId) => assignSubtask(project.id, subtask.id, userId) : undefined}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex gap-3 flex-wrap"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoveStage('back')}
              disabled={project.stage === 'idea' || project.stage === 'planning' || isCompleting}
              aria-label="Back"
              title="Back"
              className="app-toolbar-button app-toolbar-button-neutral transition-colors"
            >
              <span aria-hidden="true">←</span>
              <span className="hidden sm:inline">Back</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoveStage('forward')}
              disabled={isCompleting}
              aria-label={project.stage === 'review' ? 'Complete project' : 'Advance'}
              title={project.stage === 'review' ? 'Complete project' : 'Advance'}
              className="app-toolbar-button app-toolbar-button-primary transition-colors"
            >
              <span className="hidden sm:inline">{project.stage === 'review' ? 'Complete project' : 'Advance'}</span>
              <span aria-hidden="true">{project.stage === 'review' ? '🔥' : '→'}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!confirmingDelete) {
                  setConfirmingDelete(true);
                  window.setTimeout(() => setConfirmingDelete(false), 3500);
                  return;
                }

                deleteProject(project.id);
                window.location.href = boardHref;
              }}
              aria-label={confirmingDelete ? 'Confirm delete task' : 'Delete task'}
              title={confirmingDelete ? 'Confirm delete task' : 'Delete task'}
              className="app-toolbar-button app-toolbar-button-danger transition-colors ml-auto"
            >
              <span aria-hidden="true">🔥</span>
              <span className="hidden sm:inline">{confirmingDelete ? 'Confirm delete' : 'Delete task'}</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
