## Poll Options

| Method | Endpoint                        | Auth | Description                                 |
| ------ | ------------------------------- | ---- | ------------------------------------------- |
| GET    | `/poll-options/ref/:reference`  | No   | Get a poll option by its unique reference   |

### GET `/poll-options/ref/:reference`

Fetch a single poll option by its unique reference string. This endpoint is public and returns all fields of the poll option.

**Response `200`**

```json
{
  "id": "uuid",
  "pollId": "uuid",
  "label": "string",
  "description": "string | null",
  "reference": "string",
  "status": "active | disabled",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Error `404`** — poll option not found

```json
{
  "statusCode": 404,
  "message": "Poll option not found",
  "error": "Not Found"
}

# Votu API Endpoints

Base URL: `http://localhost:3000` (development)

All authenticated requests require a `Bearer` token in the `Authorization` header.

---

## Authentication

> **Token Strategy:** `accessToken` (short-lived JWT, 15 min) is returned in the JSON body and must be stored in memory only (Pinia store — never `localStorage`). `refreshToken` (long-lived, opaque) is **never** in the response body — it is set by the server as an `HttpOnly; Secure; SameSite=Strict` cookie scoped to `Path=/auth/refresh`. `POST /auth/refresh` reads the cookie automatically; no body parameter required. This eliminates XSS exposure of the refresh token.

| Method | Endpoint         | Auth | Description                                                                   |
| ------ | ---------------- | ---- | ----------------------------------------------------------------------------- |
| POST   | `/auth/register` | No   | Register a new user                                                           |
| POST   | `/auth/login`    | No   | Login; returns `accessToken` in body, sets refresh token as `HttpOnly` cookie |
| POST   | `/auth/logout`   | Yes  | Invalidate session and clear the refresh token cookie                         |
| POST   | `/auth/refresh`  | No   | Rotate refresh token cookie and return a new `accessToken`                    |

### POST `/auth/register`

**Body**

```json
{
  "firstName": "string",
  "middleName": "string (optional)",
  "lastName": "string",
  "email": "string",
  "password": "string"
}
```

**Response `201`** — user is automatically logged in; `accessToken` returned in body; refresh token set as `HttpOnly` cookie.

```json
{
  "user": {
    "id": "uuid",
    "firstName": "string",
    "middleName": "string | null",
    "lastName": "string",
    "displayName": "string",
    "avatarUrl": null,
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "emails": [
      {
        "id": "uuid",
        "email": "string",
        "isActivated": true,
        "verifiedAt": null,
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "phones": []
  },
  "accessToken": "string"
}
```

> `Set-Cookie: refreshToken=<opaque_token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`

### POST `/auth/login`

> **Rate limit:** 5 failed attempts per IP per 15 minutes. Returns `429 Too Many Requests` when exceeded.

**Body**

```json
{
  "email": "string",
  "password": "string"
}
```

**Response `200`** — returns full user profile so the frontend can hydrate the session in one request; `accessToken` returned in body; refresh token set as `HttpOnly` cookie.

```json
{
  "user": {
    "id": "uuid",
    "firstName": "string",
    "middleName": "string | null",
    "lastName": "string",
    "displayName": "string",
    "avatarUrl": "string | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "emails": [
      {
        "id": "uuid",
        "email": "string",
        "isActivated": true,
        "verifiedAt": "ISO8601",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "phones": [
      {
        "id": "uuid",
        "phone": "+15550001234",
        "isActivated": false,
        "verifiedAt": "ISO8601",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ]
  },
  "accessToken": "string"
}
```

> `Set-Cookie: refreshToken=<opaque_token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`

### POST `/auth/refresh`

No body required. The refresh token is read automatically from the `HttpOnly` cookie. The previous token is invalidated immediately (token rotation — replay protection).

**Response `200`**

```json
{
  "accessToken": "string"
}
```

> `Set-Cookie: refreshToken=<new_token>; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh`

**Error `401`** — cookie missing, token expired, or token already rotated.

### POST `/auth/logout`

Invalidates the refresh token server-side and clears the `HttpOnly` cookie. The `accessToken` cannot be server-side revoked (short-lived JWT); the frontend must discard it from memory immediately.

No body required.

**Response `204`** — no content.

> `Set-Cookie: refreshToken=; HttpOnly; Secure; SameSite=Strict; Path=/auth/refresh; Max-Age=0`

---

## Current User

| Method | Endpoint    | Auth | Description                 |
| ------ | ----------- | ---- | --------------------------- |
| GET    | `/users/me` | Yes  | Get current user profile    |
| PATCH  | `/users/me` | Yes  | Update current user profile |

### GET `/users/me`

**Response `200`**

