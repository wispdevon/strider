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
import { Project, Subtask, useProjects } from '@/lib/useProjects';
import { useEffect, useState } from 'react';
import SegmentedProgress from './SegmentedProgress';

const STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'planning', label: 'Plan' },
  { key: 'active', label: 'Active' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' }
];

interface ProjectDetailProps {
  slug: string;
}

interface SortableSubtaskProps {
  subtask: Subtask;
  onToggle: () => void;
}

function SortableSubtask({ subtask, onToggle }: SortableSubtaskProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-300 ${
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
        className={`w-5 h-5 rounded border-2 flex items-center justify-center font-bold transition-colors ${
          subtask.done
            ? 'bg-[#7a7c82] border-[#7a7c82] text-white'
            : 'border-[var(--muted)] hover:border-[var(--accent)]'
        }`}
      >
        {subtask.done && '✓'}
      </button>

      {/* Title */}
      <span className="flex-1 font-medium">{subtask.title}</span>
    </div>
  );
}

export default function ProjectDetail({ slug }: ProjectDetailProps) {
  const { projects, isLoaded, getProjectBySlug, toggleSubtask, updateProject, deleteProject, addSubtask, getProjectProgress } = useProjects();
  const [project, setProject] = useState<Project | null>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [showAddSubtask, setShowAddSubtask] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (isLoaded) {
      setProject(getProjectBySlug(slug) || null);
    }
  }, [isLoaded, slug, projects]);

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
  const completedSubtasks = project.subtasks.filter((s) => s.done).length;
  const currentStageIndex = STAGES.findIndex((s) => s.key === project.stage);

  const handleMoveStage = (direction: 'forward' | 'back') => {
    let newIndex = currentStageIndex;
    if (direction === 'forward') {
      newIndex = Math.min(STAGES.length - 1, currentStageIndex + 1);
    } else {
      newIndex = Math.max(0, currentStageIndex - 1);
    }
    updateProject(project.id, { stage: STAGES[newIndex].key as any });
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

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.9)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="text-[var(--accent)] hover:text-[var(--accent)]/80 text-sm font-medium transition-colors mb-3 inline-flex items-center gap-1"
          >
            ← Back to board
          </Link>
        </div>
      </motion.header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[var(--panel)] border border-[var(--border)] p-8 shadow-[0_18px_50px_rgba(17,17,17,0.06)]"
        >
          {/* Title Section */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">{project.category}</p>
              <h1 className="hero-title text-[var(--foreground)] text-4xl md:text-5xl mt-2">{project.title}</h1>
              <p className="text-[var(--muted)] mt-3 text-lg">{project.note}</p>
            </div>
          </div>

          {/* Progress Section with Segmented Bar */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mb-8 p-6 rounded-2xl bg-[var(--panel-strong)] border border-[var(--border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]"
          >
            <div className="flex justify-between items-center mb-3">
              <span className="text-[var(--foreground)] font-semibold">Overall Progress</span>
              <span className="text-2xl font-bold text-[var(--accent)]">{progress}%</span>
            </div>
            <SegmentedProgress subtasks={project.subtasks} />
            <p className="text-[var(--muted)] text-sm mt-3">
              {completedSubtasks} of {project.subtasks.length} subtasks completed
            </p>
          </motion.div>

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
            <div className="text-[var(--foreground)] font-semibold text-sm">{STAGES[currentStageIndex].label}</div>
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
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  showAddSubtask
                    ? 'bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(29,31,35,0.16)]'
                    : 'bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] shadow-[0_6px_14px_rgba(17,17,17,0.04)]'
                }`}
              >
                + Add subtask
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
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {project.subtasks.map((subtask) => (
                      <SortableSubtask
                        key={subtask.id}
                        subtask={subtask}
                        onToggle={() => toggleSubtask(project.id, subtask.id)}
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
              className="px-4 py-2 rounded-lg bg-[var(--panel)] hover:bg-[var(--panel-strong)] text-[var(--foreground)] font-medium transition-colors shadow-[0_6px_14px_rgba(17,17,17,0.04)]"
            >
              ← Move back stage
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleMoveStage('forward')}
              className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent)]/95 text-white font-medium transition-colors shadow-[0_8px_20px_rgba(29,31,35,0.16)]"
            >
              Advance stage →
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                deleteProject(project.id);
                window.location.href = '/';
              }}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 font-medium transition-colors ml-auto"
            >
              Delete workspace
            </motion.button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}