"""Social router — friend codes, friend requests, and chat rooms (direct + group).

Friend requests, friendships, and rooms are cross-user relationships, so this
router (unlike most others) resolves the acting user from the auth token
directly rather than through the per-user ``PathService`` scoping used
elsewhere. See ``edux/services/social/store.py`` for the persistence layer.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator

from edux.api.routers.auth import require_auth
from edux.multi_user.identity import get_user_by_friend_code, get_user_by_id
from edux.services.auth import AUTH_ENABLED, TokenPayload
from edux.services.social.store import FriendRequestError, RoomError, get_social_store

logger = logging.getLogger(__name__)

router = APIRouter()


def _require_identity(payload: TokenPayload | None) -> TokenPayload:
    """Social features are inherently multi-user; refuse the single-admin fallback."""
    if not AUTH_ENABLED or payload is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Auth is disabled — social features require multi-user auth to be enabled.",
        )
    return payload


def _username_for(user_id: str) -> str:
    found = get_user_by_id(user_id)
    return found[0] if found else user_id


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class FriendCodeResponse(BaseModel):
    friend_code: str


class AddFriendRequest(BaseModel):
    code: str

    @field_validator("code")
    @classmethod
    def code_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Friend code cannot be empty")
        return v


class FriendRequestInfo(BaseModel):
    id: str
    from_user_id: str
    from_username: str
    to_user_id: str
    to_username: str
    status: str
    created_at: float
    responded_at: float | None = None


class FriendRequestsResponse(BaseModel):
    incoming: list[FriendRequestInfo]
    outgoing: list[FriendRequestInfo]


class FriendInfo(BaseModel):
    user_id: str
    username: str
    avatar: str = ""
    since: float


class CreateGroupRequest(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_valid(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Group name cannot be empty")
        return v[:80]


class JoinRoomRequest(BaseModel):
    code: str


class AddMemberRequest(BaseModel):
    user_id: str


class RoomMemberInfo(BaseModel):
    user_id: str
    username: str
    role: str
    joined_at: float


class RoomSummary(BaseModel):
    id: str
    name: str | None
    type: str
    member_count: int
    last_message: str | None = None
    last_message_at: float | None = None


class RoomDetail(BaseModel):
    id: str
    name: str | None
    type: str
    created_by: str
    created_at: float
    members: list[RoomMemberInfo]
    invite_code: str | None = None


# ---------------------------------------------------------------------------
# Friend code + requests
# ---------------------------------------------------------------------------


@router.get("/me/code", response_model=FriendCodeResponse)
async def get_my_code(payload: TokenPayload | None = Depends(require_auth)) -> FriendCodeResponse:
    """Return the current user's own shareable friend code."""
    current = _require_identity(payload)
    found = get_user_by_id(current.user_id)
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    _, record = found
    return FriendCodeResponse(friend_code=str(record.get("friend_code") or ""))


