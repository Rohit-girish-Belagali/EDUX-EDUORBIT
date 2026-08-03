/** Typed client for the /api/v1/social backend — friend codes, requests, and chat rooms. */

import { apiFetch, apiUrl } from "@/lib/api";

export interface FriendRequestInfo {
  id: string;
  from_user_id: string;
  from_username: string;
  to_user_id: string;
  to_username: string;
  status: string;
  created_at: number;
  responded_at: number | null;
}

export interface FriendRequestsResponse {
  incoming: FriendRequestInfo[];
  outgoing: FriendRequestInfo[];
}

export interface FriendInfo {
  user_id: string;
  username: string;
  avatar: string;
  since: number;
}

export interface RoomSummary {
  id: string;
  name: string | null;
  type: "direct" | "group";
  member_count: number;
  last_message: string | null;
  last_message_at: number | null;
}

export interface RoomMemberInfo {
  user_id: string;
  username: string;
  role: "owner" | "member";
  joined_at: number;
}

export interface RoomDetail {
  id: string;
  name: string | null;
  type: "direct" | "group";
  created_by: string;
  created_at: number;
  members: RoomMemberInfo[];
  invite_code: string | null;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      detail?: string | { message?: string };
    };
    const detail = body.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : (detail?.message ?? `Request failed: ${res.status}`);
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function getMyFriendCode(): Promise<string> {
  const data = await json<{ friend_code: string }>(
    await apiFetch(apiUrl("/api/v1/social/me/code"), { cache: "no-store" }),
  );
  return data.friend_code;
}

export async function sendFriendRequest(code: string): Promise<void> {
  await json(
    await apiFetch(apiUrl("/api/v1/social/friend-requests"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }),
  );
}

export async function listFriendRequests(): Promise<FriendRequestsResponse> {
  return json(
    await apiFetch(apiUrl("/api/v1/social/friend-requests"), {
      cache: "no-store",
    }),
  );
}

export async function acceptFriendRequest(
  requestId: string,
): Promise<{ room_id: string | null }> {
  return json(
    await apiFetch(
      apiUrl(
        `/api/v1/social/friend-requests/${encodeURIComponent(requestId)}/accept`,
      ),
      { method: "POST" },
    ),
  );
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await json(
    await apiFetch(
      apiUrl(
        `/api/v1/social/friend-requests/${encodeURIComponent(requestId)}/decline`,
      ),
      { method: "POST" },
    ),
  );
}

export async function listFriends(): Promise<FriendInfo[]> {
  return json(
    await apiFetch(apiUrl("/api/v1/social/friends"), { cache: "no-store" }),
  );
}

export async function listRooms(): Promise<RoomSummary[]> {
  return json(
    await apiFetch(apiUrl("/api/v1/social/rooms"), { cache: "no-store" }),
  );
}

export async function getRoom(roomId: string): Promise<RoomDetail> {
  return json(
    await apiFetch(apiUrl(`/api/v1/social/rooms/${encodeURIComponent(roomId)}`), {
      cache: "no-store",
    }),
  );
}

export async function createGroupRoom(name: string): Promise<RoomDetail> {
  return json(
    await apiFetch(apiUrl("/api/v1/social/rooms"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );
}

export async function joinRoomByCode(code: string): Promise<RoomDetail> {
  return json(
    await apiFetch(apiUrl("/api/v1/social/rooms/join"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    }),
  );
}

export async function regenerateInviteCode(
  roomId: string,
): Promise<string> {
  const data = await json<{ invite_code: string }>(
    await apiFetch(
      apiUrl(
        `/api/v1/social/rooms/${encodeURIComponent(roomId)}/invite-code/regenerate`,
      ),
      { method: "POST" },
    ),
  );
  return data.invite_code;
}

export async function addRoomMember(
  roomId: string,
  userId: string,
): Promise<void> {
  await json(
    await apiFetch(
      apiUrl(`/api/v1/social/rooms/${encodeURIComponent(roomId)}/members`),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      },
    ),
  );
}

export async function removeRoomMember(
  roomId: string,
  userId: string,
): Promise<void> {
  await json(
    await apiFetch(
      apiUrl(
        `/api/v1/social/rooms/${encodeURIComponent(roomId)}/members/${encodeURIComponent(userId)}`,
      ),
      { method: "DELETE" },
    ),
  );
}
