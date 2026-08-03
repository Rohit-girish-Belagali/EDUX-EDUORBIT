import { apiFetch, apiUrl, setRuntimeAuthEnabled } from "./core";

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
  user_id?: string;
  username?: string;
  role?: string;
  is_admin?: boolean;
  avatar?: string;
}

export async function fetchAuthStatus(): Promise<AuthStatus | null> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/status"));
    if (!res.ok) return null;
    const status: AuthStatus = await res.json();
    setRuntimeAuthEnabled(Boolean(status.enabled));
    return status;
  } catch {
    return null;
  }
}

function extractDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first)
      return String((first as { msg: unknown }).msg);
  }
  return "Request failed";
}

export async function login(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      skipAuthRedirect: true,
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: extractDetail((data as { detail?: unknown }).detail) ?? "Login failed" };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

export async function register(
  username: string,
  password: string,
): Promise<{ ok: boolean; role?: string; is_first_user?: boolean; error?: string }> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      skipAuthRedirect: true,
    });
    const data = await res.json().catch(() => ({})) as Record<string, unknown>;
    if (res.ok) return { ok: true, role: data.role as string, is_first_user: data.is_first_user as boolean };
    return { ok: false, error: extractDetail(data.detail) };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

export async function checkIsFirstUser(): Promise<boolean> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/is_first_user"));
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean((data as { is_first_user?: unknown }).is_first_user);
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  try {
    await apiFetch(apiUrl("/api/v1/auth/logout"), { method: "POST" });
  } catch {
    // ignore — caller redirects regardless
  }
}
