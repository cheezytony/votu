# Votu Frontend Architecture

> Nuxt 4 app. All routes under `app/`.

---

## Pages

| Route              | Auth       | Description                                                            |
| ------------------ | ---------- | ---------------------------------------------------------------------- |
| `/`                | No         | Poll feed — paginated list of polls, search by title, filter by status |
| `/polls/[id]`      | Optional   | Poll detail with options, vote counts, and voting UI                   |
| `/polls/create`    | Required   | Create a new poll                                                      |
| `/polls/[id]/edit` | Required   | Edit a draft poll                                                      |
| `/login`           | Guest only | Login form                                                             |
| `/register`        | Guest only | Registration form                                                      |
| `/profile`         | Required   | View & edit profile (name, avatar)                                     |
| `/profile/emails`  | Required   | Manage email addresses (add, verify, activate)                         |
| `/profile/phones`  | Required   | Manage phone numbers (add, verify, activate)                           |

---

## Layouts

| Layout    | Used by               | Description                                                      |
| --------- | --------------------- | ---------------------------------------------------------------- |
| `default` | All pages             | Full layout with `AppHeader` + `AppFooter`, `NuxtRouteAnnouncer` |
| `auth`    | `/login`, `/register` | Minimal centered card layout — no nav                            |

---

## Middleware

| Name    | Description                                                             |
| ------- | ----------------------------------------------------------------------- |
| `auth`  | Redirects unauthenticated users to `/login`; applied to protected pages |
| `guest` | Redirects authenticated users away from `/login` and `/register`        |

---

## Stores (Pinia)

| Store           | Responsibility                                                                            |
| --------------- | ----------------------------------------------------------------------------------------- |
| `useAuthStore`  | Session state: `user`, `accessToken`, `refreshToken`; login / logout / register / hydrate |
| `usePollsStore` | Poll list state: items, pagination meta, current filters (`status`, `q`, `page`)          |
| `usePollStore`  | Single poll state: current poll, loading/error, vote submission                           |

---

## Composables

| Composable      | Description                                                                                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `useApi`        | Base `$fetch` wrapper — injects `Authorization` header, handles 401 → token refresh → retry (singleton in-flight lock: if a refresh is already in progress, all concurrent 401s queue on the same promise rather than firing parallel refresh requests), normalises `ApiError` |
| `useAuth`       | Actions: `login`, `register`, `logout`, `refreshTokens` — delegates to `useAuthStore` + `useApi`                                                                                                                                                                               |
| `usePolls`      | Fetch poll list with reactive filters; exposes `polls`, `meta`, `pending`, `refresh`                                                                                                                                                                                           |
| `usePoll`       | Fetch single poll; `castVote(optionId)`, `activate()`, `updatePoll(data)`                                                                                                                                                                                                      |
| `useEmails`     | List, add, verify, activate, resendVerification for `/users/me/emails`                                                                                                                                                                                                         |
| `usePhones`     | List, add, verify, activate, resendVerification for `/users/me/phones`                                                                                                                                                                                                         |
| `useProfile`    | Fetch `/users/me`, `updateProfile(data)`                                                                                                                                                                                                                                       |
| `useVotes`      | Fetch paginated vote list for a poll (`GET /polls/:pollId/votes`); exposes `votes`, `meta`, `pending`, `refresh`                                                                                                                                                               |
| `usePagination` | Shared reactive `page` / `limit` state + computed prev/next helpers                                                                                                                                                                                                            |
| `useToast`      | Lightweight toast notification queue (success / error / info)                                                                                                                                                                                                                  |

---

## Components

### Layout

- `AppHeader` — logo, nav links, auth state (user avatar + dropdown or login/register buttons)
- `AppFooter`

### Poll

- `PollCard` — summary card used in the feed (title, status badge, creator, counts, `myVote` indicator)
- `PollForm` — shared create/edit form (title, description, expiresAt, dynamic options list — min 2)
- `PollOptionList` — renders options with `votesCount` + `percentage` bar; locked when not active
- `PollVoteForm` — radio group + submit; shown only when `status === 'active'` and user is authenticated and has not yet voted
- `PollStatusBadge` — `draft` / `active` / `closed` coloured pill
- `PollMeta` — creator avatar + name, created date, expiry countdown/date

### Votes

- `VoteList` — paginated public list of voters for a poll (`GET /polls/:id/votes`)
- `VoteListItem` — avatar + display name + option chosen + date

### User / Profile

- `UserAvatar` — renders `avatarUrl` with fallback initials
- `ProfileForm` — firstName, middleName, lastName, avatarUrl fields
- `ContactList` — generic list wrapper reused for both emails and phones
- `ContactItem` — single email/phone row with verified/active badges + action buttons
- `VerifyCodeForm` — 6-char code input; reused for both email and phone verification
- `AddEmailForm` / `AddPhoneForm` — minimal single-field modals

### UI Primitives

- `AppPagination` — prev / next / page numbers, driven by `meta`
- `AppModal` — focus-trapped overlay used for verify/add flows
- `AppBadge` — small status/label pill
- `AppSpinner` / `AppSkeleton` — loading states
- `AppEmptyState` — zero-results placeholder with optional CTA
- `AppAlert` — inline error/info/success banners
- `AppToast` — stack of transient notifications

---

## Types (`types/`)

Mirror every interface from `models.md` as TypeScript.

