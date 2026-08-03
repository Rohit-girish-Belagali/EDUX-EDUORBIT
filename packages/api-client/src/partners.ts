import { apiFetch, apiUrl } from "./core";
import type { LLMSelection } from "./ws";

export interface PartnerInfo {
  partner_id: string; name: string; description: string;
  channels: string[] | Record<string, unknown>;
  llm_selection?: LLMSelection | null; backup_llm_selection?: LLMSelection | null;
  model?: string | null; language?: string; emoji?: string; color?: string; avatar?: string;
  soul_origin?: { type?: string; id?: string };
  enabled_tools?: string[] | null; builtin_tools?: string[] | null; mcp_tools?: string[] | null;
  running: boolean; started_at: string | null;
  last_reload_error?: string | null; start_error?: string;
}

export interface SoulSpec { source: "default" | "library" | "persona" | "custom"; id?: string; content?: string; }

export interface CreatePartnerPayload {
  partner_id?: string; name: string; description?: string; soul?: SoulSpec;
  channels?: Record<string, unknown>; llm_selection?: LLMSelection | null;
  backup_llm_selection?: LLMSelection | null; language?: string;
  emoji?: string; color?: string; avatar?: string;
  enabled_tools?: string[] | null; builtin_tools?: string[] | null; mcp_tools?: string[] | null;
  assets?: { knowledge_bases?: string[]; skills?: string[]; notebooks?: string[] };
  start?: boolean;
}

export interface PartnerSessionInfo {
  session_key: string; title?: string; message_count: number;
  updated_at: string; last_message: string; archived?: boolean;
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string | { message?: string } };
    const detail = body.detail;
    const msg = typeof detail === "string" ? detail : (detail as { message?: string })?.message ?? `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function listPartners(): Promise<PartnerInfo[]> {
  return json(await apiFetch(apiUrl("/api/v1/partners"), { cache: "no-store" }));
}

export async function getPartner(partnerId: string, options?: { includeSecrets?: boolean }): Promise<PartnerInfo> {
  const query = options?.includeSecrets ? "?include_secrets=true" : "";
  return json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}${query}`)));
}

export async function createPartner(payload: CreatePartnerPayload): Promise<PartnerInfo> {
  return json(await apiFetch(apiUrl("/api/v1/partners"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
}

export async function updatePartner(partnerId: string, payload: Partial<CreatePartnerPayload>): Promise<PartnerInfo> {
  return json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}`), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }));
}

export async function startPartner(partnerId: string): Promise<PartnerInfo> {
  return json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}/start`), { method: "POST" }));
}

export async function stopPartner(partnerId: string): Promise<void> {
  await json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}/stop`), { method: "POST" }));
}

export async function destroyPartner(partnerId: string): Promise<void> {
  await json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}`), { method: "DELETE" }));
}

export async function getPartnerSessions(partnerId: string): Promise<PartnerSessionInfo[]> {
  return json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}/sessions`), { cache: "no-store" }));
}

export async function getPartnerHistory(partnerId: string, options?: { sessionKey?: string; limit?: number }): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams();
  if (options?.sessionKey) params.set("session_key", options.sessionKey);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString() ? `?${params.toString()}` : "";
  return json(await apiFetch(apiUrl(`/api/v1/partners/${encodeURIComponent(partnerId)}/history${query}`)));
}
