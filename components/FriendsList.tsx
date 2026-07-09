'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';

export default function FriendsList() {
  const { authenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [friends, setFriends] = useState<Array<{ id: string; name: string; status: string }>>([]);

  if (!authenticated) return null;

  const addFriend = async () => {
    if (!friendCode.trim()) return;
    // TODO: Implement friend adding via API
    setFriendCode('');
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg font-medium bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] transition-all duration-300 text-sm"
      >
        👥 Friends
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-72 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50"
            style={{ top: '100%' }}
          >
            <div className="p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Friends</h3>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter friend code..."
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40"
                  onKeyDown={(e) => e.key === 'Enter' && addFriend()}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addFriend}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white font-medium"
                >
                  Add
                </motion.button>
              </div>

              {friends.length === 0 ? (
                <p className="text-sm text-[var(--muted)] text-center py-4">
                  No friends yet. Add friends by sharing your friend code!
                </p>
              ) : (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div key={friend.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--panel-strong)]">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold">
                        {friend.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-[var(--foreground)]">{friend.name}</span>
                      <span className="ml-auto text-xs text-[var(--muted)]">{friend.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}