```json
{
  "id": "uuid",
  "firstName": "string",
  "middleName": "string | null",
  "lastName": "string",
  "displayName": "string",
  "avatarUrl": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "emails": [
    {
      "id": "uuid",
      "email": "string",
      "isActivated": true,
      "verifiedAt": "ISO8601",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "phones": [
    {
      "id": "uuid",
      "phone": "+15550001234",
      "isActivated": false,
      "verifiedAt": "ISO8601",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ]
}
```

### PATCH `/users/me`

**Body** (all fields optional)

```json
{
  "firstName": "string",
  "middleName": "string | null",
  "lastName": "string",
  "avatarUrl": "string | null"
}
```

> `avatarUrl` constraints: `https://` scheme only; max 2048 characters; must match a server-enforced allowlist of permitted CDN domains. Passing `null` clears the avatar. Invalid URLs return `400`.

**Response `200`** — updated user object (same shape as GET `/users/me`)

---

## User Emails

| Method | Endpoint                                        | Auth | Description                      |
| ------ | ----------------------------------------------- | ---- | -------------------------------- |
| GET    | `/users/me/emails`                              | Yes  | List all emails for current user |
| POST   | `/users/me/emails`                              | Yes  | Add a new email address          |
| POST   | `/users/me/emails/:emailId/verify`              | Yes  | Verify an email with a code      |
| PATCH  | `/users/me/emails/:emailId/activate`            | Yes  | Set email as the active one      |
| POST   | `/users/me/emails/:emailId/resend-verification` | Yes  | Resend verification code         |

### GET `/users/me/emails`

**Response `200`** — array of all email addresses belonging to the current user

