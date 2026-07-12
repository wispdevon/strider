# Strider

Strider is a collaborative Kanban-style project management app built with Next.js, SQLite, passkey authentication, board invites, task assignment, subtasks, and a visual Hall of Fame for completed work.

## Features

- Board-based project management with Plan, Active, Review, and completed history flows.
- Drag-and-drop task ordering and stage movement.
- Project detail pages with subtasks, progress, renaming, deletion, and assignment.
- Multi-user assignment for tasks and subtasks, including virtual Codex and Claude assignees.
- Board ownership, member invites, friend requests, and join codes.
- Optional board passwords and passkey-backed user authentication.
- Hall of Fame view with completion leaders, podium rankings, milestone history, and assignee avatars.
- Export support for board owners.
- Local SQLite persistence with deployment hardening for public hosting.
- Light and dark themes with a custom editorial workspace design system.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS 4
- SQLite with `better-sqlite3`
- Framer Motion
- `@dnd-kit/core` and `@dnd-kit/sortable`
- SimpleWebAuthn

## Getting Started

Install dependencies:

```bash
npm install
```

Create environment variables:

```bash
cp .env.example .env
```

For local development, the defaults are usually enough. For production, generate a strong session secret:

```bash
node scripts/gen-env.js
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

By default, the app redirects to `/board/my-workspace`. The seeded workspace uses:

- Join code: `DEFAULT1`
- Author PIN: `123456`

Protect or remove the default workspace before exposing the app publicly.

## Scripts

```bash
npm run dev      # Start the Next.js dev server
npm run build    # Build for production
npm run start    # Start the production server
npm run lint     # Run ESLint
npm run preview:cloudflare  # Build and preview with the Cloudflare Workers runtime
npm run deploy:cloudflare   # Build and deploy with the Cloudflare OpenNext adapter
npm run cf-typegen          # Generate Cloudflare environment binding types
```

## Environment

See [.env.example](.env.example) for the full set of supported variables.

Important variables:

- `SESSION_SECRET`: Required in production for secure sessions.
- `ADMIN_API_TOKEN`: Optional token for the avatar reset maintenance endpoint.
- `RP_ID`: WebAuthn relying party hostname.
- `RP_ORIGIN`: WebAuthn origin, including protocol.
- `HOSTNAME` and `PORT`: Server bind settings for `next start`.

WebAuthn passkeys require `RP_ID` and `RP_ORIGIN` to match the hostname users actually visit.

## Project Structure

```text
app/                 Next.js routes and API endpoints
components/          Board, task, auth, friend, and Hall of Fame UI
context/             Auth provider and client auth state
lib/                 Database, auth, board, project, session, and utility logic
data/                Local SQLite database location
public/              Static assets
scripts/             Maintenance and setup scripts
```

Core files:

- [components/BoardView.tsx](components/BoardView.tsx): Main Kanban board experience.
- [components/ProjectDetail.tsx](components/ProjectDetail.tsx): Task detail and subtask management.
- [components/HallOfFame.tsx](components/HallOfFame.tsx): Completed project history and rankings.
- [lib/db-core.ts](lib/db-core.ts): SQLite connection, schema, and migrations.
- [lib/projects.ts](lib/projects.ts): Project and subtask persistence.
- [lib/boards.ts](lib/boards.ts): Board, member, and invite persistence.

## Data

Strider stores application data in SQLite:

```text
data/strider.sqlite
```

Back this file up regularly in production. It contains boards, projects, users, board members, passkeys, invites, and task history.

## Deployment

Read [DEPLOY.md](DEPLOY.md) before hosting Strider publicly. The deployment guide covers:

- Required production secrets.
- Caddy reverse proxy setup.
- TLS and WebAuthn hostname requirements.
- API authorization hardening.
- Rate limiting.
- Default board safety.
- SQLite backups.

Production checklist:

```bash
node scripts/gen-env.js
npm run build
npm run start
```

Use the included [Caddyfile](Caddyfile) if you want Caddy to terminate TLS and proxy to Next.js.

Cloudflare Workers configuration is included through `@opennextjs/cloudflare`,
`wrangler.jsonc`, and `open-next.config.ts`. Cloudflare CI/CD should use Node 22+
and `npm run deploy:cloudflare`. The current app still uses native
`better-sqlite3`; migrate persistence to Cloudflare D1 or another Workers-safe
database before relying on the Cloudflare deployment for production writes.

## Design

The visual direction is documented in [DESIGN.md](DESIGN.md). Strider uses a calm paper-like workspace aesthetic, restrained titanium accents, soft surfaces, and a custom Hall of Fame treatment for completed work.

## Development Notes

- This app uses Next.js 16. APIs and conventions may differ from older Next.js versions.
- Keep board/project authorization paths aligned with `lib/board-access.ts`.
- Keep `assigneeId` compatibility when changing assignment code; newer multi-assignment behavior uses `assigneeIds`.
- Do not commit `.env`, `.env.local`, or the SQLite database.

## Privacy

Strider does not collect data beyond what is necessary to run boards, accounts, assignments, invites, passkeys, sessions, security, and service operations. See the in-app Privacy Policy at `/privacy` for the full policy.

Production operators should protect the SQLite database, session secret, deployment environment, backups, and logs because they contain application data needed for the service to function.

## License

Strider is licensed under the [Apache License 2.0](LICENSE).

Built by [Devon Labs](https://devonlabs.space).
