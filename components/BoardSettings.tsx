'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';

interface BoardSettingsProps {
  boardId: string;
  boardName: string;
  isOwner: boolean;
  onUpdate?: (name: string) => void;
  onDelete?: () => void;
}

export default function BoardSettings({ boardId, boardName, isOwner, onUpdate, onDelete }: BoardSettingsProps) {
  const { authenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(boardName);
  const [deletePin, setDeletePin] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    setError('');

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        onUpdate?.(name.trim());
        setIsOpen(false);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update');
      }
    } catch {
      setError('Failed to update board');
    }
  };

  const handleDelete = async () => {
    if (!deletePin) return;
    setError('');

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: deletePin }),
      });

      if (response.ok) {
        onDelete?.();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete');
      }
    } catch {
      setError('Failed to delete board');
    }
  };

  if (!authenticated || !isOwner) return null;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg font-medium bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] transition-all duration-300 text-sm"
      >
        ⚙️ Settings
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-6">Board Settings</h2>

              {/* Board Name */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Board Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/40"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleUpdateName}
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium text-sm"
                  >
                    Save
                  </motion.button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-[var(--border)] pt-6">
                <h3 className="text-sm font-semibold text-red-600 mb-3">Danger Zone</h3>
                
                {!showDeleteConfirm ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 font-medium text-sm hover:bg-red-100 transition-colors"
                  >
                    Delete Board
                  </motion.button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600">Enter the Author PIN to delete this board permanently.</p>
                    <input
                      type="password"
                      placeholder="Author PIN"
                      value={deletePin}
                      onChange={(e) => setDeletePin(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--panel)] border border-red-200 text-[var(--foreground)] focus:outline-none focus:border-red-400"
                    />
                    {error && <p className="text-sm text-red-500">{error}</p>}
                    <div className="flex gap-2">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDelete}
                        className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm"
                      >
                        Confirm Delete
                      </motion.button>
                      <button
                        onClick={() => { setShowDeleteConfirm(false); setDeletePin(''); setError(''); }}
                        className="px-4 py-2 rounded-lg bg-[var(--panel-strong)] text-[var(--foreground)] font-medium text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}