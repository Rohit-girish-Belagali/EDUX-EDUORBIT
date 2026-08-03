# EduOrbit Friends, Group Chat & Class Scheduling — Feature Plan

> **Goal:** Let users find each other via a unique friend code, send/accept friend
> requests, chat 1:1 or in groups, tag messages as doubts, and schedule a free
> class with an auto-generated video link — all inside the existing EDUX app.
>
> **Approach:** Reuse what already exists — the JSON user store
> (`edux/multi_user/identity.py`), the raw-`sqlite3` persistence idiom already
> used for chat history (`edux/services/session/sqlite_store.py`), and the
> `ProgressBroadcaster` WebSocket-room pattern
> (`edux/api/utils/progress_broadcaster.py`) — generalized from "one AI chat
> per user" to "N humans in a room." No new infra (no Redis, no external chat
> service), no new paid dependency. Video links use free public Jitsi rooms
> (`meet.jit.si/<random-slug>`) — zero cost, zero API keys.

---

## Data Model (new SQLite tables)

New store module: `edux/services/social/store.py`, same `CREATE TABLE IF NOT
EXISTS` + `asyncio.Lock` idiom as `sqlite_store.py`. Lives in its own DB file
(`data/user/social.db`) so it doesn't collide with the existing chat-session
schema.

```sql
-- friend_requests: pending/accepted/declined requests between two users
CREATE TABLE IF NOT EXISTS friend_requests (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | declined
    created_at TEXT NOT NULL,
    responded_at TEXT
);

-- friendships: created only once a request is accepted
CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL,
    user_b_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- chat_rooms: a direct (2-person) or group (N-person) room
CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,
    name TEXT,                              -- NULL for direct rooms
    type TEXT NOT NULL,                     -- 'direct' | 'group'
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_room_members (
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',    -- 'owner' | 'member'
    joined_at TEXT NOT NULL,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_invite_codes (
    room_id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    sender_id TEXT,                         -- NULL = system message
    body TEXT NOT NULL,
    is_doubt INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS class_schedules (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    created_by TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    video_link TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
    created_at TEXT NOT NULL
);
```

`edux/multi_user/identity.py` also gets one new field on the canonical user
record: `friend_code` (short, unique, human-typeable — e.g. `EDU-7F3K2Q`),
generated once at account creation and collision-checked against
`users.json`.

---

## Phase 1 — Friend Codes & Requests (request → accept, not instant-connect)

**Estimated tokens:** ~150k · **Estimated wall-clock:** 2–3 hours

### 1.1 User friend code
- `identity.py`: add `friend_code` to `_canonical_record`; generate on
  `register()` via a short collision-checked code (base32, 6–8 chars).
- `auth.py`: extend the "my profile" response to include `friend_code`.

### 1.2 Social store
- `edux/services/social/store.py`: `SocialStore` class, same shape as
  `SQLiteSessionStore` — `_initialize()` runs the `CREATE TABLE IF NOT
  EXISTS` block above, all writes behind `asyncio.Lock`.

### 1.3 Friend-request endpoints
New router `edux/api/routers/social.py`, mounted at `/api/v1/social`:
- `GET /me/code` — return your own friend code.
- `POST /friend-requests {code}` — look up the target user by `friend_code`,
  create a `pending` row in `friend_requests`. Reject self-requests and
  duplicate pending requests.
- `GET /friend-requests` — list incoming (`to_user_id = me`) and outgoing
  (`from_user_id = me`) pending requests.
- `POST /friend-requests/{id}/accept` — only the recipient may accept;
  inserts a `friendships` row **and** auto-creates a `direct` `chat_rooms`
  row with both users as members, in the same transaction.
- `POST /friend-requests/{id}/decline` — recipient only, marks `declined`.
- `GET /friends` — list accepted friends (join `friendships` → user records
  for display name/avatar).

