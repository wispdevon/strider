/**
 * Database layer - re-exports all functions for backward compatibility
 * 
 * New modular structure:
 * - lib/types.ts - All TypeScript interfaces
 * - lib/db-core.ts - Database connection, schema, helpers
 * - lib/users.ts - User and passkey functions
 * - lib/boards.ts - Board CRUD functions
 * - lib/projects.ts - Project CRUD functions
 * 
 * This file exists to maintain existing imports that use 'lib/db'.
 */

// Re-export all types
export type { Subtask, Project, Board, BoardWithProjects, User, PasskeyCredential, BoardRow, ProjectRow, UserRow, PasskeyRow, BoardMember, BoardMemberRow, Friendship, FriendshipRow } from './types';

// Re-export core functions
export { getDb, generateCode, generatePin, hashPassword } from './db-core';

// Re-export user functions
export { createUser, getUserById, getUserByFriendCode, savePasskeyCredential, getPasskeyByCredentialId, updatePasskeyCounter, getPasskeysByUserId, createFriendship, getFriendsByUserId, getIncomingFriendRequests, getOutgoingFriendRequests, acceptFriendship, rejectFriendship, cancelOutgoingFriendship, updateFriendshipStatus, deleteFriendship } from './users';

// Re-export board functions
export { getAllBoards, getBoardsByOwnerId, getBoardBySlug, getBoardByJoinCode, createBoard, updateBoard, verifyBoardPassword, verifyAuthorPin, deleteBoard, addBoardMember, getBoardMembers, removeBoardMember, isBoardMember, createBoardInvite, getBoardInvitesToUser, getBoardInvitesFromUser, acceptBoardInvite, declineBoardInvite, cancelBoardInvite, isInvitedToBoard } from './boards';

// Re-export project functions
export { getProjectsByBoardId, getAllProjects, createProject, updateProject, toggleSubtask, deleteProject, deleteSubtask, assignProject, assignSubtask } from './projects';