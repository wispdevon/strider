'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InviteFriendsModalProps {
  boardSlug: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Friend {
  id: string;
  name: string;
  friendCode: string;
  avatar?: string;
}

export default function InviteFriendsModal({ boardSlug, isOpen, onClose }: InviteFriendsModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [inviteStatus, setInviteStatus] = useState<Record<string, 'idle' | 'inviting' | 'invited' | 'error'>>({});

  useEffect(() => {
    if (isOpen) {
      loadFriends();
    }
  }, [isOpen]);

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const inviteFriend = async (friendCode: string) => {
    setInviteStatus(prev => ({ ...prev, [friendCode]: 'inviting' }));
    
    try {
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boardSlug, friendCode })
      });

      if (response.ok) {
        setInviteStatus(prev => ({ ...prev, [friendCode]: 'invited' }));
        setInvitedFriends(prev => new Set(prev).add(friendCode));
      } else {
        setInviteStatus(prev => ({ ...prev, [friendCode]: 'error' }));
      }
    } catch (err) {
      setInviteStatus(prev => ({ ...prev, [friendCode]: 'error' }));
    }
  };

  // Avatar component
  const Avatar = ({ src, name, size = 32 }: { src?: string; name: string; size?: number }) => (
    <img
      src={src || `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#78909C"/></svg>`)}`}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--panel)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl"
          >
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-4">Invite Friends to Board</h2>
            
            {friends.length === 0 ? (
              <p className="text-sm text-[var(--muted)] mb-4">
                No friends to invite yet. Add friends using their friend codes!
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                {friends.map((friend) => {
                  const status = inviteStatus[friend.friendCode] || 'idle';
                  return (
                    <div key={friend.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <Avatar src={friend.avatar} name={friend.name} size={32} />
                        <span className="text-sm text-[var(--foreground)]">{friend.name}</span>
                      </div>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => inviteFriend(friend.friendCode)}
                        disabled={status === 'inviting' || status === 'invited'}
                        className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                          status === 'invited'
                            ? 'bg-green-100 text-green-700'
                            : status === 'inviting'
                              ? 'bg-[var(--panel-strong)] text-[var(--muted)]'
                              : status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-[var(--accent)] text-white hover:bg-[var(--accent)]/90'
                        }`}
                      >
                        {status === 'invited' ? '✓ Invited' : status === 'inviting' ? '...' : status === 'error' ? 'Retry' : 'Invite'}
                      </motion.button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-[var(--panel-strong)] text-[var(--foreground)] font-medium hover:bg-[var(--panel)] transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}