```json
[
  {
    "id": "uuid",
    "email": "string",
    "isActivated": true,
    "verifiedAt": "ISO8601 | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

### POST `/users/me/emails`

**Body**

```json
{
  "email": "string"
}
```

**Response `201`** — a verification code is dispatched to the provided address immediately

```json
{
  "id": "uuid",
  "email": "string",
  "isActivated": false,
  "verifiedAt": null,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### POST `/users/me/emails/:emailId/verify`

> **Code spec:** 6-digit numeric string (e.g. `"123456"`). Expires 10 minutes after dispatch. Max 5 incorrect attempts before the code is invalidated; a new code must be requested via `resend-verification`.

**Body**

```json
{
  "code": "string"
}
```

**Response `200`**

```json
{
  "id": "uuid",
  "email": "string",
  "isActivated": false,
  "verifiedAt": "ISO8601",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### PATCH `/users/me/emails/:emailId/activate`

No body required. `verifiedAt` must be non-null. Activating one email sets the previous `isActivated` to `false`.

**Response `200`**

```json
{
  "id": "uuid",
  "email": "string",
  "isActivated": true,
  "verifiedAt": "ISO8601",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### POST `/users/me/emails/:emailId/resend-verification`

> **Rate limit:** 3 requests per email address per hour. Returns `429` when exceeded.

No body required. Dispatches a new 6-digit verification code to the address, invalidating any previously issued code.

**Response `204`** — no content.

**Error `409`** — email is already verified.

---

## User Phone Numbers

| Method | Endpoint                                        | Auth | Description                             |
| ------ | ----------------------------------------------- | ---- | --------------------------------------- |
| GET    | `/users/me/phones`                              | Yes  | List all phone numbers for current user |
| POST   | `/users/me/phones`                              | Yes  | Add a new phone number                  |
| POST   | `/users/me/phones/:phoneId/verify`              | Yes  | Verify a phone number with a code       |
| PATCH  | `/users/me/phones/:phoneId/activate`            | Yes  | Set phone as the active one             |
| POST   | `/users/me/phones/:phoneId/resend-verification` | Yes  | Resend verification code                |

### GET `/users/me/phones`

**Response `200`** — array of all phone numbers belonging to the current user

```json
[
  {
    "id": "uuid",
    "phone": "+15550001234",
    "isActivated": true,
    "verifiedAt": "ISO8601 | null",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
]
```

### POST `/users/me/phones`

Phone number must be in E.164 format (e.g. `+15550001234`).

**Body**

```json
{
  "phone": "+15550001234"
}
```

**Response `201`** — a verification code is dispatched via SMS immediately

```json
{
  "id": "uuid",
  "phone": "+15550001234",
  "isActivated": false,
  "verifiedAt": null,
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### POST `/users/me/phones/:phoneId/verify`

> **Code spec:** 6-digit numeric string (e.g. `"654321"`). Expires 10 minutes after dispatch. Max 5 incorrect attempts before the code is invalidated; a new code must be requested via `resend-verification`.

**Body**

```json
{
  "code": "string"
}
```

**Response `200`**

```json
{
  "id": "uuid",
  "phone": "+15550001234",
  "isActivated": false,
  "verifiedAt": "ISO8601",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### PATCH `/users/me/phones/:phoneId/activate`

No body required. `verifiedAt` must be non-null. Activating one phone sets the previous `isActivated` to `false`.

**Response `200`**

```json
{
  "id": "uuid",
  "phone": "+15550001234",
  "isActivated": true,
  "verifiedAt": "ISO8601",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

### POST `/users/me/phones/:phoneId/resend-verification`

> **Rate limit:** 3 requests per phone number per hour. Returns `429` when exceeded. Each resend incurs an SMS delivery cost — enforce this limit strictly.

No body required. Dispatches a new 6-digit verification code via SMS, invalidating any previously issued code.

**Response `204`** — no content.

**Error `409`** — phone number is already verified.

---

## Polls

| Method | Endpoint                  | Auth | Description                          |
| ------ | ------------------------- | ---- | ------------------------------------ |
| GET    | `/polls`                  | No   | List / search polls (paginated)      |
| GET    | `/polls/:pollId`          | No   | Get a single poll with its options   |
| POST   | `/polls`                  | Yes  | Create a new poll                    |
| PATCH  | `/polls/:pollId`          | Yes  | Update a poll (only if `draft`)      |
| PATCH  | `/polls/:pollId/activate` | Yes  | Activate a draft poll (creator only) |

> **Poll statuses:** `draft` → `active` → `closed`
>
> - A poll is created as `draft`.
> - Only the creator can activate it.
> - Active polls are automatically closed after `expiresAt` if set; they cannot be manually reopened or modified.
> - Closed polls are immutable.

### GET `/polls`

**Query params**

| Param    | Type                        | Description                            |
| -------- | --------------------------- | -------------------------------------- |
| `page`   | number                      | Page number (default: 1)               |
| `limit`  | number                      | Items per page (default: 20, max: 100) |
| `status` | `draft \| active \| closed` | Filter by status                       |
| `q`      | string                      | Search by title                        |

When the request includes a valid `Authorization` header, `myVote` is populated for polls the user has voted on.

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "description": "string | null",
      "status": "active",
      "expiresAt": "ISO8601 | null",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601",
      "createdBy": {
        "id": "uuid",
        "displayName": "string",
        "avatarUrl": "string | null"
      },
      "reference": "string | null",
      "canChangeOption": false,
      "optionsCount": 3,
      "votesCount": 42,
      "myVote": {
        "id": "uuid",
        "optionId": "uuid",
        "optionLabel": "string",
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

`myVote` is `null` if the user has not yet voted, or omitted entirely for unauthenticated requests.

### GET `/polls/:pollId`

When the request includes a valid `Authorization` header, `myVote` is populated if the user has voted.

**Response `200`**

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "active",
  "expiresAt": "ISO8601 | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "createdBy": {
    "id": "uuid",
    "displayName": "string",
    "avatarUrl": "string | null"
  },
  "reference": "string | null",
  "canChangeOption": false,
  "options": [
    {
      "id": "uuid",
      "label": "string",
      "description": "string | null",
      "reference": "string | null",
      "status": "active",
      "votesCount": 10,
      "percentage": 23.81,
      "createdAt": "ISO8601"
    }
  ],
  "votesCount": 42,
  "myVote": {
    "id": "uuid",
    "optionId": "uuid",
    "optionLabel": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
}
```

`myVote` is `null` if the user has not yet voted, or omitted entirely for unauthenticated requests.
`percentage` is `0` when `votesCount` is `0` (no division by zero).
Disabled options (`status: "disabled"`) are excluded from the response once the poll is `active` or `closed`.

### POST `/polls`

**Body**

```json
{
  "title": "string",
  "description": "string (optional)",
  "reference": "string (optional)",
  "canChangeOption": false,
  "expiresAt": "ISO8601 (optional)",
  "options": [
    {
      "label": "string",
      "description": "string (optional)",
      "reference": "string (optional)"
    }
  ]
}
```

`options` must contain at least 2 and at most 20 items. Options default to `status: "active"`.

**Response `201`** — full poll object (same shape as GET `/polls/:pollId`)

### PATCH `/polls/:pollId`

Only allowed when `status === "draft"`. If `options` is provided, it fully replaces the existing options list (at least 2, at most 20 items required).

**Body** (all fields optional)

```json
{
  "title": "string",
  "description": "string | null",
  "reference": "string | null",
  "canChangeOption": false,
  "expiresAt": "ISO8601 | null",
  "options": [
    {
      "label": "string",
      "description": "string | null",
      "reference": "string | null",
      "status": "active | disabled"
    }
  ]
}
```

**Response `200`** — updated poll object

### PATCH `/polls/:pollId/activate`

No body required. Only the creator can call this. Poll must be in `draft` status.

**Response `200`** — full poll object (same shape as `GET /polls/:pollId`), with `status: "active"`. Returning the full object avoids a follow-up `GET` and allows the frontend to update its local state atomically.

```json
{
  "id": "uuid",
  "title": "string",
  "description": "string | null",
  "status": "active",
  "canChangeOption": false,
  "expiresAt": "ISO8601 | null",
  "reference": "string | null",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601",
  "createdBy": {
    "id": "uuid",
    "displayName": "string",
    "avatarUrl": "string | null"
  },
  "options": [
    {
      "id": "uuid",
      "label": "string",
      "description": "string | null",
      "reference": "string | null",
      "status": "active",
      "votesCount": 0,
      "percentage": 0,
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "votesCount": 0,
  "myVote": null
}
```

---


## Votes

| Method | Endpoint     | Auth | Description                                                                 |
| ------ | ------------ | ---- | --------------------------------------------------------------------------- |
| GET    | `/votes`     | No   | List votes, filterable by poll, option, or user reference (public)          |
| GET    | `/polls/:pollId/votes` | No   | List all votes on a poll (legacy, public)                                  |
| POST   | `/polls/:pollId/votes` | Yes  | Cast a vote on an active poll                                              |
| PATCH  | `/polls/:pollId/votes` | Yes  | Change the current user's vote (only when `canChangeOption` is `true`)     |

> A user can only vote once per poll. Votes cannot be removed. Votes can only be changed when the poll's `canChangeOption` is `true` and the poll is still `active`.

### GET `/votes`

**Query params**

| Param               | Type   | Description                                                      |
| ------------------- | ------ | ---------------------------------------------------------------- |
| `page`              | number | Page number (default: 1)                                         |
| `limit`             | number | Items per page (default: 20, max: 100)                           |
| `pollReference`     | string | Filter by poll reference (optional, replaces pollId path param)   |
| `pollOptionReference` | string | Filter by poll option reference (optional)                        |
| `userReference`     | string | Filter by user reference (optional)                               |

**Response `200`**

```json
{
  "data": [
    {
      "id": "uuid",
      "voter": {
        "id": "uuid",
        "reference": "string",
        "displayName": "string",
        "avatarUrl": "string | null"
      },
      "option": {
        "id": "uuid",
        "reference": "string",
        "label": "string"
      },
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 42
  }
}
```

---

### User Reference Field

All user objects now include a globally unique, opaque `reference` string (e.g. `nanoid`) for public identification and filtering. Use this value for cross-entity queries and as a stable identifier in URLs or query params. Example:

```json
{
  "id": "uuid",
  "reference": "V1StGXR8_Z5jdHi6B-myT",
  "firstName": "string",
  ...
}
```

### POST `/polls/:pollId/votes`

Poll must be `active`. One vote per user per poll.

**Body**

```json
{
  "optionId": "uuid"
}
```

**Response `201`** — returns the updated poll so the frontend can refresh vote counts in one round-trip

```json
{
  "vote": {
    "id": "uuid",
    "option": { "id": "uuid", "label": "string" },
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "poll": {
    "id": "uuid",
    "votesCount": 43,
    "options": [
      {
        "id": "uuid",
        "label": "string",
        "votesCount": 11,
        "percentage": 25.58
      }
    ],
    "myVote": {
      "id": "uuid",
      "optionId": "uuid",
      "optionLabel": "string",
      "createdAt": "ISO8601",
      "updatedAt": "ISO8601"
    }
  }
}
```

### PATCH `/polls/:pollId/votes`

Only allowed when poll is `active` and `canChangeOption` is `true`. The user must have already voted.

**Body**

```json
{
  "optionId": "uuid"
}
```

**Response `200`** — same envelope shape as `POST /polls/:pollId/votes`; `vote.updatedAt` will reflect the change time

---

## Common Error Responses

| Status | Meaning                                                                               |
| ------ | ------------------------------------------------------------------------------------- |
| `400`  | Validation error — check `errors` array in response body                              |
| `401`  | Unauthenticated — missing or invalid access token                                     |
| `403`  | Forbidden — authenticated but not allowed (e.g. not the poll creator)                 |
| `404`  | Resource not found                                                                    |
| `409`  | Conflict — e.g. email already registered, already voted                               |
| `422`  | Business rule violation — e.g. trying to edit an active poll, voting on a closed poll |
| `429`  | Rate limit exceeded — back off and retry after the `Retry-After` header duration      |

**Error body shape**

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Poll is not active"
}
```
