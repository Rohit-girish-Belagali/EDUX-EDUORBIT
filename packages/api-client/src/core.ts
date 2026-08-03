/**
 * Environment-aware fetch + URL helpers.
 *
 * Web:    relative paths (/api/v1/...) — Next.js proxy handles base URL.
 * Mobile: absolute URLs — reads EXPO_PUBLIC_API_BASE_URL at runtime.
 *
 * Call configureApiClient() once at app startup on mobile to inject the
 * token getter (expo-secure-store) and the 401 handler (redirect to login).
 */

let _getToken: (() => Promise<string | null>) | null = null;
let _onUnauthorized: (() => void) | null = null;
let _runtimeAuthEnabled = false;
let _runtimeApiBase: string | null = null;

/** Override the API base URL at runtime (mobile: set from SecureStore on app start). */
export function setApiBase(url: string): void {
  _runtimeApiBase = url.replace(/\/+$/, "") || null;
}

export interface ApiClientConfig {
  /** Mobile only: async fn that returns the stored session token. */
  getToken?: () => Promise<string | null>;
  /** Called when a 401 is received and auth is enabled. */
  onUnauthorized?: () => void;
}

export function configureApiClient(opts: ApiClientConfig): void {
  if (opts.getToken) _getToken = opts.getToken;
  if (opts.onUnauthorized) _onUnauthorized = opts.onUnauthorized;
}

export function setRuntimeAuthEnabled(enabled: boolean): void {
  _runtimeAuthEnabled = enabled;
}

export function parseAuthEnabled(raw: string | undefined): boolean {
  return /^(1|true|yes|on)$/i.test((raw ?? "").trim());
}

function getBaseUrl(): string {
  // Runtime override wins (set from SecureStore on app start)
  if (_runtimeApiBase) return _runtimeApiBase;
  // React Native / Expo: process.env is available at build time via babel
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env["EXPO_PUBLIC_API_BASE_URL"]
  ) {
    return (process.env["EXPO_PUBLIC_API_BASE_URL"] as string).replace(/\/$/, "");
  }
  return "";
}

/** Construct a full URL from an API path. */
export function apiUrl(path: string): string {
  const base = getBaseUrl();
  return base ? `${base}${path}` : path;
}

/** Construct a WebSocket URL from a path. */
export function wsUrl(path: string): string {
  const base = getBaseUrl();
  if (!base) return path; // web: Next.js proxy upgrades the connection
  // Convert http(s) → ws(s)
  return base.replace(/^http/, "ws") + path;
}

export async function apiFetch(
  input: string | URL,
  init?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<Response> {
  const { skipAuthRedirect, ...fetchInit } = init ?? {};

  // Build headers — merge caller headers then inject token if available
  const headers = new Headers((fetchInit.headers as HeadersInit) ?? {});

  if (_getToken) {
    const token = await _getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(input as string, {
    credentials: _getToken ? "omit" : "include",
    ...fetchInit,
    headers,
  });

  if (res.status === 401 && _runtimeAuthEnabled && !skipAuthRedirect) {
    if (_onUnauthorized) {
      _onUnauthorized();
    } else if (typeof window !== "undefined") {
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?next=${next}`;
    }
    return new Promise(() => {});
  }

  return res;
}
