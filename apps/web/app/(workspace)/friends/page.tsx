"use client";

/**
 * Friends — friend codes, friend requests, and direct/group chat rooms.
 * Realtime messaging isn't wired up yet (Phase 3 of FRIENDS_CHAT_PLAN.md);
 * this page covers connecting with people and managing rooms.
 */

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  LogOut,
  Plus,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import Modal from "@/components/common/Modal";
import { fetchAuthStatus } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import {
  acceptFriendRequest,
  addRoomMember,
  createGroupRoom,
  declineFriendRequest,
  getMyFriendCode,
  getRoom,
  joinRoomByCode,
  listFriendRequests,
  listFriends,
  listRooms,
  regenerateInviteCode,
  removeRoomMember,
  sendFriendRequest,
  type FriendInfo,
  type FriendRequestInfo,
  type RoomDetail,
  type RoomSummary,
} from "@/lib/social-api";

function initials(name: string): string {
  return (name.trim()[0] || "?").toUpperCase();
}

export default function FriendsPage() {
  const { t } = useTranslation();

  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [myCode, setMyCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [addCodeInput, setAddCodeInput] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const [incoming, setIncoming] = useState<FriendRequestInfo[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestInfo[]>([]);
  const [friends, setFriends] = useState<FriendInfo[]>([]);
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomDetail | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [status, code, requests, friendList, roomList] = await Promise.all([
        fetchAuthStatus(),
        getMyFriendCode(),
        listFriendRequests(),
        listFriends(),
        listRooms(),
      ]);
      setMyUserId(status?.user_id ?? null);
      setMyCode(code);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
      setFriends(friendList);
      setRooms(roomList);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const handleCopyCode = () => {
    if (!myCode) return;
    void navigator.clipboard.writeText(myCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCodeInput.trim()) return;
    setSendingRequest(true);
    try {
      await sendFriendRequest(addCodeInput.trim());
      setAddCodeInput("");
      notify(t("Friend request sent"), { tone: "success" });
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setSendingRequest(false);
    }
  };

  const handleAccept = async (requestId: string) => {
    setBusyRequestId(requestId);
    try {
      await acceptFriendRequest(requestId);
      notify(t("Friend request accepted"), { tone: "success" });
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setBusyRequestId(requestId);
    try {
      await declineFriendRequest(requestId);
      await loadAll();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusyRequestId(null);
    }
  };

  const openRoom = async (roomId: string) => {
    try {
      setActiveRoom(await getRoom(roomId));
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    }
  };

  const roomLabel = (room: RoomSummary): string => {
    if (room.type === "group") return room.name || t("Group");
    return t("Direct chat ({{count}} members)", { count: room.member_count });
  };

  return (
    <div className="mx-auto h-full max-w-4xl overflow-y-auto px-6 py-8">
      <header className="mb-7">
        <h1 className="text-[19px] font-semibold tracking-tight text-[var(--foreground)]">
          {t("Friends")}
        </h1>
        <p className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">
          {t(
            "Connect with people using a friend code, chat directly or in groups, and ask each other doubts.",
          )}
        </p>
      </header>

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Your code + add a friend */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Your friend code")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-lg bg-[var(--muted)] px-3 py-2 text-[14px] font-mono tracking-wide text-[var(--foreground)]">
                  {myCode || "—"}
                </code>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  aria-label={t("Copy code") as string}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {codeCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                {t("Share this so others can send you a friend request.")}
              </p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] p-4">
              <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Add a friend")}
              </p>
              <form onSubmit={handleSendRequest} className="mt-2 flex gap-2">
                <input
                  value={addCodeInput}
                  onChange={(e) => setAddCodeInput(e.target.value)}
                  placeholder={t("EDU-XXXXXXXX") as string}
                  className="flex-1 rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
                />
                <button
                  type="submit"
                  disabled={sendingRequest || !addCodeInput.trim()}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--primary-foreground)] disabled:opacity-50"
                >
                  {sendingRequest ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  {t("Send")}
                </button>
              </form>
              {outgoing.length > 0 ? (
                <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
                  {t("{{count}} request(s) pending", { count: outgoing.length })}
                </p>
              ) : null}
            </div>
          </div>

          {/* Incoming requests */}
          {incoming.length > 0 ? (
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <p className="mb-3 text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Incoming requests")}
              </p>
              <div className="space-y-2">
                {incoming.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-[var(--muted)]/50 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-medium text-[var(--foreground)]">
                        {initials(req.from_username)}
                      </span>
                      <span className="truncate text-[13px] text-[var(--foreground)]">
                        {req.from_username}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyRequestId === req.id}
                        onClick={() => void handleAccept(req.id)}
                        className="rounded-lg bg-[var(--primary)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--primary-foreground)] disabled:opacity-50"
                      >
                        {t("Accept")}
                      </button>
                      <button
                        type="button"
                        disabled={busyRequestId === req.id}
                        onClick={() => void handleDecline(req.id)}
                        className="rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                      >
                        {t("Decline")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Friends list */}
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <p className="mb-3 text-[12px] font-medium text-[var(--muted-foreground)]">
                {t("Friends")} ({friends.length})
              </p>
              {friends.length === 0 ? (
                <p className="py-6 text-center text-[12.5px] text-[var(--muted-foreground)]">
                  {t("No friends yet — share your code above to connect.")}
                </p>
              ) : (
                <div className="space-y-1">
                  {friends.map((f) => (
                    <div
                      key={f.user_id}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[12px] font-medium text-[var(--foreground)]">
                        {initials(f.username)}
                      </span>
                      <span className="truncate text-[13px] text-[var(--foreground)]">
                        {f.username}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rooms (direct + group) */}
            <div className="rounded-2xl border border-[var(--border)] p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
                  {t("Rooms")} ({rooms.length})
                </p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowJoinGroup(true)}
                    className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11.5px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  >
                    {t("Join")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewGroup(true)}
                    className="inline-flex items-center gap-1 rounded-lg bg-[var(--primary)] px-2.5 py-1 text-[11.5px] font-medium text-[var(--primary-foreground)]"
                  >
                    <Plus className="h-3 w-3" />
                    {t("New group")}
                  </button>
                </div>
              </div>
              {rooms.length === 0 ? (
                <p className="py-6 text-center text-[12.5px] text-[var(--muted-foreground)]">
                  {t("No rooms yet.")}
                </p>
              ) : (
                <div className="space-y-1">
                  {rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => room.type === "group" && void openRoom(room.id)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left ${
                        room.type === "group"
                          ? "hover:bg-[var(--muted)]/60"
                          : "cursor-default"
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-[var(--foreground)]">
                          {roomLabel(room)}
                        </p>
                        <p className="truncate text-[11px] text-[var(--muted-foreground)]">
                          {room.last_message ?? t("No messages yet")}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewGroup ? (
        <NewGroupModal
          onClose={() => setShowNewGroup(false)}
          onCreated={async () => {
            setShowNewGroup(false);
            await loadAll();
          }}
        />
      ) : null}

      {showJoinGroup ? (
        <JoinGroupModal
          onClose={() => setShowJoinGroup(false)}
          onJoined={async () => {
            setShowJoinGroup(false);
            await loadAll();
          }}
        />
      ) : null}

      {activeRoom ? (
        <GroupDetailModal
          room={activeRoom}
          friends={friends}
          myUserId={myUserId}
          onClose={() => setActiveRoom(null)}
          onChanged={async () => {
            const refreshed = await getRoom(activeRoom.id);
            setActiveRoom(refreshed);
            await loadAll();
          }}
          onLeft={async () => {
            setActiveRoom(null);
            await loadAll();
          }}
        />
      ) : null}
    </div>
  );
}

function NewGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createGroupRoom(name.trim());
      notify(t("Group created"), { tone: "success" });
      await onCreated();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t("New group") as string} width="sm">
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        <label className="block text-[12px] font-medium text-[var(--muted-foreground)]">
          {t("Group name")}
        </label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("e.g. Calculus study group") as string}
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        />
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {t("Create group")}
        </button>
      </form>
    </Modal>
  );
}

function JoinGroupModal({
  onClose,
  onJoined,
}: {
  onClose: () => void;
  onJoined: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    try {
      await joinRoomByCode(code.trim());
      notify(t("Joined the group"), { tone: "success" });
      await onJoined();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={t("Join a group") as string} width="sm">
      <form onSubmit={handleSubmit} className="space-y-3 p-4">
        <label className="block text-[12px] font-medium text-[var(--muted-foreground)]">
          {t("Invite code")}
        </label>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="inv_xxxxxxxx"
          className="w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-[13px] font-mono text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--ring)]"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-[12.5px] font-medium text-[var(--primary-foreground)] disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {t("Join")}
        </button>
      </form>
    </Modal>
  );
}

function GroupDetailModal({
  room,
  friends,
  myUserId,
  onClose,
  onChanged,
  onLeft,
}: {
  room: RoomDetail;
  friends: FriendInfo[];
  myUserId: string | null;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onLeft: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const memberIds = new Set(room.members.map((m) => m.user_id));
  const addableFriends = friends.filter((f) => !memberIds.has(f.user_id));

  const handleRegenerate = async () => {
    setBusy(true);
    try {
      await regenerateInviteCode(room.id);
      await onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (userId: string) => {
    setBusy(true);
    try {
      await addRoomMember(room.id, userId);
      await onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (userId: string) => {
    setBusy(true);
    try {
      await removeRoomMember(room.id, userId);
      await onChanged();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    if (!myUserId) return;
    if (!window.confirm(t("Leave this group?") as string)) return;
    setBusy(true);
    try {
      await removeRoomMember(room.id, myUserId);
      await onLeft();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={room.name || t("Group")} width="md">
      <div className="space-y-4 p-4">
        {room.invite_code ? (
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--muted-foreground)]">
              {t("Invite code")}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg bg-[var(--muted)] px-3 py-2 text-[13px] font-mono text-[var(--foreground)]">
                {room.invite_code}
              </code>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(room.invite_code || "");
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 1500);
                }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {codeCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRegenerate()}
                className="shrink-0 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11.5px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {t("Rotate")}
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <p className="mb-1.5 text-[12px] font-medium text-[var(--muted-foreground)]">
            {t("Members")} ({room.members.length})
          </p>
          <div className="space-y-1">
            {room.members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-medium text-[var(--foreground)]">
                    {initials(m.username)}
                  </span>
                  <span className="truncate text-[13px] text-[var(--foreground)]">
                    {m.username}
                  </span>
                  {m.role === "owner" ? (
                    <span className="rounded-full bg-[var(--muted)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {t("Owner")}
                    </span>
                  ) : null}
                </div>
                {room.invite_code && m.role !== "owner" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleRemove(m.user_id)}
                    aria-label={t("Remove member") as string}
                    className="shrink-0 text-[var(--muted-foreground)] hover:text-red-500 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {room.invite_code && addableFriends.length > 0 ? (
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-[var(--muted-foreground)]">
              {t("Add a friend")}
            </p>
            <div className="space-y-1">
              {addableFriends.map((f) => (
                <div
                  key={f.user_id}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5"
                >
                  <span className="truncate text-[13px] text-[var(--foreground)]">
                    {f.username}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAdd(f.user_id)}
                    className="shrink-0 rounded-lg border border-[var(--border)] px-2 py-1 text-[11.5px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    {t("Add")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          disabled={busy || !myUserId}
          onClick={() => void handleLeave()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3.5 py-2 text-[12.5px] text-[var(--muted-foreground)] hover:text-red-500 disabled:opacity-50"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("Leave group")}
        </button>
      </div>
    </Modal>
  );
}
