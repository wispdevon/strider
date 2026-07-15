'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
import { useRouter, useSearchParams } from 'next/navigation';
import { Project, Subtask, useProjects, BoardMemberInfo } from '@/lib/useProjects';
import { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';
import AssigneeSelector from './AssigneeSelector';
import FriendsList from './FriendsList';
import UserMenu from './UserMenu';
import { getAssignableMemberPool } from '@/lib/virtual-assignees';

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
  onOpenDocument: () => void;
  members?: BoardMemberInfo[];
  onAssign?: (userIds: string[]) => void;
}

interface ProjectBoardInfo {
  id: string;
  name: string;
  slug: string;
}

type HostedDocumentKind = 'text' | 'csv';

interface HostedDocument {
  id: string;
  projectId: string;
  subtaskId: string;
  kind: HostedDocumentKind;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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

function SortableSubtask({ subtask, onToggle, onRename, onDelete, onOpenDocument, members, onAssign }: SortableSubtaskProps) {
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
      className={`grid min-w-[42rem] grid-cols-[auto_auto_minmax(18rem,1fr)_auto_auto_auto] items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-lg border transition-all duration-300 ${
        subtask.done
          ? 'bg-[var(--accent-soft)] border-[var(--accent-sheen)] text-[var(--foreground)]'
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
          assigneeIds={subtask.assigneeIds}
          onAssign={onAssign}
          size="sm"
        />
      )}
      {(!members || members.length === 0 || !onAssign) && <span />}
      <button
        type="button"
        onClick={onOpenDocument}
        className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors ${
          subtask.documentId
            ? 'text-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80'
            : 'text-[var(--muted)] hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)]'
        }`}
        aria-label={subtask.documentId ? `Open ${subtask.documentTitle || 'subtask document'}` : 'Add subtask document'}
        title={subtask.documentId ? subtask.documentTitle || 'Open document' : 'Add document'}
      >
        {subtask.documentKind === 'csv' ? '▦' : subtask.documentId ? '◫' : '＋'}
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 transition-colors"
        aria-label="Delete subtask"
        title="Delete subtask"
      >
        🗑️
      </button>
    </div>
  );
}

interface UndoSubtaskState {
  projectId: string;
  subtask: Subtask;
  index: number;
}

