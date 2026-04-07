# Votu Data Models

All `id` fields are UUIDs (string). All timestamps are ISO 8601 strings (e.g. `"2026-03-21T14:00:00.000Z"`).

---

## User

The full user object. Returned from `/users/me`, `/auth/login`, and `/auth/register`.

| Field         | Type             | Notes                                                                                                                                                                                                                                                                         |
| ------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string`         | UUID                                                                                                                                                                                                                                                                          |
| `firstName`   | `string`         | Given name                                                                                                                                                                                                                                                                    |
| `middleName`  | `string \| null` | Middle name; optional                                                                                                                                                                                                                                                         |
| `lastName`    | `string`         | Family name                                                                                                                                                                                                                                                                   |
| `displayName` | `string`         | Computed server-side, never sent by the client. Format: `"firstName lastName"` when `middleName` is null; `"firstName M. lastName"` (middle initial + period) when `middleName` is set. Example: `firstName="Jane"`, `middleName="Alice"`, `lastName="Doe"` → `"Jane A. Doe"` |
| `avatarUrl`   | `string \| null` | Absolute URL to profile picture                                                                                                                                                                                                                                               |
| `createdAt`   | `string`         | ISO 8601                                                                                                                                                                                                                                                                      |
| `updatedAt`   | `string`         | ISO 8601                                                                                                                                                                                                                                                                      |
| `emails`      | `UserEmail[]`    | All registered emails                                                                                                                                                                                                                                                         |
| `phones`      | `UserPhone[]`    | All registered phone numbers                                                                                                                                                                                                                                                  |

```ts
interface User {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  displayName: string; // computed, read-only
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  emails: UserEmail[];
  phones: UserPhone[];
}
```

---

## UserSummary

A lightweight user reference embedded in polls and votes. Never contains contact details.

| Field         | Type             | Notes                                     |
| ------------- | ---------------- | ----------------------------------------- |
| `id`          | `string`         | UUID                                      |
| `displayName` | `string`         | Computed full name (e.g. `"Jane A. Doe"`) |
| `avatarUrl`   | `string \| null` | Absolute URL to profile picture           |

```ts
interface UserSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}
```

---

## UserEmail

A single email address belonging to a user. A user may have many; exactly one has `isActivated: true`.

| Field         | Type             | Notes                                                    |
| ------------- | ---------------- | -------------------------------------------------------- |
| `id`          | `string`         | UUID                                                     |
| `email`       | `string`         | Email address                                            |
| `isActivated` | `boolean`        | Whether this is the current active email for this user   |
| `verifiedAt`  | `string \| null` | When ownership was confirmed; `null` if not yet verified |
| `createdAt`   | `string`         | ISO 8601                                                 |
| `updatedAt`   | `string`         | ISO 8601                                                 |

> An email must be verified (`verifiedAt` non-null) before it can be activated.
> Only one email can be active at a time — activating a new one sets the previous `isActivated` to `false`.

```ts
interface UserEmail {
  id: string;
  email: string;
  isActivated: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## UserPhone

A single phone number belonging to a user. A user may have many; exactly one has `isActivated: true`.

| Field         | Type             | Notes                                                                 |
| ------------- | ---------------- | --------------------------------------------------------------------- |
| `id`          | `string`         | UUID                                                                  |
| `phone`       | `string`         | E.164 format (e.g. `+15550001234`)                                    |
| `isActivated` | `boolean`        | Whether this is the current active phone for this user                |
| `verifiedAt`  | `string \| null` | When ownership was confirmed via SMS code; `null` if not yet verified |
| `createdAt`   | `string`         | ISO 8601                                                              |
| `updatedAt`   | `string`         | ISO 8601                                                              |

> A phone must be verified (`verifiedAt` non-null) before it can be activated.
> Only one phone can be active at a time — activating a new one sets the previous `isActivated` to `false`.

```ts
interface UserPhone {
  id: string;
  phone: string;
  isActivated: boolean;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

---

## AuthResponse

Returned by `POST /auth/login` and `POST /auth/register`.

> **Token delivery:** Only `accessToken` appears in the JSON body. `refreshToken` is delivered exclusively as an `HttpOnly; Secure; SameSite=Strict` cookie (`Path=/auth/refresh`) — it is **never** present in the response body. Store `accessToken` in memory only (Pinia store); never write it to `localStorage`.

| Field         | Type     | Notes                                                                                   |
| ------------- | -------- | --------------------------------------------------------------------------------------- |
| `user`        | `User`   | Full user profile                                                                       |
| `accessToken` | `string` | Short-lived JWT (15 min); send as `Authorization: Bearer <token>`; store in memory only |

```ts
interface AuthResponse {
  user: User;
  accessToken: string;
  // refreshToken is delivered as an HttpOnly cookie, never in the response body
}
```

---

## Poll

The full poll object, including expanded options. Returned from `GET /polls/:pollId`, `POST /polls`, `PATCH /polls/:pollId`.

| Field             | Type             | Notes                                                                                                       |
| ----------------- | ---------------- | ----------------------------------------------------------------------------------------------------------- |
| `id`              | `string`         | UUID                                                                                                        |
| `title`           | `string`         | Poll question / title                                                                                       |
| `description`     | `string \| null` | Optional extra context                                                                                      |
| `reference`       | `string \| null` | URL to an external resource providing more context for the poll                                             |
| `status`          | `PollStatus`     | `"draft"` \| `"active"` \| `"closed"`                                                                       |
| `canChangeOption` | `boolean`        | Whether voters are allowed to change their vote after casting it                                            |
| `expiresAt`       | `string \| null` | ISO 8601; poll auto-closes at this time                                                                     |
| `createdAt`       | `string`         | ISO 8601                                                                                                    |
| `updatedAt`       | `string`         | ISO 8601                                                                                                    |
| `createdBy`       | `UserSummary`    | Poll creator                                                                                                |
| `options`         | `PollOption[]`   | All vote options                                                                                            |
| `votesCount`      | `number`         | Total votes cast across all options                                                                         |
| `myVote`          | `MyVote \| null` | Populated when the requester is authenticated; `null` if not yet voted; omitted entirely if unauthenticated |

```ts
interface Poll {
  id: string;
  title: string;
  description: string | null;
  reference: string | null;
  status: PollStatus;
  canChangeOption: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  options: PollOption[];
  votesCount: number;
  myVote?: MyVote | null;
}
```

---

## PollSummary

The lightweight poll representation returned in the `GET /polls` list. Does not include full `options` — only counts.

| Field             | Type             | Notes                                |
| ----------------- | ---------------- | ------------------------------------ |
| `id`              | `string`         | UUID                                 |
| `title`           | `string`         |                                      |
| `description`     | `string \| null` |                                      |
| `reference`       | `string \| null` | URL to an external resource          |
| `status`          | `PollStatus`     |                                      |
| `canChangeOption` | `boolean`        | Whether voters can change their vote |
| `expiresAt`       | `string \| null` |                                      |
| `createdAt`       | `string`         | ISO 8601                             |
| `updatedAt`       | `string`         | ISO 8601                             |
| `createdBy`       | `UserSummary`    |                                      |
| `optionsCount`    | `number`         | Number of options on the poll        |
| `votesCount`      | `number`         | Total votes cast                     |
| `myVote`          | `MyVote \| null` | Same rules as `Poll.myVote`          |

```ts
interface PollSummary {
  id: string;
  title: string;
  description: string | null;
  reference: string | null;
  status: PollStatus;
  canChangeOption: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  optionsCount: number;
  votesCount: number;
  myVote?: MyVote | null;
}
```

---

## PollStatus

```ts
type PollStatus = 'draft' | 'active' | 'closed';
```

| Value    | Description                                                                        |
| -------- | ---------------------------------------------------------------------------------- |
| `draft`  | Newly created; not yet visible for voting; can still be edited                     |
| `active` | Live; anyone logged in can vote; cannot be edited                                  |
| `closed` | Voting ended (manually or via `expiresAt`); immutable; results permanently visible |

State transitions: `draft → active` (creator activates) and `active → closed` (auto via `expiresAt`). No other transitions are allowed.

---

## PollOption

A single selectable option on a poll.

| Field         | Type               | Notes                                                                                      |
| ------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `id`          | `string`           | UUID                                                                                       |
| `label`       | `string`           | The option text                                                                            |
| `description` | `string \| null`   | Optional elaboration on the option                                                         |
| `reference`   | `string \| null`   | URL to an external resource related to this option                                         |
| `status`      | `PollOptionStatus` | `"active"` \| `"disabled"` — only settable while the poll is in `draft`                    |
| `votesCount`  | `number`           | How many votes this option received                                                        |
| `percentage`  | `number`           | Share of total poll votes; `0` when `votesCount` is `0`; two decimal places (e.g. `33.33`) |
| `createdAt`   | `string`           | ISO 8601                                                                                   |
| `updatedAt`   | `string`           | ISO 8601                                                                                   |

```ts
interface PollOption {
  id: string;
  label: string;
  description: string | null;
  reference: string | null;
  status: PollOptionStatus;
  votesCount: number;
  percentage: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## PollOptionStatus

```ts
type PollOptionStatus = 'active' | 'disabled';
```

| Value      | Description                                                                                |
| ---------- | ------------------------------------------------------------------------------------------ |
| `active`   | Visible and selectable by voters                                                           |
| `disabled` | Hidden from voters; excluded from vote counts; only configurable while the poll is `draft` |

---

## MyVote

Embedded directly in `Poll` and `PollSummary` so the frontend can determine — in a single request — whether the current user has voted and which option they chose. This avoids a separate call to the votes list and is especially important when `canChangeOption` is `true`, as the UI needs the current selection to render the change-vote control.

| Field         | Type     | Notes                                                                         |
| ------------- | -------- | ----------------------------------------------------------------------------- |
| `id`          | `string` | Vote UUID                                                                     |
| `optionId`    | `string` | UUID of the chosen option                                                     |
| `optionLabel` | `string` | Label of the chosen option (denormalised for convenience)                     |
| `createdAt`   | `string` | ISO 8601; when the original vote was cast                                     |
| `updatedAt`   | `string` | ISO 8601; when the vote was last changed; equals `createdAt` if never changed |

```ts
interface MyVote {
  id: string;
  optionId: string;
  optionLabel: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Vote

Full vote record, returned in the `GET /polls/:pollId/votes` list and in the `POST /polls/:pollId/votes` response.

| Field       | Type          | Notes                                                                         |
| ----------- | ------------- | ----------------------------------------------------------------------------- |
| `id`        | `string`      | UUID                                                                          |
| `voter`     | `UserSummary` | Who cast the vote                                                             |
| `option`    | `VoteOption`  | Which option was chosen                                                       |
| `createdAt` | `string`      | ISO 8601; when the original vote was cast                                     |
| `updatedAt` | `string`      | ISO 8601; when the vote was last changed; equals `createdAt` if never changed |

```ts
interface Vote {
  id: string;
  voter: UserSummary;
  option: VoteOption;
  createdAt: string;
  updatedAt: string;
}
```

---

## VoteOption

A minimal option reference embedded inside a `Vote`. Used instead of the full `PollOption` to keep vote list responses lean.

| Field   | Type     | Notes       |
| ------- | -------- | ----------- |
| `id`    | `string` | UUID        |
| `label` | `string` | Option text |

```ts
interface VoteOption {
  id: string;
  label: string;
}
```

---

## Paginated Response

All list endpoints return this envelope.

| Field        | Type     | Notes                            |
| ------------ | -------- | -------------------------------- |
| `data`       | `T[]`    | Array of the resource            |
| `meta.page`  | `number` | Current page (1-based)           |
| `meta.limit` | `number` | Items per page                   |
| `meta.total` | `number` | Total records matching the query |

```ts
interface Paginated<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## Error Response

All error responses share this shape.

| Field        | Type                 | Notes                                                                |
| ------------ | -------------------- | -------------------------------------------------------------------- |
| `statusCode` | `number`             | HTTP status code                                                     |
| `error`      | `string`             | HTTP status text                                                     |
| `message`    | `string \| string[]` | Human-readable reason; may be an array for validation errors (`400`) |

```ts
interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
}
```

| Status | Scenario                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------- |
| `400`  | Validation failed — `message` will be an array of field-level errors                                           |
| `401`  | Missing or expired access token                                                                                |
| `403`  | Authenticated but not authorised (e.g. editing another user's poll)                                            |
| `404`  | Resource not found                                                                                             |
| `409`  | Conflict — e.g. email already registered, user already voted on this poll                                      |
| `422`  | Business rule violation — e.g. editing an active poll, voting on a closed poll, activating an unverified email |