| File      | Exports                                                     |
| --------- | ----------------------------------------------------------- |
| `api.ts`  | `ApiError`, `Paginated<T>`                                  |
| `auth.ts` | `AuthResponse`                                              |
| `user.ts` | `User`, `UserSummary`, `UserEmail`, `UserPhone`             |
| `poll.ts` | `Poll`, `PollSummary`, `PollOption`, `PollStatus`, `MyVote` |
| `vote.ts` | `Vote`, `VoteOption`                                        |

---

## Utilities (`utils/`)

| Utility                   | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `formatDate(iso)`         | ISO 8601 → locale-aware display string via `Intl.DateTimeFormat`   |
| `formatRelativeDate(iso)` | "3 hours ago" style via `Intl.RelativeTimeFormat`                  |
| `formatPercentage(n)`     | `33.33 → "33.33%"`                                                 |
| `pollHelpers`             | `isEditable(poll)`, `isVotable(poll)`, `canActivate(poll, userId)` |
| `e164Validator(phone)`    | Validates E.164 format for phone input                             |

---

## Folder Structure

```
app/
  error.vue
  layouts/
    default.vue
    auth.vue
  middleware/
    auth.ts
    guest.ts
  pages/
    index.vue
    login.vue
    register.vue
    polls/
      create.vue
      [id].vue
      [id]/
        edit.vue
    profile/
      index.vue
      emails.vue
      phones.vue
  components/
    App/
      Header.vue
      Footer.vue
    Poll/
      Card.vue
      Form.vue
      OptionList.vue
      VoteForm.vue
      StatusBadge.vue
      Meta.vue
    Vote/
      List.vue
      ListItem.vue
    Profile/
      Form.vue
      ContactList.vue
      ContactItem.vue
      VerifyCodeForm.vue
      AddEmailForm.vue
      AddPhoneForm.vue
    User/
      Avatar.vue
    Ui/
      Pagination.vue
      Modal.vue
      Badge.vue
      Spinner.vue
      Skeleton.vue
      EmptyState.vue
      Alert.vue
      Toast.vue
  composables/
    useApi.ts
    useAuth.ts
    usePolls.ts
    usePoll.ts
    useEmails.ts
    usePhones.ts
    useProfile.ts
    useVotes.ts
    usePagination.ts
    useToast.ts
  stores/
    auth.ts
    polls.ts
    poll.ts
  types/
    api.ts
    auth.ts
    user.ts
    poll.ts
    vote.ts
  utils/
    formatDate.ts
    formatPercentage.ts
    pollHelpers.ts
    e164Validator.ts
```

---

## Key Design Decisions

- **`useApi`** is the single network layer — all composables go through it so token refresh and error normalisation happen in one place.
- **`PollForm`** is reused for create and edit; the page passes either an empty draft or the existing poll as initial values.
- **`VerifyCodeForm`** is reused for both email and phone verify flows — the parent composable (`useEmails` / `usePhones`) provides the submit handler.
- **No delete UI** anywhere — per the project brief, no data is ever deleted.
- Active polls show `PollOptionList` in read-only percentage mode for unauthenticated visitors; authenticated users additionally see `PollVoteForm` if they haven't voted yet.
- `myVote` is omitted from API responses for unauthenticated requests, so components must check for its presence (`poll.myVote !== undefined`) before rendering vote state.

---

## ⚠️ Critical Implementation Notes

### `myVote` Three-State Handling

`myVote` has **three distinct states** that must all be handled explicitly — conflating them is a bug:

| State                 | Check                             | Meaning                                                                                          |
| --------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Field absent          | `poll.myVote === undefined`       | Unauthenticated request — do not render any vote state                                           |
| Field present, null   | `poll.myVote === null`            | Authenticated user has **not yet voted** — show `PollVoteForm`                                   |
| Field present, object | `typeof poll.myVote === 'object'` | Authenticated user **has voted** — show selection; show change-vote control if `canChangeOption` |

**Never use `!poll.myVote`** — this conflates `null` (not voted) with `undefined` (unauthenticated) and will hide the vote form for logged-in users who haven't voted yet.

### Token Refresh Race Condition

`useApi` **must** use a singleton in-flight promise for token refresh. If multiple concurrent requests receive a `401`, only one refresh call must be dispatched; all other callers must await its result before retrying. Without this guard, concurrent refreshes rotate the cookie mid-flight, leaving all-but-one callers with an invalidated token.

Implementation pattern:

```ts
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}
```

### Cross-Store Vote Sync

After a successful `POST /polls/:pollId/votes` or `PATCH /polls/:pollId/votes`, the API returns an updated poll snapshot (`votesCount`, `options[].percentage`, `myVote`). `usePollStore` must apply this snapshot **and** patch the matching `PollSummary` entry in `usePollsStore` (the feed) — otherwise navigating back to the feed shows stale vote counts and a stale `myVote` indicator until a full page refresh.

### SEO / Open Graph

`/` and `/polls/[id]` are public pages and must render meaningful OG tags for link sharing:

- `/`: `og:title = "Votu — Vote on anything"`, generic description
- `/polls/[id]`: `og:title = poll.title`, `og:description = poll.description ?? ""`, `og:url = canonical URL`

Use `useSeoMeta()` in each page component. Apply `useHead({ title: poll.title })` for the browser tab title.

### Error Handling

`app/error.vue` handles Nuxt-level errors (unhandled exceptions, server errors). For `404` poll lookups, `usePoll` sets a `notFound` flag; `/polls/[id]` renders an `AppEmptyState` with a "Poll not found" message inline rather than triggering a full error page.
