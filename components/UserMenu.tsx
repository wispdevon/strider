'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';
import PasskeyLogin from './PasskeyLogin';
import ThemeToggle from './ThemeToggle';

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
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
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

  const startNameEdit = () => {
    if (!user?.canChangeUsername) return;
    setNameDraft(user.name);
    setNameError('');
    setEditingName(true);
  };

  const saveName = async () => {
    if (!nameDraft.trim() || savingName) return;
    setSavingName(true);
    setNameError('');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nameDraft.trim() }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setNameError(data.error || 'Failed to update username');
        return;
      }

      await checkSession();
      setEditingName(false);
    } catch (err) {
      setNameError('Failed to update username');
    } finally {
      setSavingName(false);
    }
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
        aria-label={user?.name ? `Open profile menu for ${user.name}` : 'Open profile menu'}
        title={user?.name || 'Profile'}
        className="w-10 h-10 inline-flex items-center justify-center rounded-full bg-[var(--panel)] border border-[var(--border)] hover:bg-[var(--panel-strong)] transition-all shadow-[0_6px_14px_rgba(17,17,17,0.04)]"
      >
        <img
          src={user?.avatar}
          alt={user?.name || 'User'}
          className="w-8 h-8 rounded-full"
        />
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
                  {editingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void saveName();
                          if (e.key === 'Escape') setEditingName(false);
                        }}
                        className="min-w-0 flex-1 px-2 py-1 rounded-md bg-[var(--panel-strong)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/50"
                        maxLength={40}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => void saveName()}
                        disabled={savingName}
                        className="px-2 py-1 rounded-md bg-[var(--accent)] text-white text-xs font-medium disabled:opacity-50"
                        title="Save username"
                      >
                        ✓
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="min-w-0 flex-1 text-sm font-medium text-[var(--foreground)] truncate">
                        {user?.name}
                      </p>
                      <button
                        type="button"
                        onClick={startNameEdit}
                        disabled={!user?.canChangeUsername}
                        className="w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--panel-strong)] disabled:opacity-35 disabled:cursor-not-allowed"
                        title={user?.canChangeUsername ? 'Change username' : 'Username can be changed once per day'}
                        aria-label="Change username"
                      >
                        ✏️
                      </button>
                    </div>
                  )}
                  {user?.email && (
                    <p className="text-xs text-[var(--muted)] truncate">{user.email}</p>
                  )}
                  {nameError && (
                    <p className="text-xs text-red-600 mt-1">{nameError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-2 space-y-1">
              <ThemeToggle variant="menu" />

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
