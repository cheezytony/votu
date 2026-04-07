# Votu

A full-stack voting platform. Users can create and manage polls, share them publicly, and vote. All voters are visible to the public but you must be logged in to create a poll or cast a vote.

**Tech stack:** NestJS (API) · Nuxt 4 + Pinia (frontend) · PostgreSQL · Redis · pnpm workspaces

---

## Monorepo structure

```
votu/
├── votu-backend/      # NestJS REST API
├── votu-frontend/     # Nuxt 4 SSR frontend
├── docs/              # Project documentation
├── package.json       # Workspace root
└── pnpm-workspace.yaml
```

---

## Prerequisites

| Tool       | Version |
| ---------- | ------- |
| Node.js    | ≥ 20    |
| pnpm       | ≥ 9     |
| PostgreSQL | ≥ 15    |
| Redis      | ≥ 7     |

---

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

**Backend** — copy and fill in `votu-backend/.env`:

```bash
cp votu-backend/.env.example votu-backend/.env
```

```env
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/votu

REDIS_URL=redis://localhost:6379

JWT_SECRET=change-me-in-production
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d

FRONTEND_URL=http://localhost:3001

PORT=3000
```

**Frontend** — copy and fill in `votu-frontend/.env`:

```bash
cp votu-frontend/.env.example votu-frontend/.env
```

```env
NUXT_PUBLIC_API_BASE=http://localhost:3000
```

### 3. Run database migrations

```bash
cd votu-backend
pnpm migration:run
```

### 4. (Optional) Seed the database

```bash
cd votu-backend
pnpm seed
```

### 5. Start development servers

From the workspace root:

```bash
# Both in parallel (separate terminals)
pnpm dev:backend    # → http://localhost:3000
pnpm dev:frontend   # → http://localhost:3001
```

Or from their respective directories:

```bash
# Terminal 1
cd votu-backend && pnpm start:dev

# Terminal 2
cd votu-frontend && pnpm dev
```

---

## Backend (`votu-backend`)

Built with NestJS, TypeORM, and PostgreSQL.

### Architecture

```
src/
├── auth/              # JWT auth, refresh-token rotation, guards, strategies
├── common/            # Global exception filter, utilities
├── config/            # Joi-validated env schema
├── database/          # TypeORM data-source, migrations, seeds
├── notifications/     # BullMQ queue + processor for email/SMS dispatch
├── polls/             # Poll & poll-option CRUD, auto-close scheduler
├── redis/             # Shared Redis module (ioredis)
├── users/             # User profile, emails, phones
│   ├── emails/
│   └── phones/
├── votes/             # Cast & change votes, paginated vote list
├── create-app.ts      # Shared app factory (used by main.ts and Vercel handler)
└── main.ts            # Local entry point
```

### Key design decisions

- **Global throttler** — 100 requests per 15 min per IP; login endpoint has stricter rate-limiting (5 failures/IP/15 min → 429).
- **Refresh token rotation** — replay protection: each refresh token is one-use; rotated on every `/auth/refresh` call.
- **Poll references** — every poll and poll option gets a server-generated `nanoid(12)` reference on creation. References are immutable and used for all public (non-owner) access, so internal UUIDs are never exposed in shared URLs.
- **No deletes** — per product spec, nothing can be deleted (no soft-deletes either).
- **Auto-close** — `@nestjs/schedule` cron job closes polls when `expiresAt` has passed.
- **BullMQ** — `NotificationsModule` queues email/SMS jobs to Redis and dispatches them asynchronously.

### Available scripts

```bash
pnpm build             # Compile TypeScript → dist/
pnpm start:dev         # Watch mode
pnpm start:prod        # Run compiled dist/main.js
pnpm test              # Jest unit tests
pnpm test:e2e          # Jest e2e tests
pnpm lint              # ESLint --fix
pnpm migration:generate -- src/database/migrations/MigrationName
pnpm migration:run
pnpm migration:revert
pnpm seed              # Run database seed
```

### API overview

Swagger UI is available at `http://localhost:3000/api/docs` in non-production environments.

| Group        | Endpoints                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Auth         | `POST /auth/register` · `POST /auth/login` · `POST /auth/logout` · `POST /auth/refresh`                               |
| Users        | `GET /users/me` · `PATCH /users/me`                                                                                   |
| Emails       | `GET/POST /users/me/emails` · verify · activate · resend                                                              |
| Phones       | `GET/POST /users/me/phones` · verify · activate · resend                                                              |
| Polls        | `GET /polls` · `POST /polls` · `GET /polls/ref/:reference` · `PATCH /polls/:pollId` · `PATCH /polls/:pollId/activate` |
| Poll options | `GET /poll-options/ref/:reference`                                                                                    |
| Votes        | `GET /votes` · `POST /votes` · `PATCH /votes`                                                                         |

Auth uses short-lived **JWT access tokens** (15 min, returned in JSON body) and long-lived **refresh tokens** set as `HttpOnly; SameSite=Strict` cookies. Access tokens should be stored in memory only (Pinia store).

---

## Frontend (`votu-frontend`)

Built with Nuxt 4 (SSR), Pinia, TanStack Query, and Tailwind CSS v4.

### Architecture

