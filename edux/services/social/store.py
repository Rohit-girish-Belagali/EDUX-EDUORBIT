"""
SQLite-backed store for friend requests, friendships, and chat rooms.

Deliberately kept separate from ``SQLiteSessionStore`` (chat history) and
scoped at ``data/system/social/`` rather than any per-user workspace: friend
requests, friendships, and rooms are inherently cross-user relationships, so
they must live in one shared table, not duplicated inside each user's
per-user ``PathService`` root (see ``edux/multi_user/paths.py``).
"""

from __future__ import annotations

import asyncio
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
import sqlite3
import time
import uuid
from typing import Any

from edux.multi_user.paths import SYSTEM_ROOT

SOCIAL_DIR = SYSTEM_ROOT / "social"
SOCIAL_DB = SOCIAL_DIR / "social.db"


class FriendRequestError(Exception):
    """Raised for invalid friend-request operations (already friends, etc.)."""


class RoomError(Exception):
    """Raised for invalid room operations (not a member, bad invite code, etc.)."""


def _new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


class SocialStore:
    """Persist friend requests, friendships, and chat rooms in SQLite."""

    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = db_path or SOCIAL_DB
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = asyncio.Lock()
        self._initialize()

    def _initialize(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS friend_requests (
                    id TEXT PRIMARY KEY,
                    from_user_id TEXT NOT NULL,
                    to_user_id TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'pending',
                    created_at REAL NOT NULL,
                    responded_at REAL
                );

                CREATE INDEX IF NOT EXISTS idx_friend_requests_to
                    ON friend_requests(to_user_id, status);
                CREATE INDEX IF NOT EXISTS idx_friend_requests_from
                    ON friend_requests(from_user_id, status);

                CREATE TABLE IF NOT EXISTS friendships (
                    id TEXT PRIMARY KEY,
                    user_a_id TEXT NOT NULL,
                    user_b_id TEXT NOT NULL,
                    created_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_friendships_a ON friendships(user_a_id);
                CREATE INDEX IF NOT EXISTS idx_friendships_b ON friendships(user_b_id);

                CREATE TABLE IF NOT EXISTS chat_rooms (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    type TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    created_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS chat_room_members (
                    room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                    user_id TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'member',
                    joined_at REAL NOT NULL,
                    PRIMARY KEY (room_id, user_id)
                );

                CREATE INDEX IF NOT EXISTS idx_room_members_user
                    ON chat_room_members(user_id);

                CREATE TABLE IF NOT EXISTS group_invite_codes (
                    room_id TEXT PRIMARY KEY REFERENCES chat_rooms(id) ON DELETE CASCADE,
                    code TEXT UNIQUE NOT NULL,
                    created_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS chat_messages (
                    id TEXT PRIMARY KEY,
                    room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
                    sender_id TEXT,
                    body TEXT NOT NULL,
                    is_doubt INTEGER NOT NULL DEFAULT 0,
                    created_at REAL NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_messages_room_created
                    ON chat_messages(room_id, created_at);
                """
            )

    async def _run(self, fn, *args):
        async with self._lock:
            return await asyncio.to_thread(fn, *args)

    @contextmanager
    def _connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    # -- Friend requests ---------------------------------------------------

    def _pair_key(self, a: str, b: str) -> tuple[str, str]:
        return (a, b) if a <= b else (b, a)

    def _are_friends_sync(self, conn: sqlite3.Connection, a: str, b: str) -> bool:
        lo, hi = self._pair_key(a, b)
        row = conn.execute(
            "SELECT 1 FROM friendships WHERE user_a_id = ? AND user_b_id = ? LIMIT 1",
            (lo, hi),
        ).fetchone()
        return row is not None

    def _create_friend_request_sync(self, from_user_id: str, to_user_id: str) -> dict[str, Any]:
        if from_user_id == to_user_id:
            raise FriendRequestError("You cannot send a friend request to yourself")
        with self._connect() as conn:
            if self._are_friends_sync(conn, from_user_id, to_user_id):
                raise FriendRequestError("You are already friends")
            existing = conn.execute(
                """
                SELECT id FROM friend_requests
                WHERE status = 'pending'
                  AND ((from_user_id = ? AND to_user_id = ?)
                    OR (from_user_id = ? AND to_user_id = ?))
                """,
                (from_user_id, to_user_id, to_user_id, from_user_id),
            ).fetchone()
            if existing:
                raise FriendRequestError("A pending request already exists between you two")
            now = time.time()
            request_id = _new_id("fr")
            conn.execute(
                """
                INSERT INTO friend_requests (id, from_user_id, to_user_id, status, created_at)
                VALUES (?, ?, ?, 'pending', ?)
                """,
                (request_id, from_user_id, to_user_id, now),
            )
            return {
                "id": request_id,
                "from_user_id": from_user_id,
                "to_user_id": to_user_id,
                "status": "pending",
                "created_at": now,
                "responded_at": None,
            }

    async def create_friend_request(self, from_user_id: str, to_user_id: str) -> dict[str, Any]:
        return await self._run(self._create_friend_request_sync, from_user_id, to_user_id)

    def _list_friend_requests_sync(self, user_id: str) -> dict[str, list[dict[str, Any]]]:
        with self._connect() as conn:
            incoming = conn.execute(
                """
                SELECT id, from_user_id, to_user_id, status, created_at, responded_at
                FROM friend_requests WHERE to_user_id = ? AND status = 'pending'
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
            outgoing = conn.execute(
                """
                SELECT id, from_user_id, to_user_id, status, created_at, responded_at
                FROM friend_requests WHERE from_user_id = ? AND status = 'pending'
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
        return {
            "incoming": [dict(row) for row in incoming],
            "outgoing": [dict(row) for row in outgoing],
        }

    async def list_friend_requests(self, user_id: str) -> dict[str, list[dict[str, Any]]]:
        return await self._run(self._list_friend_requests_sync, user_id)

    def _respond_friend_request_sync(
        self, request_id: str, responder_user_id: str, accept: bool
    ) -> dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT * FROM friend_requests WHERE id = ?", (request_id,)
            ).fetchone()
            if row is None:
                raise FriendRequestError("Friend request not found")
            request = dict(row)
            if request["to_user_id"] != responder_user_id:
                raise FriendRequestError("Only the recipient can respond to this request")
            if request["status"] != "pending":
                raise FriendRequestError("This request has already been responded to")

            now = time.time()
            new_status = "accepted" if accept else "declined"
            conn.execute(
                "UPDATE friend_requests SET status = ?, responded_at = ? WHERE id = ?",
                (new_status, now, request_id),
            )
            request["status"] = new_status
            request["responded_at"] = now

            room_id = None
            if accept:
                a, b = request["from_user_id"], request["to_user_id"]
                lo, hi = self._pair_key(a, b)
                conn.execute(
                    "INSERT INTO friendships (id, user_a_id, user_b_id, created_at) VALUES (?, ?, ?, ?)",
                    (_new_id("fs"), lo, hi, now),
                )
                room_id = _new_id("room")
                conn.execute(
                    "INSERT INTO chat_rooms (id, name, type, created_by, created_at) VALUES (?, NULL, 'direct', ?, ?)",
                    (room_id, responder_user_id, now),
                )
                conn.executemany(
                    "INSERT INTO chat_room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
                    [(room_id, a, now), (room_id, b, now)],
                )
            request["room_id"] = room_id
            return request

    async def respond_friend_request(
        self, request_id: str, responder_user_id: str, accept: bool
    ) -> dict[str, Any]:
        return await self._run(
            self._respond_friend_request_sync, request_id, responder_user_id, accept
        )

    def _list_friends_sync(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT id, user_a_id, user_b_id, created_at FROM friendships
                WHERE user_a_id = ? OR user_b_id = ?
                ORDER BY created_at DESC
                """,
                (user_id, user_id),
            ).fetchall()
        return [
            {
                "friendship_id": row["id"],
                "friend_user_id": row["user_b_id"] if row["user_a_id"] == user_id else row["user_a_id"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]

    async def list_friends(self, user_id: str) -> list[dict[str, Any]]:
        return await self._run(self._list_friends_sync, user_id)

    # -- Rooms ---------------------------------------------------------

    def _create_group_room_sync(self, name: str, created_by: str) -> dict[str, Any]:
        now = time.time()
        room_id = _new_id("room")
        code = _new_id("inv")[:12]
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO chat_rooms (id, name, type, created_by, created_at) VALUES (?, ?, 'group', ?, ?)",
                (room_id, name, created_by, now),
            )
            conn.execute(
                "INSERT INTO chat_room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'owner', ?)",
                (room_id, created_by, now),
            )
            conn.execute(
                "INSERT INTO group_invite_codes (room_id, code, created_at) VALUES (?, ?, ?)",
                (room_id, code, now),
            )
        return {
            "id": room_id,
            "name": name,
            "type": "group",
            "created_by": created_by,
            "created_at": now,
            "invite_code": code,
        }

    async def create_group_room(self, name: str, created_by: str) -> dict[str, Any]:
        return await self._run(self._create_group_room_sync, name, created_by)

    def _regenerate_invite_code_sync(self, room_id: str, requester_id: str) -> str:
        with self._connect() as conn:
            self._require_owner_sync(conn, room_id, requester_id)
            code = _new_id("inv")[:12]
            conn.execute(
                "INSERT INTO group_invite_codes (room_id, code, created_at) VALUES (?, ?, ?) "
                "ON CONFLICT(room_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at",
                (room_id, code, time.time()),
            )
        return code

    async def regenerate_invite_code(self, room_id: str, requester_id: str) -> str:
        return await self._run(self._regenerate_invite_code_sync, room_id, requester_id)

    def _require_owner_sync(self, conn: sqlite3.Connection, room_id: str, user_id: str) -> None:
        row = conn.execute(
            "SELECT role FROM chat_room_members WHERE room_id = ? AND user_id = ?",
            (room_id, user_id),
        ).fetchone()
        if row is None:
            raise RoomError("You are not a member of this room")
        if row["role"] != "owner":
            raise RoomError("Only the room owner can do this")

    def _join_by_invite_code_sync(self, code: str, user_id: str) -> dict[str, Any]:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT room_id FROM group_invite_codes WHERE code = ?", (code.strip(),)
            ).fetchone()
            if row is None:
                raise RoomError("Invite code not found")
            room_id = row["room_id"]
            room = conn.execute("SELECT * FROM chat_rooms WHERE id = ?", (room_id,)).fetchone()
            if room is None:
                raise RoomError("Invite code not found")
            already = conn.execute(
                "SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?",
                (room_id, user_id),
            ).fetchone()
            if already is None:
                conn.execute(
                    "INSERT INTO chat_room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
                    (room_id, user_id, time.time()),
                )
            return dict(room)

    async def join_by_invite_code(self, code: str, user_id: str) -> dict[str, Any]:
        return await self._run(self._join_by_invite_code_sync, code, user_id)

    def _add_member_sync(self, room_id: str, requester_id: str, new_user_id: str) -> None:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT role FROM chat_room_members WHERE room_id = ? AND user_id = ?",
                (room_id, requester_id),
            ).fetchone()
            if row is None:
                raise RoomError("You are not a member of this room")
            room = conn.execute("SELECT type FROM chat_rooms WHERE id = ?", (room_id,)).fetchone()
            if room is None or room["type"] != "group":
                raise RoomError("Members can only be added to group rooms")
            already = conn.execute(
                "SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?",
                (room_id, new_user_id),
            ).fetchone()
            if already is not None:
                return
            conn.execute(
                "INSERT INTO chat_room_members (room_id, user_id, role, joined_at) VALUES (?, ?, 'member', ?)",
                (room_id, new_user_id, time.time()),
            )

    async def add_member(self, room_id: str, requester_id: str, new_user_id: str) -> None:
        await self._run(self._add_member_sync, room_id, requester_id, new_user_id)

    def _remove_member_sync(self, room_id: str, requester_id: str, target_user_id: str) -> None:
        with self._connect() as conn:
            requester_row = conn.execute(
                "SELECT role FROM chat_room_members WHERE room_id = ? AND user_id = ?",
                (room_id, requester_id),
            ).fetchone()
            if requester_row is None:
                raise RoomError("You are not a member of this room")
            is_self_leave = requester_id == target_user_id
            if not is_self_leave and requester_row["role"] != "owner":
                raise RoomError("Only the room owner can remove other members")
            if is_self_leave and requester_row["role"] == "owner":
                remaining = conn.execute(
                    "SELECT COUNT(*) AS n FROM chat_room_members WHERE room_id = ?",
                    (room_id,),
                ).fetchone()["n"]
                if remaining > 1:
                    raise RoomError(
                        "Transfer ownership before leaving, or remove the other members first"
                    )
            conn.execute(
                "DELETE FROM chat_room_members WHERE room_id = ? AND user_id = ?",
                (room_id, target_user_id),
            )
            left = conn.execute(
                "SELECT COUNT(*) AS n FROM chat_room_members WHERE room_id = ?",
                (room_id,),
            ).fetchone()["n"]
            if left == 0:
                conn.execute("DELETE FROM chat_rooms WHERE id = ?", (room_id,))

    async def remove_member(self, room_id: str, requester_id: str, target_user_id: str) -> None:
        await self._run(self._remove_member_sync, room_id, requester_id, target_user_id)

    def _list_rooms_for_user_sync(self, user_id: str) -> list[dict[str, Any]]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT r.id, r.name, r.type, r.created_by, r.created_at,
                       (SELECT COUNT(*) FROM chat_room_members m2 WHERE m2.room_id = r.id) AS member_count,
                       (SELECT body FROM chat_messages msg WHERE msg.room_id = r.id
                            ORDER BY msg.created_at DESC LIMIT 1) AS last_message,
                       (SELECT MAX(created_at) FROM chat_messages msg WHERE msg.room_id = r.id) AS last_message_at
                FROM chat_rooms r
                JOIN chat_room_members m ON m.room_id = r.id
                WHERE m.user_id = ?
                ORDER BY COALESCE(
                    (SELECT MAX(created_at) FROM chat_messages msg WHERE msg.room_id = r.id),
                    r.created_at
                ) DESC
                """,
                (user_id,),
            ).fetchall()
        return [dict(row) for row in rows]

    async def list_rooms_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return await self._run(self._list_rooms_for_user_sync, user_id)

    def _get_room_sync(self, room_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM chat_rooms WHERE id = ?", (room_id,)).fetchone()
            if row is None:
                return None
            members = conn.execute(
                "SELECT user_id, role, joined_at FROM chat_room_members WHERE room_id = ? ORDER BY joined_at",
                (room_id,),
            ).fetchall()
            invite = conn.execute(
                "SELECT code FROM group_invite_codes WHERE room_id = ?", (room_id,)
            ).fetchone()
        result = dict(row)
        result["members"] = [dict(m) for m in members]
        result["invite_code"] = invite["code"] if invite else None
        return result

    async def get_room(self, room_id: str) -> dict[str, Any] | None:
        return await self._run(self._get_room_sync, room_id)

    def _is_room_member_sync(self, room_id: str, user_id: str) -> bool:
        with self._connect() as conn:
            row = conn.execute(
                "SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?",
                (room_id, user_id),
            ).fetchone()
        return row is not None

    async def is_room_member(self, room_id: str, user_id: str) -> bool:
        return await self._run(self._is_room_member_sync, room_id, user_id)


_instance: SocialStore | None = None


def get_social_store() -> SocialStore:
    global _instance
    if _instance is None:
        _instance = SocialStore()
    return _instance
