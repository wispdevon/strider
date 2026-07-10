'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';

interface Friend {
  id: string;
  name: string;
  friendCode: string;
  status: string;
  avatar?: string;
}

interface PendingRequest {
  id: string;
  name: string;
  friendCode: string;
  avatar?: string;
}

interface BoardInvite {
  id: string;
  boardId: string;
  boardName: string;
  boardSlug: string;
  fromUserId: string;
  fromUserName: string;
  fromFriendCode: string;
  fromUserAvatar?: string;
  createdAt: string;
  fromUser?: {
    id: string;
    name: string;
    friendCode: string;
  };
  board?: {
    id: string;
    name: string;
    slug: string;
    joinCode: string;
  };
}

export default function FriendsList() {
  const { authenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [friendCode, setFriendCode] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<PendingRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<PendingRequest[]>([]);
  const [boardInvites, setBoardInvites] = useState<BoardInvite[]>([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState<'friends' | 'invites'>('friends');

  useEffect(() => {
    if (isOpen && authenticated) {
      loadFriends();
      loadBoardInvites();
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

  const loadBoardInvites = async () => {
    try {
      const response = await fetch('/api/invites');
      if (response.ok) {
        const data = await response.json();
        setBoardInvites(data);
      }
    } catch (err) {
      console.error('Failed to load board invites:', err);
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

  const respondToBoardInvite = async (inviteId: string, accept: boolean) => {
    try {
      const response = await fetch(`/api/invites/${inviteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept })
      });

      if (response.ok) {
        loadBoardInvites();
      }
    } catch (err) {
      console.error('Failed to respond to board invite:', err);
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
  const hasBoardInvites = boardInvites.length > 0;

  // Avatar component for consistent rendering
  const Avatar = ({ src, name, size = 32 }: { src?: string; name: string; size?: number }) => (
    <img
      src={src || `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#78909C"/></svg>`)}`}
      alt={name}
      style={{ width: size, height: size, borderRadius: '50%' }}
    />
  );

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 rounded-lg font-medium bg-[var(--panel)] text-[var(--foreground)] border border-[var(--border)] hover:bg-[var(--panel-strong)] transition-all duration-300 text-sm relative"
      >
        👥 Friends
        {(hasPendingRequests || hasBoardInvites) && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {incomingRequests.length + boardInvites.length}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute right-0 mt-2 w-96 bg-[var(--panel)] border border-[var(--border)] rounded-xl shadow-xl overflow-hidden z-50"
            style={{ top: '100%' }}
          >
            <div className="p-4">
              {/* Tabs */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab('friends')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === 'friends'
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'bg-[var(--panel-strong)] text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Friends & Requests
                </button>
                <button
                  onClick={() => setActiveTab('invites')}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all relative ${
                    activeTab === 'invites'
                      ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
                      : 'bg-[var(--panel-strong)] text-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  Board Invites
                  {hasBoardInvites && (
                    <span className="absolute -top-1 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {boardInvites.length}
                    </span>
                  )}
                </button>
              </div>

              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">
                {activeTab === 'friends' ? 'Friends' : 'Board Invitations'}
              </h3>
              
              {/* Your Friend Code Section - only show on friends tab */}
              {activeTab === 'friends' && (
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
              )}

              {/* Add Friend Section - only show on friends tab */}
              {activeTab === 'friends' && (
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
              )}

              {error && (
                <p className="text-xs text-red-500 mb-2">{error}</p>
              )}

              {success && (
                <p className="text-xs text-green-500 mb-2">{success}</p>
              )}

              {/* Friends Tab Content */}
              {activeTab === 'friends' && (
                <>
                  {/* Incoming Friend Requests */}
                  {incomingRequests.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-[var(--muted)] mb-2 uppercase">Incoming Requests</p>
                      <div className="space-y-2">
                        {incomingRequests.map((request) => (
                          <div key={request.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)]">
                            <Avatar src={request.avatar} name={request.name} size={32} />
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
                            <Avatar src={request.avatar} name={request.name} size={32} />
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
                            <Avatar src={friend.avatar} name={friend.name} size={32} />
                            <span className="text-sm text-[var(--foreground)]">{friend.name}</span>
                            <span className="ml-auto text-xs text-[var(--muted)] font-mono">{friend.friendCode}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Board Invites Tab Content */}
              {activeTab === 'invites' && (
                <div>
                  {!hasBoardInvites ? (
                    <p className="text-sm text-[var(--muted)] text-center py-4">
                      No board invitations yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {boardInvites.map((invite) => (
                        <div key={invite.id} className="p-3 rounded-lg bg-[var(--panel-strong)] border border-[var(--border)]">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Avatar src={invite.fromUserAvatar} name={invite.fromUserName} size={28} />
                              <div>
                                <span className="text-sm font-medium text-[var(--foreground)] block">{invite.fromUserName}</span>
                                <span className="text-xs text-[var(--muted)]">invited you to</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm font-semibold text-[var(--accent)] mb-2">{invite.boardName}</p>
                          <div className="flex gap-2">
                            <Link
                              href={`/board/${invite.boardSlug}`}
                              className="flex-1 px-3 py-1.5 text-xs text-center rounded-md bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent)]/90 transition-colors"
                            >
                              View Board
                            </Link>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => respondToBoardInvite(invite.id, true)}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-green-100 text-green-700 hover:bg-green-200"
                              title="Accept"
                            >
                              ✓
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => respondToBoardInvite(invite.id, false)}
                              className="px-2.5 py-1.5 text-xs rounded-md bg-red-100 text-red-700 hover:bg-red-200"
                              title="Decline"
                            >
                              ✕
                            </motion.button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}