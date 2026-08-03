import { apiFetch, apiUrl } from "./core";

export interface UserRecord {
  id: string;
  username: string;
  role: "admin" | "user";
  created_at: string;
  disabled?: boolean;
  avatar?: string;
}

export interface CreatedUser {
  user_id: string;
  username: string;
  role: "admin" | "user";
  is_admin: boolean;
}

async function parseError(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({})) as { detail?: unknown };
  const detail = data?.detail;
  return typeof detail === "string" ? detail : fallback;
}

export async function listUsers(): Promise<UserRecord[]> {
  const res = await apiFetch(apiUrl("/api/v1/auth/users"));
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

export async function createUser(username: string, password: string): Promise<CreatedUser> {
  const res = await apiFetch(apiUrl("/api/v1/auth/users"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { detail?: unknown };
    const detail = data?.detail;
    const message =
      typeof detail === "string" ? detail
      : Array.isArray(detail) && detail.length > 0 && (detail[0] as { msg?: string })?.msg
        ? String((detail[0] as { msg: string }).msg)
        : "Failed to create user";
    throw new Error(message);
  }
  return (await res.json()) as CreatedUser;
}

export async function deleteUser(username: string): Promise<void> {
  const res = await apiFetch(apiUrl(`/api/v1/auth/users/${encodeURIComponent(username)}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res, "Failed to delete user"));
}

export async function setUserRole(username: string, role: "admin" | "user"): Promise<void> {
  const res = await apiFetch(apiUrl(`/api/v1/auth/users/${encodeURIComponent(username)}/role`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to update role"));
}
