# Votu — Frontend Task List

> Stack: Nuxt 4 · Vue 3 · TypeScript (strict) · Pinia · `$fetch` / `useApi`
> All files live under `app/` per Nuxt 4 conventions.

**Blocked tasks are clearly marked.** Do not begin a blocked task until its dependency is confirmed done.

---

## Phase 1 — Scaffold & Primitives (Unblocked — start immediately)

### F1.1 — Project Bootstrap

- [x] Init Nuxt 4 with TypeScript strict mode; configure `nuxt.config.ts` (ssr: true, modules: `@pinia/nuxt`)
- [x] Configure runtime config: `public.apiBase = process.env.NUXT_PUBLIC_API_BASE`
- [x] Set up `tsconfig.json` with `"strict": true`
- [ ] Set up ESLint + Prettier

### F1.2 — Type Definitions (`app/types/`)

Mirror every interface from `docs/models.md` exactly:

- [x] `api.ts` — `ApiError`, `Paginated<T>`
- [x] `auth.ts` — `AuthResponse` (`accessToken: string` only; no `refreshToken` field)
- [x] `user.ts` — `User`, `UserSummary`, `UserEmail`, `UserPhone`
- [x] `poll.ts` — `Poll`, `PollSummary`, `PollOption`, `PollOptionStatus`, `PollStatus`, `MyVote`
- [x] `vote.ts` — `Vote`, `VoteOption`

### F1.3 — Utility Functions (`app/utils/`)

- [x] `formatDate(iso: string): string` — locale-aware via `Intl.DateTimeFormat`
- [x] `formatRelativeDate(iso: string): string` — "3 hours ago" via `Intl.RelativeTimeFormat`
- [x] `formatPercentage(n: number): string` — `33.33 → "33.33%"`
- [x] `pollHelpers.ts` — `isEditable(poll)`, `isVotable(poll)`, `canActivate(poll, userId)`
- [x] `e164Validator(phone: string): boolean` — validates E.164 format

### F1.4 — UI Primitives (`app/components/Ui/`)

Build in isolation; no API dependency:

- [x] `AppBadge.vue` — slot + `variant` prop (`default | success | warning | danger`)
- [x] `AppSpinner.vue` — accessible loading indicator (`aria-label="Loading"`)
- [x] `AppSkeleton.vue` — block-level skeleton with configurable height/width
- [x] `AppEmptyState.vue` — illustration slot + title + optional CTA button slot
- [x] `AppAlert.vue` — `variant` prop (`info | success | error`); slot for message
- [x] `AppModal.vue` — focus-trapped overlay; emits `close`; keyboard `Escape` support; `aria-modal="true"`
- [x] `AppPagination.vue` — props: `page`, `limit`, `total`; emits `update:page`; disables prev/next appropriately
- [x] `AppToast.vue` — renders a stack of toast notifications from `useToast` store

### F1.5 — Toast Composable & Store

- [x] `app/composables/useToast.ts` — `add({ message, variant, duration? })`, `remove(id)`, auto-dismiss after `duration` (default 4s)
- [x] Wire `AppToast` into `app/layouts/default.vue` (rendered globally above all page content)

### F1.6 — Layouts

- [x] `app/layouts/default.vue` — `AppHeader` + `<slot>` + `AppFooter` + `NuxtRouteAnnouncer` + `AppToast`
- [x] `app/layouts/auth.vue` — centered card layout, no nav; used by `/login` and `/register`
- [x] `app/error.vue` — Nuxt error page; display `AppAlert` for handled errors; link back to `/`
- [x] `app/components/App/Header.vue` — logo, nav links, auth state (user avatar + dropdown OR login/register buttons)
- [x] `app/components/App/Footer.vue`

---

## Phase 2 — Auth Layer ✅

### F2.1 — Auth Store & Composable

- [x] `app/stores/auth.ts` (`useAuthStore`) — state: `user: User | null`, `accessToken: string | null`; actions: `setSession`, `clearSession`
- [x] `app/composables/useApi.ts` — base `$fetch` wrapper:
  - Injects `Authorization: Bearer <accessToken>` header
  - On `401`: acquire singleton in-flight refresh lock → call `POST /auth/refresh` (no body; cookie is sent automatically) → update `accessToken` in store → retry original request
  - On refresh failure: call `clearSession()`, redirect to `/login`
  - Normalises error responses to `ApiError`
  - **Singleton lock pattern (critical):** use a module-level `let refreshPromise: Promise<string> | null = null` variable to prevent concurrent refresh races
- [x] `app/composables/useAuth.ts` — `login(email, password)`, `register(data)`, `logout()`, `hydrate()` (calls `GET /users/me` on app init if `accessToken` present); delegates to `useAuthStore` + `useApi`