export default function ProjectDetail({ slug }: ProjectDetailProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const boardId = searchParams.get('boardId') || undefined;
  const { isLoaded, getProjectBySlug, toggleSubtask, updateProject, deleteProject, addSubtask, assignSubtask, refreshProjects, getProjectProgress } = useProjects(
    boardId,
    {
      syncIntervalMs: 1200,
      pauseWhenHidden: true
    }
  );
  const project = getProjectBySlug(slug) || null;
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);
  const [members, setMembers] = useState<BoardMemberInfo[]>([]);
  const [board, setBoard] = useState<ProjectBoardInfo | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [undoSubtaskDeletion, setUndoSubtaskDeletion] = useState<UndoSubtaskState | null>(null);
  const [editingField, setEditingField] = useState<'title' | 'category' | null>(null);
  const [headerDraft, setHeaderDraft] = useState('');
  const [documentSubtask, setDocumentSubtask] = useState<Subtask | null>(null);
  const [hostedDocument, setHostedDocument] = useState<HostedDocument | null>(null);
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentDraft, setDocumentDraft] = useState('');
  const [documentKind, setDocumentKind] = useState<HostedDocumentKind>('text');
  const [documentLoading, setDocumentLoading] = useState(false);
  const [documentSaving, setDocumentSaving] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const undoSubtaskTimerRef = useRef<number | null>(null);
  const documentFileInputRef = useRef<HTMLInputElement | null>(null);

  const clearUndoSubtaskTimer = () => {
    if (undoSubtaskTimerRef.current) {
      window.clearTimeout(undoSubtaskTimerRef.current);
      undoSubtaskTimerRef.current = null;
    }
  };

  useEffect(() => () => clearUndoSubtaskTimer(), []);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 180,
        tolerance: 10,
      },
    }),
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
            setMembers(getAssignableMemberPool(data.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              name: m.name,
              avatar: m.avatar,
              role: m.role
            }))) as BoardMemberInfo[]);
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
      window.setTimeout(async () => {
        await updateProject(project.id, { stage: 'done', completedAt: new Date().toISOString() });
        setIsCompleting(false);
        router.push(boardHref);
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

  const handleAssignProject = (userIds: string[]) => {
    updateProject(project.id, { assigneeId: userIds[0] ?? null, assigneeIds: userIds });
  };

  const handleRenameSubtask = (subtaskId: string, title: string) => {
    updateProject(project.id, {
      subtasks: project.subtasks.map((subtask) =>
        subtask.id === subtaskId ? { ...subtask, title } : subtask
      ),
    });
  };

  const startHeaderEdit = (field: 'title' | 'category') => {
    setEditingField(field);
    setHeaderDraft(field === 'title' ? project.title : project.category);
  };

  const commitHeaderEdit = () => {
    if (!editingField) return;

    const trimmed = headerDraft.trim();
    const currentValue = editingField === 'title' ? project.title : project.category;
    const nextValue = trimmed || currentValue;

    if (nextValue !== currentValue) {
      void updateProject(project.id, { [editingField]: nextValue });
    }

    setEditingField(null);
  };

  const handleUndoSubtaskDelete = () => {
    if (!project || !undoSubtaskDeletion || undoSubtaskDeletion.projectId !== project.id) return;

    clearUndoSubtaskTimer();
    const restoredSubtasks = [...project.subtasks];
    restoredSubtasks.splice(
      Math.min(Math.max(undoSubtaskDeletion.index, 0), restoredSubtasks.length),
      0,
      undoSubtaskDeletion.subtask
    );

    void updateProject(project.id, { subtasks: restoredSubtasks });
    setUndoSubtaskDeletion(null);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!project) return;

    const subtaskIndex = project.subtasks.findIndex((subtask) => subtask.id === subtaskId);
    if (subtaskIndex === -1) return;

    const deletedSubtask = project.subtasks[subtaskIndex];
    const nextSubtasks = [...project.subtasks];
    nextSubtasks.splice(subtaskIndex, 1);

    updateProject(project.id, {
      subtasks: nextSubtasks,
    });

    clearUndoSubtaskTimer();
    setUndoSubtaskDeletion({
      projectId: project.id,
      subtask: deletedSubtask,
      index: subtaskIndex,
    });
    undoSubtaskTimerRef.current = window.setTimeout(() => {
      setUndoSubtaskDeletion(null);
      undoSubtaskTimerRef.current = null;
    }, 6000);
  };

  const documentEndpoint = documentSubtask
    ? `/api/projects/${project.id}/subtasks/${documentSubtask.id}/document`
    : '';

  const openSubtaskDocument = async (subtask: Subtask) => {
    setDocumentSubtask(subtask);
    setHostedDocument(null);
    setDocumentTitle(subtask.documentTitle || `${subtask.title}.txt`);
    setDocumentKind(subtask.documentKind || 'text');
    setDocumentDraft('');
    setDocumentError('');
    setDocumentLoading(true);

    try {
      const response = await fetch(`/api/projects/${project.id}/subtasks/${subtask.id}/document`);
      if (!response.ok) throw new Error('Failed to load document');
      const data = (await response.json()) as { document: HostedDocument | null };
      if (data.document) {
        setHostedDocument(data.document);
        setDocumentTitle(data.document.title);
        setDocumentKind(data.document.kind);
        setDocumentDraft(data.document.content);
      }
    } catch {
      setDocumentError('Could not load the hosted document.');
    } finally {
      setDocumentLoading(false);
    }
  };

  const closeSubtaskDocument = () => {
    setDocumentSubtask(null);
    setHostedDocument(null);
    setDocumentError('');
  };

  const createHostedDocument = async (kind: HostedDocumentKind, title: string, content: string) => {
    if (!documentSubtask) return;

    setDocumentSaving(true);
    setDocumentError('');
    try {
      const response = await fetch(documentEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, title, content }),
      });
      if (!response.ok) throw new Error('Failed to create document');
      const data = (await response.json()) as { document: HostedDocument };
      setHostedDocument(data.document);
      setDocumentTitle(data.document.title);
      setDocumentKind(data.document.kind);
      setDocumentDraft(data.document.content);
      await refreshProjects();
    } catch {
      setDocumentError('Could not create the hosted document.');
    } finally {
      setDocumentSaving(false);
    }
  };

  const saveHostedDocument = async () => {
    if (!hostedDocument) return;

    setDocumentSaving(true);
    setDocumentError('');
    try {
      const response = await fetch(documentEndpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: documentTitle, content: documentDraft }),
      });
      if (!response.ok) throw new Error('Failed to save document');
      const data = (await response.json()) as { document: HostedDocument };
      setHostedDocument(data.document);
      setDocumentTitle(data.document.title);
      setDocumentDraft(data.document.content);
      await refreshProjects();
    } catch {
      setDocumentError('Could not save the hosted document.');
    } finally {
      setDocumentSaving(false);
    }
  };

  const deleteHostedDocument = async () => {
    if (!hostedDocument || !window.confirm('Remove this hosted document from the subtask?')) return;

    setDocumentSaving(true);
    setDocumentError('');
    try {
      const response = await fetch(documentEndpoint, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete document');
      await refreshProjects();
      closeSubtaskDocument();
    } catch {
      setDocumentError('Could not remove the hosted document.');
    } finally {
      setDocumentSaving(false);
    }
  };

  const handleDocumentFile = async (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop();
    const kind: HostedDocumentKind = extension === 'csv' || file.type.includes('csv') ? 'csv' : 'text';
    const content = await file.text();
    await createHostedDocument(kind, file.name, content);
  };

  const csvRows = documentKind === 'csv'
    ? ((Papa.parse<string[]>(documentDraft || '', { skipEmptyLines: false }).data as string[][]).filter((row) => row.length > 1 || row[0] !== ''))
    : [];
  const editableCsvRows = csvRows.length > 0 ? csvRows : [['']];
  const csvColumnCount = Math.max(1, ...editableCsvRows.map((row) => row.length));

  const updateCsvCell = (rowIndex: number, columnIndex: number, value: string) => {
    const rows = editableCsvRows.map((row) => [...row]);
    rows[rowIndex] = rows[rowIndex] || [];
    while (rows[rowIndex].length < csvColumnCount) rows[rowIndex].push('');
    rows[rowIndex][columnIndex] = value;
    setDocumentDraft(Papa.unparse(rows));
  };

  const addCsvRow = () => {
    const rows = editableCsvRows.map((row) => [...row]);
    rows.push(Array.from({ length: csvColumnCount }, () => ''));
    setDocumentDraft(Papa.unparse(rows));
  };

  const addCsvColumn = () => {
    const rows = editableCsvRows.map((row) => [...row, '']);
    setDocumentDraft(Papa.unparse(rows));
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
        {undoSubtaskDeletion && (
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="mb-4 rounded-lg border border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--foreground)] px-4 py-2 text-sm flex items-center justify-between gap-3"
          >
            <span>Subtask deleted.</span>
            <button
              type="button"
              onClick={handleUndoSubtaskDelete}
              className="app-toolbar-button app-toolbar-button-primary px-3 py-1 text-xs h-auto"
            >
              Undo
            </button>
          </motion.div>
        )}
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
              {editingField === 'category' ? (
                <input
                  value={headerDraft}
                  onChange={(event) => setHeaderDraft(event.target.value)}
                  onBlur={commitHeaderEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitHeaderEdit();
                    if (event.key === 'Escape') setEditingField(null);
                  }}
                  className="eyebrow m-0 block w-full border-0 bg-transparent p-0 text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold focus:outline-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startHeaderEdit('category')}
                  className="eyebrow m-0 block w-full border-0 bg-transparent p-0 text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold text-left"
                >
                  {project.category}
                </button>
              )}
              {editingField === 'title' ? (
                <input
                  value={headerDraft}
                  onChange={(event) => setHeaderDraft(event.target.value)}
                  onBlur={commitHeaderEdit}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitHeaderEdit();
                    if (event.key === 'Escape') setEditingField(null);
                  }}
                  className="hero-title mt-2 m-0 block w-full border-0 bg-transparent p-0 text-[var(--foreground)] text-4xl md:text-5xl focus:outline-none"
                  autoFocus
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startHeaderEdit('title')}
                  className="hero-title mt-2 m-0 block w-full border-0 bg-transparent p-0 text-[var(--foreground)] text-4xl md:text-5xl text-left"
                >
                  {project.title}
                </button>
              )}
              <p className="text-[var(--muted)] mt-3 text-lg">{project.note}</p>
            </div>
            <div className="absolute right-6 top-6 flex flex-col items-end gap-2">
              {hasMembers && (
                <AssigneeSelector
                  members={members}
                  assigneeId={project.assigneeId}
                  assigneeIds={project.assigneeIds}
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
            </div>

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
                        onOpenDocument={() => openSubtaskDocument(subtask)}
                        members={hasMembers ? members : undefined}
                        onAssign={hasMembers ? (userIds) => assignSubtask(project.id, subtask.id, userIds) : undefined}
                      />
                    ))}
                    {showAddSubtask ? (
                      <motion.form
                        key="add-subtask-form"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        onSubmit={handleAddSubtask}
                        className="flex min-w-[40rem] gap-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3 sm:p-4"
                      >
                        <input
                          type="text"
                          placeholder="Subtask title"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          autoFocus
                          className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--panel-strong)] px-3 py-2 text-[var(--foreground)] placeholder-[var(--muted)] focus:border-[var(--accent)]/40 focus:outline-none"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="submit"
                          className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white shadow-[0_8px_20px_rgba(29,31,35,0.16)] transition-all duration-300 hover:bg-[var(--accent)]/95"
                        >
                          Add
                        </motion.button>
                      </motion.form>
                    ) : (
                      <motion.button
                        key="add-subtask-button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => setShowAddSubtask(true)}
                        aria-label="Add subtask"
                        title="Add subtask"
                        className="flex min-w-[40rem] items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--panel)] px-3 py-3 text-left font-medium text-[var(--muted)] transition-colors hover:border-[var(--accent-sheen)] hover:bg-[var(--panel-strong)] hover:text-[var(--foreground)] sm:px-4"
                      >
                        <span aria-hidden="true">+</span>
                        <span>Add subtask</span>
                      </motion.button>
                    )}
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
              onClick={async () => {
                if (!confirmingDelete) {
                  setConfirmingDelete(true);
                  window.setTimeout(() => setConfirmingDelete(false), 3500);
                  return;
                }

                setIsDeleting(true);
                const deleted = await deleteProject(project.id);
                setIsDeleting(false);
                if (!deleted) {
                  window.alert('Failed to delete task');
                  return;
                }

                router.push(boardHref);
              }}
              disabled={isDeleting}
              aria-label={confirmingDelete ? 'Confirm delete task' : 'Delete task'}
              title={confirmingDelete ? 'Confirm delete task' : 'Delete task'}
              className="app-toolbar-button app-toolbar-button-danger transition-colors ml-auto"
            >
              <span aria-hidden="true">🔥</span>
              <span className="hidden sm:inline">
                {isDeleting ? 'Deleting...' : confirmingDelete ? 'Confirm delete' : 'Delete task'}
              </span>
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      <AnimatePresence>
        {documentSubtask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            onClick={closeSubtaskDocument}
          >
            <motion.div
              initial={{ y: 18, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 18, scale: 0.98, opacity: 0 }}
              onClick={(event) => event.stopPropagation()}
              className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--panel)] shadow-2xl"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
                <div className="min-w-0">
                  <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">
                    {documentSubtask.title}
                  </p>
                  <input
                    value={documentTitle}
                    onChange={(event) => setDocumentTitle(event.target.value)}
                    disabled={!hostedDocument || documentSaving}
                    className="mt-1 w-full border-0 bg-transparent p-0 text-xl font-semibold text-[var(--foreground)] focus:outline-none disabled:opacity-70"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeSubtaskDocument}
                  className="app-toolbar-button app-toolbar-button-neutral h-9 w-9 px-0"
                  aria-label="Close document"
                  title="Close"
                >
                  ×
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-auto p-5">
                {documentError && (
                  <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                    {documentError}
                  </div>
                )}

                {documentLoading ? (
                  <div className="py-16 text-center text-[var(--muted)]">Loading...</div>
                ) : !hostedDocument ? (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => createHostedDocument('text', `${documentSubtask.title}.txt`, '')}
                      disabled={documentSaving}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-5 text-left transition-colors hover:border-[var(--accent-sheen)] disabled:opacity-60"
                    >
                      <span className="block text-2xl">◫</span>
                      <span className="mt-3 block font-semibold text-[var(--foreground)]">Text document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => createHostedDocument('csv', `${documentSubtask.title}.csv`, '')}
                      disabled={documentSaving}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-5 text-left transition-colors hover:border-[var(--accent-sheen)] disabled:opacity-60"
                    >
                      <span className="block text-2xl">▦</span>
                      <span className="mt-3 block font-semibold text-[var(--foreground)]">CSV sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => documentFileInputRef.current?.click()}
                      disabled={documentSaving}
                      className="rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-5 text-left transition-colors hover:border-[var(--accent-sheen)] disabled:opacity-60"
                    >
                      <span className="block text-2xl">↥</span>
                      <span className="mt-3 block font-semibold text-[var(--foreground)]">Upload file</span>
                    </button>
                    <input
                      ref={documentFileInputRef}
                      type="file"
                      accept=".txt,.csv,text/plain,text/csv"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void handleDocumentFile(file);
                      }}
                    />
                  </div>
                ) : documentKind === 'csv' ? (
                  <div className="space-y-4">
                    <div className="overflow-auto rounded-xl border border-[var(--border)]">
                      <table className="min-w-full border-collapse text-sm">
                        <tbody>
                          {editableCsvRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-b border-[var(--border)] last:border-b-0">
                              {Array.from({ length: csvColumnCount }).map((_, columnIndex) => (
                                <td key={columnIndex} className="min-w-36 border-r border-[var(--border)] last:border-r-0">
                                  <input
                                    value={row[columnIndex] ?? ''}
                                    onChange={(event) => updateCsvCell(rowIndex, columnIndex, event.target.value)}
                                    className="block w-full border-0 bg-transparent px-3 py-2 text-[var(--foreground)] focus:bg-[var(--panel-strong)] focus:outline-none"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={addCsvRow} className="app-toolbar-button app-toolbar-button-neutral">
                        + Row
                      </button>
                      <button type="button" onClick={addCsvColumn} className="app-toolbar-button app-toolbar-button-neutral">
                        + Column
                      </button>
                    </div>
                  </div>
                ) : (
                  <textarea
                    value={documentDraft}
                    onChange={(event) => setDocumentDraft(event.target.value)}
                    className="min-h-[24rem] w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--panel-strong)] p-4 font-mono text-sm leading-6 text-[var(--foreground)] focus:border-[var(--accent)]/40 focus:outline-none"
                    spellCheck={false}
                  />
                )}
              </div>

              {hostedDocument && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4">
                  <p className="text-xs text-[var(--muted)]">
                    Updated {new Date(hostedDocument.updatedAt).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={deleteHostedDocument}
                      disabled={documentSaving}
                      className="app-toolbar-button app-toolbar-button-danger"
                    >
                      Remove
                    </button>
                    <button
                      type="button"
                      onClick={saveHostedDocument}
                      disabled={documentSaving}
                      className="app-toolbar-button app-toolbar-button-primary"
                    >
                      {documentSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