### 1.4 Frontend: Friends page
- New sidebar entry "Friends" (`apps/web/app/(app)/friends/page.tsx`,
  mirroring the existing `Partners` page's layout conventions).
- Sections: **Your code** (copy-to-clipboard), **Add a friend** (code input →
  `POST /friend-requests`), **Incoming requests** (accept/decline buttons),
  **Your friends** (list, click-through to a direct chat in Phase 3).

**Acceptance:** two accounts can exchange codes, send/accept/decline a
request, and end up with a `friendships` row + an auto-created empty direct
room. No messaging yet — that's Phase 3.

---

## Phase 2 — Group Rooms

**Estimated tokens:** ~150k · **Estimated wall-clock:** 2–3 hours

### 2.1 Group creation & membership endpoints
Extending `social.py`:
- `POST /rooms {name}` — creates a `group` room, creator becomes `owner` +
  first member, and a `group_invite_codes` row is generated.
- `POST /rooms/{room_id}/invite-code/regenerate` — owner-only, rotates the
  code (invalidates the old one).
- `POST /rooms/join {code}` — any authenticated user joins the group named
  by that invite code.
- `POST /rooms/{room_id}/members {user_id}` — owner adds an existing friend
  directly (no code needed if they're already a friend).
- `DELETE /rooms/{room_id}/members/{user_id}` — leave, or owner removes
  someone.
- `GET /rooms` — list every room (direct + group) the caller is a member of,
  with a last-message preview (`ORDER BY chat_messages.created_at DESC LIMIT
  1` per room).

### 2.2 Frontend: group management
- "New Group" modal — name + optional initial members picked from the
  friends list.
- Group settings panel — member list, invite code (copy/regenerate), leave
  group (owner sees "delete group" instead).
- Rooms list in the Friends/Chat sidebar shows both direct and group rooms
  together, sorted by last activity.

**Acceptance:** a user can create a named group, share its invite code, have
another user join via that code, and see the group in both members' room
lists.

---

## Phase 3 — Realtime Messaging

**Estimated tokens:** ~250k · **Estimated wall-clock:** 4–5 hours

### 3.1 Backend: room broadcaster
- `edux/api/utils/room_broadcaster.py` — generalize
  `ProgressBroadcaster`'s `dict[str, set[WebSocket]]` + `asyncio.Lock`
  pattern from "kb_name" to "room_id"; add a membership check (query
  `chat_room_members`) before allowing a socket to subscribe.
- `WS /api/v1/social/rooms/{room_id}/ws` in `social.py`, gated by
  `ws_require_auth` (same helper every other WS route in the codebase
  already uses). On connect: verify membership, replay recent history (last
  N messages) on open. On `{"type": "message", "body": ..., "is_doubt":
  bool}`: persist to `chat_messages`, broadcast to all connected members of
  that room.
- `GET /rooms/{room_id}/messages?before=<id>&limit=50` — paginated history
  for members who load a room while offline peers were talking, and for
  initial page load before the socket connects.

### 3.2 "Doubt" tagging
- Composer has a "Mark as doubt" toggle; doubt messages get `is_doubt = 1`.
- Each room has a "Doubts" filter/tab (`GET
  /rooms/{room_id}/messages?doubts_only=true`) so a group can scan
  unanswered questions without scrolling full chat history.

### 3.3 Frontend: chat client & UI
- `apps/web/lib/social-ws.ts` — new WS client class modeled directly on
  `unified-ws.ts` (heartbeat, exponential-backoff reconnect), but scoped to
  one room at a time (connect on room open, disconnect on room switch/unmount).
- `apps/web/context/SocialChatContext.tsx` — provider exposing
  `messages`, `sendMessage(body, isDoubt)`, `connectionState` per active
  room, same shape as `UnifiedChatContext` for consistency.
- Chat panel component: message list (doubt messages visually tagged),
  composer with the doubt toggle, member avatars/typing area.

**Acceptance:** two or more members of a room see each other's messages in
real time, history persists and loads on reconnect, and doubt-tagged
messages are visually distinct and filterable.

---

## Phase 4 — Schedule a Free Class (auto link generation)

**Estimated tokens:** ~120k · **Estimated wall-clock:** 2 hours

### 4.1 Backend
- `POST /rooms/{room_id}/schedule {scheduled_at}` — any member (or
  owner-only for groups, your call) creates a `class_schedules` row with
  `video_link = f"https://meet.jit.si/edux-{uuid4().hex[:10]}"` (free,
  keyless, works immediately — no external account needed). Inserts a
  system message (`sender_id = NULL`) into `chat_messages`: "📅 Class
  scheduled for `<time>` — [Join](`<link>`)", and broadcasts it over the
  room's live WS the same as a normal message.
- `GET /rooms/{room_id}/schedule` — upcoming + past classes for the room.
- `POST /rooms/{room_id}/schedule/{id}/cancel`.
- Optional follow-up: mirror the scheduled class into each member's existing
  personal Timetable (`edux/api/routers/timetable.py`) so it shows up
  alongside their regular study schedule, not just in chat.

### 4.2 Frontend
- "Schedule class" button in the room header → date/time picker modal →
  `POST .../schedule`.
- The resulting system message renders as a card (time + a "Join" button
  that opens the Jitsi link in a new tab), not just plain text.
- "Upcoming classes" strip at the top of the room, sourced from `GET
  .../schedule`.

**Acceptance:** any room (direct or group) can schedule a class; a link is
generated automatically with no manual setup, posted into chat, and joinable
by every member with one click.

**Known limitation to flag before shipping:** `meet.jit.si` rooms are
unauthenticated — anyone with the link can join. Fine for an MVP; if that
becomes a problem later, options are self-hosting Jitsi or switching to a
keyed provider (Daily.co, Whereby) — both add cost/complexity and are
explicitly out of scope for this plan.

---

## Summary

| Phase | What ships | New backend files | New frontend surface |
|---|---|---|---|
| 1 | Friend codes, request/accept | `social/store.py`, `routers/social.py` (partial) | Friends page |
| 2 | Group rooms + invite codes | `routers/social.py` (extended) | Group creation/settings UI |
| 3 | Realtime chat + doubt tagging | `room_broadcaster.py`, WS route | Chat panel, `social-ws.ts`, `SocialChatContext` |
| 4 | Auto-generated class links | schedule endpoints | Schedule modal, upcoming-classes strip |

Total estimate: **~670k tokens, ~10–13 hours** across 4 independently
shippable phases.

---

## Key Dependency Map

```
identity.py (friend_code field)
        │
        ▼
social/store.py ──────────────┐
        │                     │
        ▼                     ▼
routers/social.py      room_broadcaster.py
        │                     │
        ▼                     ▼
apps/web/lib/social-ws.ts ◄───┘
        │
        ▼
SocialChatContext.tsx → Friends page / Chat panel / Schedule modal
```

Nothing here touches the existing `unified_ws.py` (AI chat) path — this is a
parallel system that happens to reuse the same auth helper
(`ws_require_auth`) and the same broadcaster *pattern*, not the same code.

---

## Quick-start Commands (after plan is approved)

```bash
# Phase 1 scaffold
touch edux/services/social/store.py edux/api/routers/social.py
mkdir -p apps/web/app/\(app\)/friends

# run backend with the new router mounted, then smoke-test:
curl -X GET http://localhost:8001/api/v1/social/me/code -b cookies.txt
```