```
app/
├── assets/css/        # Tailwind entry
├── components/
│   ├── App/           # Header, Footer, UserDropdown
│   ├── Poll/          # Card, Form, OptionList, VoteForm, StatusBadge, Meta
│   ├── Vote/          # List, ListItem
│   ├── User/          # Avatar
│   └── Ui/            # Alert, Badge, EmptyState, Loader, Modal, Pagination, Skeleton, Spinner, Toast
├── composables/
│   ├── useApi.ts      # Base fetch wrapper (auth, 401 → refresh → retry)
│   ├── useAuth.ts     # login / register / logout / refreshTokens
│   ├── usePolls.ts    # Paginated poll list with filters
│   ├── usePoll.ts     # Single poll + castVote / changeVote / activate
│   ├── useVotes.ts    # Paginated vote list for a poll
│   ├── useEmails.ts   # /users/me/emails CRUD
│   ├── usePhones.ts   # /users/me/phones CRUD
│   ├── useProfile.ts  # GET + update /users/me
│   ├── usePagination.ts
│   └── useToast.ts
├── middleware/
│   ├── auth.ts        # Redirect unauthenticated → /login
│   └── guest.ts       # Redirect authenticated away from /login, /register
├── pages/
│   ├── index.vue               # Poll feed
│   ├── login.vue
│   ├── register.vue
│   ├── profile/
│   │   ├── index.vue
│   │   ├── emails.vue
│   │   └── phones.vue
│   └── polls/
│       ├── create.vue
│       └── [id]/
│           ├── index.vue       # Poll detail + voting
│           └── edit.vue        # Edit draft poll
├── stores/
│   ├── auth.ts        # user, accessToken, setSession, clearSession
│   ├── poll.ts        # Single poll, pending, notFound
│   └── polls.ts       # Poll list items, pagination, filters
├── types/
│   ├── api.ts         # Paginated<T>, ApiError
│   ├── poll.ts        # Poll, PollSummary, PollOption, PollStatus, MyVote
│   ├── user.ts        # User, UserSummary, UserEmail, UserPhone, AuthResponse
│   └── vote.ts        # Vote, VoteOption
└── utils/
    └── pollHelpers.ts  # isEditable, isVotable, canActivate
```

### Key design decisions

- **`useApi` is the sole network layer.** All composables call `useApi().request()`. It handles auth header injection, automatic token refresh on 401 (singleton `refreshPromise` prevents concurrent refresh races), and error normalisation.
- **Poll references in URLs.** Routes use the poll's short `reference` (e.g. `/polls/abc123xyz`) not its UUID. The UUID is only used internally for owner mutations (`PATCH /polls/:id`).
- **`myVote` three-state.** `undefined` = unauthenticated, `null` = logged in but not voted, `object` = voted. Never test with `!poll.myVote`.
- **Cross-store vote sync.** After casting or changing a vote, the returned snapshot is applied to both `usePollStore` (detail view) and the matching entry in `usePollsStore` (feed).
- **No delete UI** anywhere, matching the product spec.
- **SSR** is enabled. Pages that require the auth state wait for `$authReady` before making authenticated requests.

### Available scripts

```bash
pnpm dev           # Dev server → http://localhost:3001
pnpm build         # Production SSR build
pnpm preview       # Preview production build locally
pnpm generate      # Static generation
pnpm postinstall   # nuxt prepare (run automatically)
```

---

## Deployment (Vercel)

Each package is a separate Vercel project pointing at the same Git repository.

### Frontend

| Setting        | Value                                  |
| -------------- | -------------------------------------- |
| Root directory | `votu-frontend`                        |
| Framework      | Nuxt (auto-detected via `vercel.json`) |
| Build command  | `nuxt build` (default)                 |

**Environment variables:**

```env
NUXT_PUBLIC_API_BASE=https://your-api.vercel.app
```

### Backend

| Setting        | Value                                             |
| -------------- | ------------------------------------------------- |
| Root directory | `votu-backend`                                    |
| Framework      | Other                                             |
| Build command  | `nest build` (detected via `vercel-build` script) |

The `vercel.json` in `votu-backend/` routes all requests to the serverless handler at `api/index.ts`, which bootstraps NestJS via the Express adapter.

**Environment variables:**

```env
NODE_ENV=production
DATABASE_URL=...
REDIS_URL=...
JWT_SECRET=...
JWT_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=30d
FRONTEND_URL=https://your-frontend.vercel.app
```

**Ignored build step** (optional, to skip builds when only the other package changed):

- Frontend: `git diff HEAD^ HEAD --quiet -- votu-frontend/`
- Backend: `git diff HEAD^ HEAD --quiet -- votu-backend/`

> **Note:** BullMQ background workers and `@nestjs/schedule` cron jobs do not run on Vercel's stateless serverless runtime. The HTTP API works fully. For background job processing, run the backend as a long-running service (Railway, Render, Fly.io) or configure Vercel Cron Jobs to call a dedicated endpoint.

---

## Database migrations

Migrations live in `votu-backend/src/database/migrations/` and are managed with the TypeORM CLI via the `typeorm` script in `package.json`.

```bash
# Generate a new migration (from votu-backend/)
pnpm migration:generate -- src/database/migrations/MyMigrationName

# Apply pending migrations
pnpm migration:run

# Roll back the last migration
pnpm migration:revert
```

The TypeORM data-source config is at `src/database/data-source.ts`. `synchronize` is always `false` — schema changes must go through migrations.

---

## Contributing

1. Create a feature branch from `main`
2. Make changes, run `pnpm lint` and `pnpm test` in the relevant package
3. Submit a pull request

All network access goes through `useApi` on the frontend. All business logic goes in NestJS service classes. DTOs enforce validation at the API boundary.
