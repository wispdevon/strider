'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import PasskeyLogin from './PasskeyLogin';

export default function UserMenu() {
  const { authenticated, user, loading, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="w-9 h-9 rounded-full bg-[var(--panel-strong)] border border-[var(--border)] animate-pulse" />
    );
  }

  if (!authenticated) {
    return <PasskeyLogin />;
  }

  return (
    <div ref={menuRef} className="relative">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-strong)] transition-all"
      >
        <img
          src={user?.avatar}
          alt={user?.name || 'User'}
          className="w-7 h-7 rounded-full"
        />
        <span className="text-sm font-medium text-[var(--foreground)] hidden sm:inline">
          {user?.name}
        </span>
      </motion.button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 mt-2 w-56 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50"
          >
            <div className="p-3 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatar}
                  alt={user?.name || 'User'}
                  className="w-10 h-10 rounded-full"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {user?.name}
                  </p>
                  {user?.email && (
                    <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2">
              <button
                onClick={() => { logout(); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}