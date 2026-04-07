# Votu — Backend Task List

> Stack: NestJS · TypeScript · PostgreSQL (TypeORM or Prisma) · JWT · Redis (for token denylist + rate limiting)

All tasks are ordered for **linear execution**. A task marked **[BLOCKER]** must be fully complete before the next phase begins.

---

## Phase 1 — Foundation ✅ DONE

### B1.1 — Project Bootstrap

- [x] Scaffold NestJS project with strict TypeScript (`"strict": true`)
- [x] Configure environment variables: `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` (15m), `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN` (30d), `REDIS_URL`, `AVATAR_URL_ALLOWLIST` (comma-separated CDN domains)
- [x] Set up `ConfigModule` (validated with `class-validator` / `joi`)
- [x] Connect database (PostgreSQL) and run initial migration scaffold
- [x] Connect Redis (for token denylist and rate limiting)
- [x] Set up global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
- [x] Set up global exception filter returning the standard `ApiError` shape (`{ statusCode, error, message }`)
- [x] Add `helmet`, CORS configuration, and `compression` middleware

### B1.2 — Database Schema

- [x] `users` table: `id` (UUID PK), `firstName`, `middleName` (nullable), `lastName`, `avatarUrl` (nullable), `passwordHash`, `createdAt`, `updatedAt`
- [x] `user_emails` table: `id`, `userId` (FK), `email` (unique), `isActivated` (bool), `verificationCode` (nullable), `codeExpiresAt` (nullable), `codeAttempts` (int default 0), `verifiedAt` (nullable), `createdAt`, `updatedAt`
- [x] `user_phones` table: same structure as `user_emails` but with `phone` (E.164, unique)
- [x] `refresh_tokens` table: `id`, `userId` (FK), `tokenHash` (unique), `expiresAt`, `createdAt` — used for server-side rotation and denylist
- [x] `polls` table: `id`, `userId` (FK, creator), `title`, `description` (nullable), `reference` (nullable), `status` (`draft|active|closed`), `canChangeOption` (bool), `expiresAt` (nullable), `createdAt`, `updatedAt`
- [x] `poll_options` table: `id`, `pollId` (FK), `label`, `description` (nullable), `reference` (nullable), `status` (`active|disabled`), `createdAt`, `updatedAt`
- [x] `votes` table: `id`, `pollId` (FK), `userId` (FK), `optionId` (FK), `createdAt`, `updatedAt`; unique constraint on `(pollId, userId)`
- [ ] Seed script for local development (1 admin user, 3 polls in mixed statuses)

### B1.3 — Auth Module **[BLOCKER for all auth-dependent work]**

- [x] `POST /auth/register` — hash password with `bcrypt` (cost factor ≥ 12); create user + first email (unverified, activated); dispatch verification email; return `AuthResponse` with `accessToken` in body + `refreshToken` as `HttpOnly; Secure; SameSite=Strict` cookie (`Path=/auth/refresh`)
- [x] `POST /auth/login` — validate credentials; rate-limit 5 failed attempts / IP / 15 min (via Redis); return same `AuthResponse` shape
- [x] `POST /auth/logout` — read cookie, hash token, delete `refresh_tokens` row, clear cookie with `Max-Age=0`; return `204`
- [x] `POST /auth/refresh` — read cookie (not body); validate token hash against `refresh_tokens`; delete old row, insert new row (rotation); return new `accessToken` + new cookie; return `401` if not found or expired
- [x] `JwtAuthGuard` — validates `Authorization: Bearer` header; attaches `user` to request
- [x] `displayName` computed property: `firstName + " " + lastName` when `middleName` is null; `firstName + " " + middleName[0].toUpperCase() + ". " + lastName` otherwise
- [x] Unit tests: register, login (success + failure), token rotation, logout invalidation

### B1.4 — User Module

- [x] `GET /users/me` — return full `User` object with `emails` and `phones` arrays
- [x] `PATCH /users/me` — allow updating `firstName`, `middleName`, `lastName`, `avatarUrl`; validate `avatarUrl` against `AVATAR_URL_ALLOWLIST` env var (must be `https://`, must match an allowlisted domain, max 2048 chars); return updated `User`
- [x] Unit tests: profile fetch, profile update, avatarUrl validation rejection

### B1.5 — Email & Phone Modules

- [x] `GET /users/me/emails` — return all `UserEmail[]` for current user
- [x] `POST /users/me/emails` — validate unique email (global); create `UserEmail` record (unverified, not activated); generate 6-digit numeric code, set `verificationCode = hash(code)`, `codeExpiresAt = now + 10 min`, `codeAttempts = 0`; dispatch email (queue job)
- [x] `POST /users/me/emails/:emailId/verify` — validate ownership; check `codeAttempts < 5` (return `429` if exceeded); compare code hash; set `verifiedAt = now`, clear code fields; invalidate code on 5th wrong attempt
- [x] `PATCH /users/me/emails/:emailId/activate` — validate `verifiedAt` is non-null; set `isActivated = true` on target, `isActivated = false` on all others for this user; return updated `UserEmail`
- [x] `POST /users/me/emails/:emailId/resend-verification` — rate-limit 3/hour per email; return `409` if already verified; regenerate code + reset attempts/expiry; dispatch email
- [x] Repeat all 5 operations for phones (`/users/me/phones`); validate E.164 format on add; dispatch via SMS queue job
- [x] Unit tests: full verification flow (success, expired, max attempts, already-verified resend)

