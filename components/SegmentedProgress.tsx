'use client';

import { motion } from 'framer-motion';
import { Subtask } from '@/lib/useProjects';

interface SegmentedProgressProps {
  subtasks: Subtask[];
}

export default function SegmentedProgress({ subtasks }: SegmentedProgressProps) {
  const total = subtasks.length;
  if (total === 0) return null;

  return (
    <div className="w-full">
      <div className="flex gap-1 h-3">
        {subtasks.map((subtask, index) => (
          <motion.div
            key={subtask.id}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            className={`flex-1 rounded-full transition-colors duration-300 ${
              subtask.done
                ? 'bg-gradient-to-r from-[var(--accent)] to-[var(--accent-sheen)]'
                : 'bg-[var(--panel-strong)]'
            }`}
            title={`${subtask.title}: ${subtask.done ? 'Done' : 'Pending'}`}
          />
        ))}
      </div>
    </div>
  );
}