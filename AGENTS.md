<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Strider - Project Context for AI Assistants

## Overview
Strider is a project management app with kanban-style boards. Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and SQLite (better-sqlite3).

## Tech Stack
- **Framework:** Next.js 16.2.10 (App Router)
- **React:** 19.2.4
- **Styling:** Tailwind CSS 4 with @tailwindcss/postcss
- **Database:** SQLite via better-sqlite3 (stored in `data/strider.sqlite`)
- **Animations:** framer-motion 12
- **Drag & Drop:** @dnd-kit/core, @dnd-kit/sortable

## Project Structure
```
app/
├── page.tsx              # Home - redirects to /board/my-workspace
├── layout.tsx            # Root layout with metadata
├── globals.css           # Global styles
├── api/
│   ├── boards/
│   │   ├── route.ts      # GET (list), POST (create), PUT (join)
│   │   └── [id]/route.ts # GET, PUT (update), DELETE
│   └── projects/
│       ├── route.ts      # GET (list all), POST (create)
│       └── [id]/route.ts # GET, PUT (update), DELETE, PATCH (toggle subtask)
├── board/[slug]/page.tsx # Board view page
├── project/[slug]/page.tsx # Project detail page
└── hall-of-fame/page.tsx # Completed projects view

components/
├── BoardManager.tsx      # Board list, create/join UI (home page content)
├── BoardView.tsx         # Kanban board with 3 columns (Plan/Active/Review)
├── ProjectBoard.tsx      # Legacy single-board kanban (unused?)
├── ProjectCard.tsx       # Card component for project in kanban
├── ProjectDetail.tsx     # Full project view with subtask management
├── HallOfFame.tsx        # Grid of completed projects
└── SegmentedProgress.tsx # Progress bar showing subtask completion

lib/
├── db.ts                 # Database layer - all types, schema, CRUD functions
└── useProjects.ts        # React hook for project data fetching
```

## Database Schema & Types

### Core Types (from lib/db.ts)
```typescript
interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

interface Project {
  id: string;
  slug: string;
  title: string;
  note: string;
  stage: 'idea' | 'planning' | 'active' | 'review' | 'done';
  category: string;
  subtasks: Subtask[];
  boardId: string;
}

interface Board {
  id: string;
  name: string;
  slug: string;
  joinCode: string;
  passwordHash: string | null;
  authorPin: string;
  ownerId: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
  transports: string | null;
  createdAt: string;
}
```

### Database Functions (lib/db.ts exports)
```typescript
// Database access
getDb(): Database

// Users
createUser(name: string, email?: string): User
getUserById(id: string): User | null

// Passkeys
savePasskeyCredential(input): PasskeyCredential
getPasskeyByCredentialId(credentialId: string): PasskeyCredential | null
updatePasskeyCounter(credentialId: string, counter: number): void
getPasskeysByUserId(userId: string): PasskeyCredential[]

// Boards
getAllBoards(): Board[]
getBoardsByOwnerId(ownerId: string): Board[]
getBoardBySlug(slug: string): BoardWithProjects | null
getBoardByJoinCode(joinCode: string): Board | null
createBoard(input: { name, password?, ownerId? }): Board & { authorPin }
updateBoard(id: string, updates: { name?, password? }): Board | null
verifyBoardPassword(joinCode: string, password: string): boolean
verifyAuthorPin(boardId: string, pin: string): boolean
deleteBoard(boardId: string, pin: string): boolean

// Projects
getProjectsByBoardId(boardId: string): Project[]
getAllProjects(): Project[]
createProject(input: { title, note, stage, subtasks, category, boardId }): Project
updateProject(id: string, updates: Partial<Project>): Project | null
toggleSubtask(projectId: string, subtaskId: string): Project | null
deleteProject(id: string): void
deleteSubtask(projectId: string, subtaskId: string): Project | null
```

## API Routes

### /api/boards
| Method | Purpose | Request Body | Response |
|--------|---------|--------------|----------|
| GET | List all boards | - | Board[] (stripped of sensitive fields) |
| POST | Create board | `{ name, password? }` | Board with authorPin |
| PUT | Join by code | `{ joinCode, password? }` | Board or 401/404 |

### /api/boards/[id]
| Method | Purpose | Request Body | Response |
|--------|---------|--------------|----------|
| GET | Get board | - | Board with projects |
| PUT | Update board | `{ name?, password? }` | Updated Board |
| DELETE | Delete board | `{ pin }` | Success/error |

### /api/projects
| Method | Purpose | Request Body | Response |
|--------|---------|--------------|----------|
| GET | List all projects | - | Project[] |
| POST | Create project | `{ title, note, stage, subtasks, category, boardId }` | Project |

### /api/projects/[id]
| Method | Purpose | Request Body | Response |
|--------|---------|--------------|----------|
| GET | Get project | - | Project |
| PUT | Update project | Partial<Project> | Project |
| DELETE | Delete project | - | Success |
| PATCH | Toggle subtask | `{ subtaskId }` | Project |

## Component Props

```typescript
// BoardView - Kanban board for a specific board
interface BoardViewProps { boardSlug: string }

// ProjectCard - Card in kanban column
interface ProjectCardProps {
  project: Project;
  onStageChange?: (stage: Project['stage']) => void;
  onDelete?: () => void;
}

// ProjectDetail - Full project view
interface ProjectDetailProps { projectSlug: string }

// HallOfFame - Completed projects grid
// No props - fetches all 'done' projects

// SegmentedProgress - Progress indicator
interface SegmentedProgressProps {
  total: number;
  completed: number;
}

// BoardManager - Home page board management
// No props - standalone page component
```

## Key Patterns

1. **Database singleton:** `getDb()` returns cached SQLite instance
2. **ID generation:** `board-{timestamp}`, `project-{timestamp}`, `user-{timestamp}-{random}`
3. **Slugs:** Generated from title/name, lowercased, hyphenated, with timestamp suffix for uniqueness
4. **Join codes:** 6-char alphanumeric (no ambiguous chars like 0/O/1/I/L)
5. **Author PIN:** 6-digit numeric for board deletion authorization
6. **Password hashing:** SHA-256 (simple, not bcrypt)
7. **Subtasks stored as JSON:** Serialized array in SQLite TEXT column

## Default Data
- Default board: "My Workspace" (slug: `my-workspace`, joinCode: `DEFAULT1`, authorPin: `123456`)
- 3 seed projects in categories: Product, Operations, Personal

## Stage Flow
`idea` → `planning` → `active` → `review` → `done`

Kanban columns show: Plan (idea+planning), Active (active), Review (review). Done projects appear in Hall of Fame.