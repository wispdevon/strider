'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import PasskeyLogin from './PasskeyLogin';

interface AvatarOption {
  dataUri: string;
  seed: string;
}

export default function UserMenu() {
  const { authenticated, user, loading, logout, checkSession } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [avatarOptions, setAvatarOptions] = useState<AvatarOption[]>([]);
  const [rerolling, setRerolling] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowPreview(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRerollAvatar = async () => {
    if (rerolling || !user) return;
    const unlimited = user.avatarRerollsUnlimited ?? false;
    const rerollsRemaining = user.avatarRerollsRemaining ?? 0;
    if (!unlimited && rerollsRemaining <= 0) return;
    
    // Fetch avatar options
    try {
      const response = await fetch('/api/auth/avatar');
      if (response.ok) {
        const data = await response.json();
        setAvatarOptions(data.options || []);
        setShowPreview(true);
      }
    } catch (err) {
      console.error('Failed to fetch avatar options:', err);
    }
  };

  const selectOption = async (seed: string) => {
    if (!user) return;
    setRerolling(true);
    
    try {
      const response = await fetch('/api/auth/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed })
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || 'Failed to reroll avatar');
      } else {
        // Refresh session to get updated avatar
        await checkSession();
        setShowPreview(false);
        setShowMenu(false);
      }
    } catch (err) {
      alert('Failed to reroll avatar');
    }
    
    setRerolling(false);
  };

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

            <div className="p-2 space-y-1">
              <button
                onClick={handleRerollAvatar}
                disabled={rerolling || (!(user?.avatarRerollsUnlimited ?? false) && (user?.avatarRerollsRemaining ?? 0) <= 0)}
                className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--panel-strong)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
              >
                <span>Reroll Avatar</span>
                <span className="text-xs text-[var(--muted)]">
                  {(user?.avatarRerollsUnlimited ?? false) ? 'Unlimited' : `${user?.avatarRerollsRemaining ?? 0} left`}
                </span>
              </button>
              
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

      {/* Avatar Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[var(--panel)] border border-[var(--border)] rounded-xl p-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-sm font-medium text-[var(--foreground)] mb-3 text-center">
                Choose your new avatar
              </h3>
              <div className="flex gap-3 justify-center">
                {avatarOptions.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => selectOption(option.seed)}
                    disabled={rerolling}
                    className="w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border)] hover:border-[var(--accent)] transition-all disabled:opacity-50"
                  >
                    <img src={option.dataUri} alt={`Option ${index + 1}`} className="w-full h-full" />
                  </motion.button>
                ))}
              </div>
              <p className="text-xs text-[var(--muted)] mt-3 text-center">
                {(user?.avatarRerollsUnlimited ?? false) ? 'Unlimited rerolls' : `${user?.avatarRerollsRemaining ?? 0} rerolls remaining`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}