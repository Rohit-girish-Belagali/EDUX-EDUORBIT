import { apiFetch, apiUrl } from "./core";
import { invalidateClientCache, withClientCache } from "./cache";

const PREFIX = "skills:";

export type SkillSource = "user" | "builtin" | "admin";
export interface SkillInfo { name: string; description: string; tags: string[]; source?: SkillSource; read_only?: boolean; }
export interface SkillDetail extends SkillInfo { content: string; }
export interface CreateSkillPayload { name: string; description: string; content: string; tags?: string[]; }
export interface UpdateSkillPayload { description?: string; content?: string; rename_to?: string; tags?: string[]; }

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const tag = String(item ?? "").trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}

async function asJson(response: Response) {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try { const body = await response.json(); if ((body as { detail?: string }).detail) detail = String((body as { detail: string }).detail); } catch { /* ignore */ }
    throw new Error(detail);
  }
  return response.json();
}

export function invalidateSkillsCache(): void { invalidateClientCache(PREFIX); }

export async function listSkills(options?: { force?: boolean }): Promise<SkillInfo[]> {
  return withClientCache<SkillInfo[]>(`${PREFIX}list`, async () => {
    const response = await apiFetch(apiUrl("/api/v1/skills/list"), { cache: "no-store" });
    const data = await asJson(response);
    const items = Array.isArray((data as { skills?: unknown[] }).skills) ? (data as { skills: Record<string, unknown>[] }).skills : [];
    return items.map((item) => ({
      name: String(item?.name ?? ""), description: String(item?.description ?? ""),
      tags: normalizeTags(item?.tags), source: (item?.source === "builtin" || item?.source === "admin" ? item.source : "user") as SkillSource,
      read_only: Boolean(item?.read_only),
    }));
  }, { force: options?.force });
}

export async function createSkill(payload: CreateSkillPayload): Promise<SkillInfo> {
  const response = await apiFetch(apiUrl("/api/v1/skills/create"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, tags: payload.tags ?? [] }),
  });
  const data = await asJson(response) as Record<string, unknown>;
  invalidateSkillsCache();
  return { name: String(data?.name ?? payload.name), description: String(data?.description ?? ""), tags: normalizeTags(data?.tags ?? payload.tags) };
}

export async function deleteSkill(name: string): Promise<void> {
  const response = await apiFetch(apiUrl(`/api/v1/skills/${encodeURIComponent(name)}`), { method: "DELETE" });
  await asJson(response);
  invalidateSkillsCache();
}