---

## Phase 2 — Core Domain ✅ DONE

### B2.1 — Poll Module

- [x] `GET /polls` — paginated (`page`, `limit` max 100); filterable by `status`, searchable by `title` (`ILIKE`); populate `myVote` when `Authorization` header present and valid (do not error on invalid/missing token — treat as unauthenticated); return `Paginated<PollSummary>`
- [x] `GET /polls/:pollId` — return full `Poll` with `options[]`; populate `myVote` when authenticated; disabled options excluded once `status = active|closed`
- [x] `POST /polls` — requires auth; validate `options.length >= 2 && <= 20`; create poll as `draft`; return full `Poll`
- [x] `PATCH /polls/:pollId` — requires auth, must be creator, must be `draft`; if `options` provided, fully replace (still enforce 2–20 constraint); return full `Poll`
- [x] `PATCH /polls/:pollId/activate` — requires auth, must be creator, must be `draft`; set `status = active`; return **full** `Poll` object (not partial)
- [x] Enforce state machine in service layer: only `draft → active` transition is allowed manually; no `active → closed` manual transition; no re-opening `closed`
- [x] Unit tests: CRUD, state transitions, ownership checks, options validation

### B2.2 — Vote Module

- [x] `GET /polls/:pollId/votes` — public; paginated; return `Vote[]` including `updatedAt` on each vote
- [x] `POST /polls/:pollId/votes` — requires auth; poll must be `active`; one vote per user per poll (return `409` on duplicate); create vote; return `{ vote, poll }` envelope where `poll` contains updated `votesCount`, `options[].votesCount`, `options[].percentage`, and `myVote`
- [x] `PATCH /polls/:pollId/votes` — requires auth; poll must be `active`; `canChangeOption` must be `true`; user must have existing vote; update `optionId`, `updatedAt`; return same envelope as `POST`
- [x] `percentage` computation: `(option.votesCount / poll.votesCount) * 100`, rounded to 2 decimal places; return `0` when `votesCount = 0`
- [x] Unit tests: cast vote, change vote (allowed and blocked), duplicate prevention, percentage accuracy

### B2.3 — Poll Auto-Close Scheduler

- [x] Implement a cron job (or queue-based scheduler) that queries `polls` where `status = active AND expiresAt <= now`
- [x] Update matching polls to `status = closed`
- [x] Run at minimum every 1 minute; tolerate missed runs gracefully (idempotent query)
- [x] Unit / integration test: verify poll closes after `expiresAt` passes

---

## Phase 3 — Cross-Cutting Concerns

### B3.1 — Rate Limiting

- [ ] Global rate limiter: 100 req / 15 min / IP (applied via NestJS `ThrottlerModule` backed by Redis)
- [ ] Stricter per-route overrides:
  - `POST /auth/login`: 5 failed attempts / IP / 15 min
  - `POST /users/me/emails/:emailId/resend-verification`: 3 / email / 1 hour
  - `POST /users/me/phones/:phoneId/resend-verification`: 3 / phone / 1 hour
- [ ] All `429` responses must include a `Retry-After` header

### B3.2 — Queue / Notification Workers

- [ ] Set up a job queue (e.g. BullMQ + Redis) for outbound email and SMS dispatches
- [ ] Email worker: send verification code email (template: "Your Votu code is XXXXXX")
- [ ] SMS worker: send verification code via SMS provider (e.g. Twilio)
- [ ] Dead-letter handling: log failed jobs, do not silently discard

### B3.3 — End-to-End Tests

- [ ] Auth flow: register → verify email → login → refresh → logout
- [ ] Poll lifecycle: create → edit → activate → vote → auto-close
- [ ] Error paths: duplicate email, wrong verify code, edit active poll, vote on closed poll

---

## Acceptance Criteria

| Criterion                              | Description                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| No refresh token in JSON response body | All auth responses return only `accessToken`; refresh is exclusively in `Set-Cookie` |
| `displayName` consistent               | All `UserSummary` embeds use `First M. Last` format                                  |
| `PATCH /activate` returns full poll    | Response identical to `GET /polls/:pollId` shape                                     |
| `GET /votes` includes `updatedAt`      | Each vote in the list response has both `createdAt` and `updatedAt`                  |
| Rate limits enforced                   | Login, resend-email, resend-phone return `429` with `Retry-After` when exceeded      |
| Options min/max enforced               | Creating/updating a poll with <2 or >20 options returns `400`                        |
| No data deletion                       | No `DELETE` endpoints exist anywhere in the API                                      |
