import { apiFetch, apiUrl } from "./core";
import { invalidateClientCache, withClientCache } from "./cache";

const PREFIX = "personas:";

export type PersonaSource = "user" | "admin";

export interface PersonaInfo { name: string; description: string; source: PersonaSource; read_only: boolean; }
export interface PersonaDetail extends PersonaInfo { content: string; }
export interface CreatePersonaPayload { name: string; description: string; content: string; }
export interface UpdatePersonaPayload { description?: string; content?: string; rename_to?: string; }

async function asJson(response: Response) {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try { const body = await response.json(); if ((body as { detail?: string }).detail) detail = String((body as { detail: string }).detail); } catch { /* ignore */ }
    throw new Error(detail);
  }
  return response.json();
}

function normalizeInfo(item: { name?: unknown; description?: unknown; source?: unknown; read_only?: unknown }): PersonaInfo {
  return { name: String(item?.name ?? ""), description: String(item?.description ?? ""), source: item?.source === "admin" ? "admin" : "user", read_only: Boolean(item?.read_only) };
}

export async function listPersonas(options?: { force?: boolean }): Promise<PersonaInfo[]> {
  return withClientCache<PersonaInfo[]>(`${PREFIX}list`, async () => {
    const response = await apiFetch(apiUrl("/api/v1/personas/list"), { cache: "no-store" });
    const data = await asJson(response);
    return (Array.isArray((data as { personas?: unknown[] }).personas) ? (data as { personas: unknown[] }).personas : []).map(normalizeInfo as (item: unknown) => PersonaInfo);
  }, { force: options?.force });
}

export async function createPersona(payload: CreatePersonaPayload): Promise<PersonaInfo> {
  const response = await apiFetch(apiUrl("/api/v1/personas/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await asJson(response);
  invalidateClientCache(PREFIX);
  return normalizeInfo({ ...(data as object), name: (data as { name?: string }).name ?? payload.name });
}

export async function deletePersona(name: string): Promise<void> {
  const response = await apiFetch(apiUrl(`/api/v1/personas/${encodeURIComponent(name)}`), { method: "DELETE" });
  await asJson(response);
  invalidateClientCache(PREFIX);
}