### F2.2 — Middleware

- [x] `app/middleware/auth.ts` — redirect to `/login` if `useAuthStore().user === null`
- [x] `app/middleware/guest.ts` — redirect to `/` if `useAuthStore().user !== null`

### F2.3 — Auth Pages

- [x] `app/pages/login.vue` — apply `auth` layout, `guest` middleware; email + password form; call `useAuth().login()`; show `AppAlert` on error; redirect to `/` on success
- [x] `app/pages/register.vue` — apply `auth` layout, `guest` middleware; firstName, lastName, middleName (optional), email, password; call `useAuth().register()`; redirect to `/` on success
- [x] `app/components/App/Header.vue` — updated with live auth state (user avatar + dropdown vs login/register links)

---

## Phase 3 — Poll Feed & List

### F3.1 — Polls Store & Composable

- [x] `app/stores/polls.ts` (`usePollsStore`) — state: `items: PollSummary[]`, `meta: Paginated['meta'] | null`, `filters: { status?, q?, page }`, `pending: boolean`
- [x] `app/composables/usePolls.ts` — reactive fetch with current filters; exposes `polls`, `meta`, `pending`, `refresh`; uses `useApi`

### F3.2 — Poll List Components

- [x] `app/components/Poll/StatusBadge.vue` — coloured pill for `draft | active | closed`
- [x] `app/components/Poll/Meta.vue` — creator `UserAvatar` + `displayName`, `createdAt` (relative), expiry countdown/date
- [x] `app/components/User/Avatar.vue` — renders `avatarUrl` with fallback initials from `displayName`
- [x] `app/components/Poll/Card.vue` — title, `PollStatusBadge`, `PollMeta`, `votesCount`, `optionsCount`, `myVote` indicator (only render if `myVote !== undefined`)

### F3.3 — Feed Page (`app/pages/index.vue`)

- [x] Apply `useSeoMeta({ title: 'Votu — Vote on anything', ... })`
- [x] Search input (debounced, updates `filters.q`)
- [x] Status filter tabs/buttons (updates `filters.status`)
- [x] Render `PollCard` list; `AppSkeleton` during load; `AppEmptyState` on zero results
- [x] `AppPagination` wired to `meta`

---

## Phase 4 — Poll Detail & Voting ✅

### F4.1 — Poll Store & Composable

- [x] `app/stores/poll.ts` (`usePollStore`) — state: `poll: Poll | null`, `pending: boolean`, `notFound: boolean`
- [x] `app/composables/usePoll.ts` — fetch single poll; `castVote(optionId)`, `changeVote(optionId)`, `activate()`; after successful vote, apply returned poll snapshot to both `usePollStore` and the matching entry in `usePollsStore` (cross-store sync)
- [x] `app/composables/useVotes.ts` — paginated `GET /polls/:pollId/votes`; exposes `votes`, `meta`, `pending`, `refresh`

### F4.2 — Poll Detail Components

- [x] `app/components/Poll/OptionList.vue` — renders each option with `votesCount` + percentage bar; locked (no interaction) when poll is not `active` or user is unauthenticated
- [x] `app/components/Poll/VoteForm.vue` — radio group over `options`; **three-state `myVote` logic** (see below); submit calls `castVote` or `changeVote`; only rendered when `poll.status === 'active'` and user is authenticated
  - If `poll.myVote === undefined` → unauthenticated → do not render
  - If `poll.myVote === null` → not voted yet → show all options unselected
  - If `poll.myVote` is `MyVote` object → already voted → pre-select `myVote.optionId`; show change control only if `canChangeOption`
  - **Never use `!poll.myVote`** — this conflates null and undefined
- [x] `app/components/Vote/List.vue` — paginated vote list with `AppPagination`
- [x] `app/components/Vote/ListItem.vue` — voter `UserAvatar` + `displayName`, option label, `createdAt` (relative)

### F4.3 — Poll Detail Page (`app/pages/polls/[id]/index.vue`)

- [x] Fetch poll on mount via `usePoll`
- [x] If `notFound` → render `AppEmptyState` ("Poll not found") inline
- [x] `useSeoMeta({ title: poll.title, description: poll.description ?? '' })`
- [x] Render: `PollMeta`, `PollStatusBadge`, description, reference link, `PollOptionList`, `PollVoteForm` (if applicable), `VoteList`
- [x] Activate button: shown only when `canActivate(poll, currentUserId)`; calls `usePoll().activate()`

### F4.4 — Poll Create Page (`app/pages/polls/create.vue`)

