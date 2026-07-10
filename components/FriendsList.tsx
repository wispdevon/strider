'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/auth-context';

interface Friend {
  id: string;
  name: string;
  friendCode: string;
  status: string;
}

interface PendingRequest {
  id: string;
  name: string;
  friendCode: string;
}

export default function FriendsList() {
  const { authenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<PendingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PendingRequest[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (isOpen && authenticated) {
      loadFriends();
    }
  }, [isOpen, authenticated]);

  if (!authenticated) return null;

  const loadFriends = async () => {
    try {
      const response = await fetch('/api/friends');
      if (response.ok) {
        const data = await response.json();
        setFriends(data.friends);
        setIncomingRequests(data.incomingRequests || []);
        setOutgoingRequests(data.outgoingRequests || []);
      }
    } catch (err) {
      console.error('Failed to load friends:', err);
    }
  };

  const addFriend = async () => {
    if (!friendCode.trim()) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendCode: friendCode.trim().toUpperCase() })
      });

      const data = await response.json();

      if (response.ok) {
        setFriendCode('');
        setSuccess(data.friend ? `Added ${data.friend.name} as friend!` : 'Friend request sent!');
        loadFriends();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to add friend');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const respondToRequest = async (requestId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/friends/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });

      if (response.ok) {
        loadFriends();
      }
    } catch (err) {
      console.error('Failed to respond to friend request:', err);
    }
  };

  const copyFriendCode = async () => {
    if (!user?.friendCode) return;
    try {
      await navigator.clipboard.writeText(user.friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy friend code:', err);
    }
  };

  const hasPendingRequests = incomingRequests.length > 0;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg font-medium bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] transition-all duration-300 text-sm relative"
      >
        👥 Friends
        {hasPendingRequests && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {incomingRequests.length}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-80 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50"
            style={{ top: '100%' }}
          >
            <div className="p-4">
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Friends</h3>
              
              {/* Your Friend Code Section */}
              <div className="mb-4 p-3 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)]">
                <p className="text-xs text-[var(--muted)] mb-1.5">Your Friend Code</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono font-semibold text-[var(--foreground)] tracking-wider">
                    {user?.friendCode || '--------'}
                  </code>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={copyFriendCode}
                    className="px-2.5 py-1 text-xs rounded-md bg-[var(--accent)]/20 text-[var(--accent)] font-medium hover:bg-[var(--accent)]/30 transition-colors"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </motion.button>
                </div>
              </div>

              {/* Add Friend Section */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter friend code..."
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--panel)] border border-[var(--border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--accent)]/40 font-mono tracking-wider"
                  onKeyDown={(e) => e.key === 'Enter' && addFriend()}
                  maxLength={8}
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={addFriend}
                  disabled={loading || !friendCode.trim()}
                  className="px-3 py-1.5 text-sm rounded-lg bg-[var(--accent)] text-white font-medium disabled:opacity-50"
                >
                  {loading ? '...' : 'Add'}
                </motion.button>
              </div>

              {error && (
                <p className="text-xs text-red-500 mb-2">{error}</p>
              )}

              {success && (
                <p className="text-xs text-green-500 mb-2">{success}</p>
              )}

              {/* Incoming Friend Requests */}
              {incomingRequests.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase">Incoming Requests</p>
                  <div className="space-y-2">
                    {incomingRequests.map((request) => (
                      <div key={request.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)]">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-[var(--foreground)] block truncate">{request.name}</span>
                          <span className="text-xs text-[var(--muted)] font-mono">{request.friendCode}</span>
                        </div>
                        <div className="flex gap-1">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => respondToRequest(request.id, true)}
                            className="px-2 py-1 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                            title="Accept"
                          >
                            ✓
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => respondToRequest(request.id, false)}
                            className="px-2 py-1 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                            title="Reject"
                          >
                            ✕
                          </motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing Friend Requests */}
              {outgoingRequests.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase">Pending Requests</p>
                  <div className="space-y-2">
                    {outgoingRequests.map((request) => (
                      <div key={request.friendCode} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)] opacity-70">
                        <div className="w-8 h-8 rounded-full bg-[var(--panel-strong)] flex items-center justify-center text-xs font-bold">
                          {request.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-[var(--foreground)] block truncate">{request.name}</span>
                          <span className="text-xs text-[var(--muted)] font-mono">{request.friendCode}</span>
                        </div>
                        <span className="text-xs text-[var(--muted)]">Waiting...</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Friends List */}
              <div>
                <p className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase">Your Friends</p>
                {friends.length === 0 && incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
                  <p className="text-sm text-[var(--muted)] text-center py-4">
                    No friends yet. Add friends by sharing your friend code!
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {friends.map((friend) => (
                      <div key={friend.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--panel-strong)]">
                        <div className="w-8 h-8 rounded-full bg-[var(--accent)]/20 flex items-center justify-center text-xs font-bold">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-[var(--foreground)]">{friend.name}</span>
                        <span className="ml-auto text-xs text-[var(--muted)] font-mono">{friend.friendCode}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}