@router.post("/friend-requests", status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    body: AddFriendRequest,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    """Send a friend request to the user identified by a friend code."""
    current = _require_identity(payload)
    found = get_user_by_friend_code(body.code)
    if found is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user has that friend code")
    target_username, target_record = found
    target_user_id = str(target_record.get("id") or "")

    store = get_social_store()
    try:
        request = await store.create_friend_request(current.user_id, target_user_id)
    except FriendRequestError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    logger.info(f"'{current.username}' sent a friend request to '{target_username}'")
    return {"ok": True, "request_id": request["id"]}


@router.get("/friend-requests", response_model=FriendRequestsResponse)
async def list_friend_requests(
    payload: TokenPayload | None = Depends(require_auth),
) -> FriendRequestsResponse:
    """List the current user's pending incoming and outgoing friend requests."""
    current = _require_identity(payload)
    store = get_social_store()
    raw = await store.list_friend_requests(current.user_id)

    def to_info(row: dict) -> FriendRequestInfo:
        return FriendRequestInfo(
            id=row["id"],
            from_user_id=row["from_user_id"],
            from_username=_username_for(row["from_user_id"]),
            to_user_id=row["to_user_id"],
            to_username=_username_for(row["to_user_id"]),
            status=row["status"],
            created_at=row["created_at"],
            responded_at=row.get("responded_at"),
        )

    return FriendRequestsResponse(
        incoming=[to_info(r) for r in raw["incoming"]],
        outgoing=[to_info(r) for r in raw["outgoing"]],
    )


@router.post("/friend-requests/{request_id}/accept")
async def accept_friend_request(
    request_id: str,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    current = _require_identity(payload)
    store = get_social_store()
    try:
        result = await store.respond_friend_request(request_id, current.user_id, accept=True)
    except FriendRequestError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    logger.info(f"'{current.username}' accepted friend request {request_id}")
    return {"ok": True, "room_id": result.get("room_id")}


@router.post("/friend-requests/{request_id}/decline")
async def decline_friend_request(
    request_id: str,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    current = _require_identity(payload)
    store = get_social_store()
    try:
        await store.respond_friend_request(request_id, current.user_id, accept=False)
    except FriendRequestError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    logger.info(f"'{current.username}' declined friend request {request_id}")
    return {"ok": True}


@router.get("/friends", response_model=list[FriendInfo])
async def list_friends(
    payload: TokenPayload | None = Depends(require_auth),
) -> list[FriendInfo]:
    current = _require_identity(payload)
    store = get_social_store()
    raw = await store.list_friends(current.user_id)
    result = []
    for row in raw:
        found = get_user_by_id(row["friend_user_id"])
        username, record = found if found else (row["friend_user_id"], {})
        result.append(
            FriendInfo(
                user_id=row["friend_user_id"],
                username=username,
                avatar=str(record.get("avatar") or ""),
                since=row["created_at"],
            )
        )
    return result


# ---------------------------------------------------------------------------
# Rooms (direct + group)
# ---------------------------------------------------------------------------


@router.get("/rooms", response_model=list[RoomSummary])
async def list_rooms(payload: TokenPayload | None = Depends(require_auth)) -> list[RoomSummary]:
    """List every room (direct + group) the current user belongs to."""
    current = _require_identity(payload)
    store = get_social_store()
    rows = await store.list_rooms_for_user(current.user_id)
    return [
        RoomSummary(
            id=r["id"],
            name=r["name"],
            type=r["type"],
            member_count=r["member_count"],
            last_message=r["last_message"],
            last_message_at=r["last_message_at"],
        )
        for r in rows
    ]


@router.post("/rooms", status_code=status.HTTP_201_CREATED, response_model=RoomDetail)
async def create_group(
    body: CreateGroupRequest,
    payload: TokenPayload | None = Depends(require_auth),
) -> RoomDetail:
    """Create a new named group room; the creator becomes its owner."""
    current = _require_identity(payload)
    store = get_social_store()
    created = await store.create_group_room(body.name, current.user_id)
    logger.info(f"'{current.username}' created group room '{body.name}' ({created['id']})")
    room = await store.get_room(created["id"])
    return _room_detail(room, current.user_id)


def _room_detail(room: dict, requester_id: str) -> RoomDetail:
    members = [
        RoomMemberInfo(
            user_id=m["user_id"],
            username=_username_for(m["user_id"]),
            role=m["role"],
            joined_at=m["joined_at"],
        )
        for m in room["members"]
    ]
    requester_role = next((m.role for m in members if m.user_id == requester_id), None)
    return RoomDetail(
        id=room["id"],
        name=room["name"],
        type=room["type"],
        created_by=room["created_by"],
        created_at=room["created_at"],
        members=members,
        # Only owners get the invite code back — anyone with it can join.
        invite_code=room["invite_code"] if requester_role == "owner" else None,
    )


@router.get("/rooms/{room_id}", response_model=RoomDetail)
async def get_room(
    room_id: str,
    payload: TokenPayload | None = Depends(require_auth),
) -> RoomDetail:
    current = _require_identity(payload)
    store = get_social_store()
    room = await store.get_room(room_id)
    if room is None or not await store.is_room_member(room_id, current.user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found")
    return _room_detail(room, current.user_id)


@router.post("/rooms/{room_id}/invite-code/regenerate")
async def regenerate_invite_code(
    room_id: str,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    current = _require_identity(payload)
    store = get_social_store()
    try:
        code = await store.regenerate_invite_code(room_id, current.user_id)
    except RoomError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    return {"ok": True, "invite_code": code}


@router.post("/rooms/join", response_model=RoomDetail)
async def join_room(
    body: JoinRoomRequest,
    payload: TokenPayload | None = Depends(require_auth),
) -> RoomDetail:
    current = _require_identity(payload)
    store = get_social_store()
    try:
        joined = await store.join_by_invite_code(body.code, current.user_id)
    except RoomError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    logger.info(f"'{current.username}' joined group room {joined['id']}")
    room = await store.get_room(joined["id"])
    return _room_detail(room, current.user_id)


@router.post("/rooms/{room_id}/members")
async def add_room_member(
    room_id: str,
    body: AddMemberRequest,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    current = _require_identity(payload)
    store = get_social_store()
    try:
        await store.add_member(room_id, current.user_id, body.user_id)
    except RoomError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"ok": True}


@router.delete("/rooms/{room_id}/members/{user_id}")
async def remove_room_member(
    room_id: str,
    user_id: str,
    payload: TokenPayload | None = Depends(require_auth),
) -> dict:
    current = _require_identity(payload)
    store = get_social_store()
    try:
        await store.remove_member(room_id, current.user_id, user_id)
    except RoomError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return {"ok": True}
