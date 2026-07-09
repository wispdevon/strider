'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Board {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  hasPassword: boolean;
  createdAt: string;
}

interface CreatedBoard extends Board {
  authorPin: string;
}

export default function BoardManager() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [createdBoard, setCreatedBoard] = useState<CreatedBoard | null>(null);
  const [joinError, setJoinError] = useState('');
  
  const [createForm, setCreateForm] = useState({
    name: '',
    password: ''
  });
  
  const [joinForm, setJoinForm] = useState({
    joinCode: '',
    password: ''
  });

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const response = await fetch('/api/boards');
      if (response.ok) {
        const data = await response.json();
        setBoards(data);
      }
    } catch (error) {
      console.error('Failed to load boards:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name,
          password: createForm.password || undefined
        })
      });

      if (response.ok) {
        const board = await response.json();
        setCreatedBoard(board);
        setCreateForm({ name: '', password: '' });
        setShowCreateForm(false);
        loadBoards();
      }
    } catch (error) {
      console.error('Failed to create board:', error);
    }
  };

  const handleJoinBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinForm.joinCode.trim()) return;

    setJoinError('');

    try {
      const response = await fetch('/api/boards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          joinCode: joinForm.joinCode,
          password: joinForm.password || undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        window.location.href = `/board/${data.slug}`;
      } else {
        setJoinError(data.error || 'Failed to join board');
      }
    } catch (error) {
      setJoinError('Failed to join board');
    }
  };

  if (!isLoaded) {
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

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.9)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]"
      >
        <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <p className="eyebrow text-[var(--accent)] text-[11px] tracking-[0.24em] font-semibold">Project Workspaces</p>
            <h1 className="hero-title text-[var(--foreground)] text-3xl md:text-4xl mt-1">Strider Flow</h1>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowJoinForm(!showJoinForm); setShowCreateForm(false); }}
              className="px-4 py-2 rounded-lg font-medium bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] shadow-[0_6px_14px_rgba(17,17,17,0.04)] transition-all duration-300"
            >
              Join Board
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowCreateForm(!showCreateForm); setShowJoinForm(false); }}
              className="px-4 py-2 rounded-lg font-medium bg-[var(--accent)] text-white border border-[var(--accent)] shadow-[0_8px_20px_rgba(29,31,35,0.16)] transition-all duration-300"
            >
              + New Board
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Created Board Success Modal */}
      <AnimatePresence>
        {createdBoard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
            onClick={() => setCreatedBoard(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="text-center mb-6">
                <span className="text-5xl">🎉</span>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mt-4">Board Created!</h2>
                <p className="text-[var(--muted)] mt-2">{createdBoard.name}</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[var(--panel-strong)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted)] uppercase tracking-wide mb-1">Join Code</p>
                  <p className="text-2xl font-mono font-bold text-[var(--accent)]">{createdBoard.joinCode}</p>
                  <p className="text-xs text-[var(--muted)] mt-1">Share this code with others to let them join</p>
                </div>

                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-200">
                  <p className="text-xs text-yellow-700 uppercase tracking-wide mb-1">⚠️ Author PIN (Save This!)</p>
                  <p className="text-2xl font-mono font-bold text-yellow-800">{createdBoard.authorPin}</p>
                  <p className="text-xs text-yellow-700 mt-1">Required to delete this board. Keep it safe!</p>
                </div>

                {createdBoard.hasPassword && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <p className="text-sm text-green-700">🔒 Password protected</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <Link
                  href={`/board/${createdBoard.slug}`}
                  className="flex-1 px-4 py-3 rounded-lg bg-[var(--accent)] text-white font-medium text-center hover:bg-[var(--accent)]/90 transition-colors"
                >
                  Go to Board
                </Link>
                <button
                  onClick={() => setCreatedBoard(null)}
                  className="px-4 py-3 rounded-lg bg-[var(--panel-strong)] text-[var(--foreground)] font-medium hover:bg-[var(--panel)] transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forms */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.96)] backdrop-blur-sm"
          >
            <form onSubmit={handleCreateBoard} className="max-w-5xl mx-auto px-6 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Board name"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                  required
                />
                <input
                  type="password"
                  placeholder="Password (optional)"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/95 transition-all duration-300 shadow-[0_8px_20px_rgba(29,31,35,0.16)]"
                >
                  Create Board
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}

        {showJoinForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.96)] backdrop-blur-sm"
          >
            <form onSubmit={handleJoinBoard} className="max-w-5xl mx-auto px-6 py-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="Join code (e.g., ABC123)"
                  value={joinForm.joinCode}
                  onChange={(e) => setJoinForm({ ...joinForm, joinCode: e.target.value.toUpperCase() })}
                  className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40 font-mono uppercase"
                  maxLength={6}
                  required
                />
                <input
                  type="password"
                  placeholder="Password (if required)"
                  value={joinForm.password}
                  onChange={(e) => setJoinForm({ ...joinForm, password: e.target.value })}
                  className="px-3 py-2 rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/95 transition-all duration-300 shadow-[0_8px_20px_rgba(29,31,35,0.16)]"
                >
                  Join
                </motion.button>
              </div>
              {joinError && (
                <p className="text-red-500 text-sm mt-2">{joinError}</p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Boards List */}
      <div className="max-w-5xl mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">Your Boards</h2>
          
          {boards.length === 0 ? (
            <div className="text-center py-16 rounded-2xl bg-[var(--panel)] border border-[var(--border)]">
              <p className="text-5xl mb-4">📋</p>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No boards yet</h3>
              <p className="text-[var(--muted)]">Create a new board or join one with a code</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {boards.map((board, index) => (
                  <motion.div
                    key={board.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link href={`/board/${board.slug}`}>
                      <motion.div
                        whileHover={{ scale: 1.02, y: -2 }}
                        className="rounded-xl bg-[var(--panel)] border border-[var(--border)] p-5 shadow-[0_10px_30px_rgba(17,17,17,0.05)] hover:shadow-[0_14px_40px_rgba(17,17,17,0.08)] transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-2xl">📋</span>
                          {board.hasPassword && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                              🔒 Protected
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-1">{board.name}</h3>
                        <p className="text-sm text-[var(--muted)] font-mono">Code: {board.joinCode}</p>
                      </motion.div>
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}