- [x] Apply `auth` middleware
- [x] `app/components/Poll/Form.vue` — shared create/edit form: title (required), description (optional), reference (optional), `canChangeOption` (checkbox), `expiresAt` (date-time picker, optional), dynamic options list
  - Min 2 options enforced client-side (disable remove button at 2)
  - Max 20 options enforced client-side (hide add button at 20)
  - Each option: label (required), description (optional), reference (optional)
- [x] On submit: call `POST /polls`; redirect to `/polls/[id]` on success

### F4.5 — Poll Edit Page (`app/pages/polls/[id]/edit.vue`)

- [x] Apply `auth` middleware
- [x] Fetch poll; redirect to `/polls/[id]` if `status !== 'draft'` (cannot edit active/closed)
- [x] Reuse `PollForm` with poll data as initial values
- [x] On submit: call `PATCH /polls/:pollId`; redirect to `/polls/[id]` on success

---

## Phase 5 — Profile & Contact Management **[BLOCKED on B1.4 + B1.5]**

### F5.1 — Profile Composables

- [ ] `app/composables/useProfile.ts` — fetch `GET /users/me`, `updateProfile(data)` via `PATCH /users/me`
- [ ] `app/composables/useEmails.ts` — `list()`, `add(email)`, `verify(emailId, code)`, `activate(emailId)`, `resendVerification(emailId)`
- [ ] `app/composables/usePhones.ts` — same surface as `useEmails` but for phones; E.164 validation via `e164Validator` before submit

### F5.2 — Profile Components

- [ ] `app/components/Profile/Form.vue` — `firstName`, `middleName`, `lastName`, `avatarUrl` fields; calls `useProfile().updateProfile()`
- [ ] `app/components/Profile/ContactList.vue` — generic wrapper; renders a list of `ContactItem`; add-button triggers `AppModal`
- [ ] `app/components/Profile/ContactItem.vue` — displays email/phone, verified badge, active badge; action buttons: "Verify" (if unverified), "Set Active" (if verified + not active), "Resend Code" (if unverified)
- [ ] `app/components/Profile/VerifyCodeForm.vue` — 6-character input (numeric); submits code; reused for both email and phone flows
- [ ] `app/components/Profile/AddEmailForm.vue` — single email input inside `AppModal`; calls `useEmails().add()`
- [ ] `app/components/Profile/AddPhoneForm.vue` — single phone input (E.164 hint) inside `AppModal`; calls `usePhones().add()`

### F5.3 — Profile Pages

- [ ] `app/pages/profile/index.vue` — apply `auth` middleware; render `ProfileForm`; show success toast on save
- [ ] `app/pages/profile/emails.vue` — apply `auth` middleware; render `ContactList` with email items; wire verify/activate/resend actions; `AppModal` for add + verify flows
- [ ] `app/pages/profile/phones.vue` — apply `auth` middleware; same pattern as emails

---

## Cross-Cutting Implementation Requirements

| Requirement               | Detail                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `accessToken` storage     | Memory only (Pinia store) — never `localStorage` or `sessionStorage`                       |
| Refresh token             | Never read or stored by frontend — httpOnly cookie handled by browser automatically        |
| Token refresh concurrency | Singleton `refreshPromise` lock in `useApi` — see `frontend-architecture.md`               |
| `myVote` three states     | Always check `=== undefined` (unauthenticated) vs `=== null` (not voted) vs object (voted) |
| Cross-store vote sync     | After cast/change vote, patch `usePollsStore` feed item with returned poll snapshot        |
| SEO                       | `useSeoMeta()` on `/` and `/polls/[id]`; `useHead()` for browser tab title                 |
| Accessibility             | All interactive components must have ARIA labels; `AppModal` must trap focus               |
| No delete UI              | No delete buttons, no DELETE API calls — per project brief                                 |
| Error display             | API errors: `AppAlert` inline; transient success: `AppToast`                               |

---

## Acceptance Criteria

| Criterion               | Description                                                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| Auth hydration          | Refreshing the page re-hydrates the session via `GET /users/me` without showing a logged-out state          |
| No XSS token leak       | `accessToken` never written to `localStorage`; no token in URL                                              |
| Vote form three-state   | Logged-out users see no vote form; logged-in non-voters see empty form; voted users see pre-selected option |
| Feed stays in sync      | After voting on detail page, navigating back to feed shows updated `myVote` indicator and count             |
| Poll create/edit guards | Edit page redirects away if poll is not `draft`; activate only shown to creator                             |
| 404 handled gracefully  | `/polls/[id]` for nonexistent poll renders `AppEmptyState`, not a blank page or JS error                    |
| OG tags present         | `/polls/[id]` page has `og:title` and `og:description` in `<head>`                                          |
