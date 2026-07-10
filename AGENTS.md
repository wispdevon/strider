<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know
This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Strider - Project Context

Kanban project management app. Next.js 16.2.10 (App Router), React 19.2.4, TypeScript, Tailwind CSS 4 (@tailwindcss/postcss), SQLite (better-sqlite3, `data/strider.sqlite`), framer-motion 12, @dnd-kit/core+sortable.

## Agent Behavior
- If a command fails due to insufficient permissions, you must elevate the command to the user for approval.

## Structure
```
app/                          # Next.js App Router
  page.tsx                    # Redirects to /board/my-workspace
  layout.tsx, globals.css
  api/boards/                 # GET/POST/PUT list+create+join | [id] GET/PUT/DELETE
  api/projects/               # GET/POST list+create | [id] GET/PUT/DELETE/PATCH(toggle subtask)
  api/projects/[id]/subtasks/[subtaskId]/  # DELETE subtask
  api/auth/{login,register,logout,session}/ # Passkey WebAuthn auth
  api/auth/avatar/            # POST save seed, GET preview options | reset/ admin reset
  api/friends/                # GET/POST list+send request | [id] PUT/DELETE accept/reject/cancel
  api/invites/                # GET/POST board invites
  board/[slug]/page.tsx       # Board kanban view
  project/[slug]/page.tsx     # Project detail
  hall-of-fame/page.tsx       # Completed projects
components/
  BoardManager.tsx            # Board list, create/join UI
  BoardView.tsx               # Kanban: Plan/Active/Review columns
  ProjectCard.tsx             # Card in kanban
  ProjectDetail.tsx           # Full project + subtask management
  HallOfFame.tsx              # Completed projects grid
  SegmentedProgress.tsx       # Subtask progress bar
  GlobalHeader.tsx, UserMenu.tsx, PasskeyLogin.tsx
  FriendsList.tsx, InviteFriendsModal.tsx, AssigneeSelector.tsx
  ProjectBoard.tsx            # Legacy single-board kanban (unused)
context/auth-context.tsx      # AuthProvider + useAuth hook
lib/
  types.ts                    # All interfaces + DB row types
  db-core.ts                  # getDb(), schema, migrations, generateCode/Pin, hashPassword
  users.ts                    # User CRUD, passkeys, friendships, avatar rerolls
  boards.ts                   # Board CRUD, members, invites
  projects.ts                 # Project CRUD, subtasks, assignments
  db.ts                       # Re-exports all above (use for imports)
  auth.ts                     # WebAuthn registration/verification (simplewebauthn)
  session.ts                  # Cookie-based sessions (createSession/getSession/destroySession)
  avatar.ts                   # Deterministic SVG avatar generator (beam/marble/pixel/ring/sunset)
  username.ts                 # Random username generator
  useProjects.ts              # React hook for project data fetching
```

## Types (lib/types.ts)
```typescript
Subtask { id, title, done }
Project { id, slug, title, note, stage: 'idea'|'planning'|'active'|'review'|'done', category, subtasks: Subtask[], boardId }
Board { id, name, slug, joinCode, passwordHash: string|null, authorPin, ownerId: string|null, createdAt }
BoardWithProjects extends Board { projects: Project[] }
User { id, name, email: string|null, createdAt }  // also friendCode in DB
PasskeyCredential { id, userId, credentialId, publicKey, counter, deviceType, backedUp, transports: string|null, createdAt }
Session { id, userId, expiresAt }
BoardMember { id, boardId, userId, role, joinedAt }
Friendship { id, userId, friendId, status: 'pending'|'accepted'|'rejected', createdAt }
BoardInvite { id, boardId, inviterId, inviteeId, status: 'pending'|'accepted'|'declined', createdAt }
```

## Key DB Functions (import from lib/db)
- `getDb()` → SQLite singleton
- Users: `createUser, getUserById, getUserByFriendCode`
- Passkeys: `savePasskeyCredential, getPasskeyByCredentialId, updatePasskeyCounter, getPasskeysByUserId`
- Friends: `createFriendship, getFriendsByUserId, getIncomingFriendRequests, getOutgoingFriendRequests, acceptFriendship, rejectFriendship, cancelOutgoingFriendship, updateFriendshipStatus, deleteFriendship`
- Avatar: `getAvatarRerolls, incrementAvatarReroll, getAvatarSeed, setAvatarSeed, hasUnlimitedRerolls, getAvatarRerollsRemaining, MAX_DAILY_REROLLS`
- Boards: `getAllBoards, getBoardsByOwnerId, getBoardBySlug, getBoardByJoinCode, createBoard, updateBoard, verifyBoardPassword, verifyAuthorPin, deleteBoard`
- Board members: `addBoardMember, getBoardMembers, removeBoardMember, isBoardMember`
- Board invites: `createBoardInvite, getBoardInvitesToUser, getBoardInvitesFromUser, acceptBoardInvite, declineBoardInvite, cancelBoardInvite, isInvitedToBoard`
- Projects: `getProjectsByBoardId, getAllProjects, createProject, updateProject, toggleSubtask, deleteProject, deleteSubtask, assignProject, assignSubtask`

## Patterns
- **IDs:** `board-{ts}`, `project-{ts}`, `user-{ts}-{rand}`
- **Slugs:** lowercased, hyphenated title + timestamp suffix
- **Join codes:** 6-char alphanumeric (no 0/O/1/I/L)
- **Author PIN:** 6-digit numeric
- **Passwords:** SHA-256
- **Subtasks:** JSON array in SQLite TEXT column
- **Default board:** "My Workspace" (slug: `my-workspace`, joinCode: `DEFAULT1`, pin: `123456`)
- **Stage flow:** idea → planning → active → review → done
- **Kanban columns:** Plan (idea+planning), Active (active), Review (review). Done → Hall of Fame.

## Commit Style
- Use Conventional Commit-style subjects: `feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`.
- Keep the type lower-case, followed by a concise imperative summary.
- For larger commits, add a short bullet body after a blank line; bullets start with `- ` and summarize concrete changes.
- Prefer focused commits grouped by purpose, e.g. code hardening separately from deployment docs.
- Example:
  ```text
  fix: harden public API endpoints

  - Enforce board-scoped read/write authorization for project APIs
  - Scope board invites to the recipient/sender and accepted friends
  - Add same-origin API mutation guard and broader rate limits
  ```
