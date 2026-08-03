import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { apiFetch, apiUrl, setRuntimeAuthEnabled } from "@/lib/api";
import { firebaseAuth, googleAuthProvider } from "@/lib/firebase";

// Auth state is resolved at runtime from the backend (`/api/v1/auth/status`),
// not from a build-time/env constant: the browser bundle never sees
// `EDUX_AUTH_ENABLED` (not a `NEXT_PUBLIC_` var), and auth is runtime
// config that must not be baked into the bundle. Components observe it via the
// `useAuthStatus` hook (web/hooks/useAuthStatus.ts); `apiFetch`'s redirect gate
// is driven by `setRuntimeAuthEnabled`, which `fetchAuthStatus` calls below.

export interface AuthStatus {
  enabled: boolean;
  authenticated: boolean;
  user_id?: string;
  username?: string;
  role?: string;
  is_admin?: boolean;
  /** Avatar marker: "", "icon:<name>:<color>", or "img:<version>". */
  avatar?: string;
}

/**
 * Call the backend to check whether the current session is authenticated.
 * Returns null on network error so callers can decide how to handle it.
 */
export async function fetchAuthStatus(): Promise<AuthStatus | null> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/status"));
    if (!res.ok) return null;
    const status: AuthStatus = await res.json();
    // Record the real auth state so apiFetch's in-session 401 → /login redirect
    // fires only when auth is actually enabled.
    setRuntimeAuthEnabled(Boolean(status.enabled));
    return status;
  } catch {
    return null;
  }
}

/**
 * POST credentials to the backend. Returns true on success.
 */
export async function login(
  username: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      // A 401 here means "wrong credentials", not an expired session — handle it
      // inline as a form error instead of triggering the global login redirect.
      skipAuthRedirect: true,
    });

    if (res.ok) return { ok: true };

    const data = await res.json().catch(() => ({}));
    return { ok: false, error: extractDetail(data.detail) ?? "Login failed" };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

/**
 * Normalise a FastAPI error detail to a plain string.
 * FastAPI can return detail as a string (HTTPException) or as an array of
 * validation error objects (422 Unprocessable Entity).
 */
function extractDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first)
      return String((first as { msg: unknown }).msg);
  }
  return "Request failed";
}

/**
 * Register a new account. The first user to register becomes admin.
 */
export async function register(
  username: string,
  password: string,
): Promise<{
  ok: boolean;
  role?: string;
  is_first_user?: boolean;
  error?: string;
}> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      // Registration validation failures (e.g. 400/401) should surface inline
      // rather than bounce the user through the global login redirect.
      skipAuthRedirect: true,
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok)
      return { ok: true, role: data.role, is_first_user: data.is_first_user };
    return { ok: false, error: extractDetail(data.detail) };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

/**
 * Translate a Firebase Auth SDK error into a user-facing message.
 */
function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Enter a valid email address";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password";
    case "auth/email-already-in-use":
      return "An account with this email already exists";
    case "auth/weak-password":
      return "Password must be at least 6 characters";
    case "auth/too-many-requests":
      return "Too many attempts — try again later";
    case "auth/invalid-phone-number":
      return "Enter a valid phone number, including country code";
    case "auth/code-expired":
      return "That code expired — request a new one";
    case "auth/invalid-verification-code":
      return "Incorrect code";
    default:
      return "Could not reach Firebase";
  }
}

/**
 * Exchange a verified Firebase ID token (from any provider — email/password,
 * Google, phone) for a backend session cookie via POST /api/v1/auth/firebase.
 * The backend auto-provisions a local shadow user record on first sign-in
 * (first one becomes admin, same as the password-based flow), so multi-user
 * workspaces/grants work unchanged regardless of which provider was used.
 */
export async function exchangeFirebaseToken(
  idToken: string,
): Promise<{ ok: boolean; error?: string; is_first_user?: boolean }> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/firebase"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken }),
      skipAuthRedirect: true,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, is_first_user: data.is_first_user };
    return { ok: false, error: extractDetail(data.detail) ?? "Login failed" };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

/**
 * Sign in with Firebase email/password, then exchange the token as above.
 */
export async function firebaseLogin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const idToken = await cred.user.getIdToken();
    return await exchangeFirebaseToken(idToken);
  } catch (err) {
    return { ok: false, error: firebaseErrorMessage(err) };
  }
}

/**
 * Create a Firebase account, then provision it on the backend the same way
 * `firebaseLogin` does. The first person to ever sign in this way becomes
 * admin; who's allowed to create a Firebase account at all is controlled
 * from the Firebase console, not here.
 */
export async function firebaseRegister(
  email: string,
  password: string,
): Promise<{ ok: boolean; is_first_user?: boolean; error?: string }> {
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const idToken = await cred.user.getIdToken();
    return await exchangeFirebaseToken(idToken);
  } catch (err) {
    return { ok: false, error: firebaseErrorMessage(err) };
  }
}

/**
 * Sign in (or sign up, Firebase doesn't distinguish) with a Google account via
 * a popup, then exchange the token as above. Works identically from the
 * login or register page.
 */
export async function firebaseGoogleLogin(): Promise<{ ok: boolean; error?: string; is_first_user?: boolean }> {
  try {
    const cred = await signInWithPopup(firebaseAuth, googleAuthProvider);
    const idToken = await cred.user.getIdToken();
    return await exchangeFirebaseToken(idToken);
  } catch (err) {
    return { ok: false, error: firebaseErrorMessage(err) };
  }
}

/**
 * Check whether the user store is empty (first user will become admin).
 */
export async function checkIsFirstUser(): Promise<boolean> {
  try {
    const res = await apiFetch(apiUrl("/api/v1/auth/is_first_user"));
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data.is_first_user);
  } catch {
    return false;
  }
}

/**
 * POST to the logout endpoint to clear the session cookie.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch(apiUrl("/api/v1/auth/logout"), {
      method: "POST",
    });
  } catch {
    // Ignore — we'll redirect regardless
  }
}
