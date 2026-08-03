import { apiFetch, apiUrl } from "./core";
import { invalidateClientCache, withClientCache } from "./cache";

const PREFIX = "knowledge:";

export interface KnowledgeBaseSummary {
  id?: string;
  name: string;
  is_default?: boolean;
  status?: string;
  path?: string;
  metadata?: Record<string, unknown>;
  progress?: Record<string, unknown>;
  statistics?: Record<string, unknown>;
  source?: "admin" | "user";
  assigned?: boolean;
  read_only?: boolean;
  provenance_label?: string;
  available?: boolean;
}

export interface RagProviderSummary {
  id: string;
  name: string;
  description: string;
  configured?: boolean;
  requires_api_key?: boolean;
  modes?: string[];
  default_mode?: string;
  linkable?: boolean;
}

export interface KnowledgeUploadPolicy {
  extensions: string[];
  accept: string;
  max_file_size_bytes: number;
}

export interface KnowledgeBaseFile {
  name: string;
  type?: "file" | "folder";
  size?: number;
  modified?: number;
  mime_type?: string | null;
}

export interface KnowledgeTaskResponse {
  task_id?: string;
  message?: string;
  noop?: boolean;
}

async function readErrorDetail(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if ((body as { detail?: string }).detail) return String((body as { detail: string }).detail);
  } catch { /* not JSON */ }
  return fallback;
}

export function invalidateKnowledgeCaches(): void {
  invalidateClientCache(PREFIX);
}

export async function listKnowledgeBases(options?: { force?: boolean }): Promise<KnowledgeBaseSummary[]> {
  return withClientCache<KnowledgeBaseSummary[]>(
    `${PREFIX}list`,
    async () => {
      const response = await apiFetch(apiUrl("/api/v1/knowledge/list"), { cache: "no-store" });
      const data = await response.json();
      return Array.isArray(data) ? data : Array.isArray((data as { knowledge_bases?: unknown[] }).knowledge_bases) ? (data as { knowledge_bases: KnowledgeBaseSummary[] }).knowledge_bases : [];
    },
    { force: options?.force },
  );
}

export async function listRagProviders(options?: { force?: boolean }): Promise<RagProviderSummary[]> {
  return withClientCache<RagProviderSummary[]>(
    `${PREFIX}providers`,
    async () => {
      const response = await apiFetch(apiUrl("/api/v1/knowledge/rag-providers"), { cache: "no-store" });
      const data = await response.json();
      return Array.isArray((data as { providers?: unknown[] }).providers) ? (data as { providers: RagProviderSummary[] }).providers : [];
    },
    { force: options?.force },
  );
}

export async function listKnowledgeBaseFiles(name: string, options?: { force?: boolean }): Promise<KnowledgeBaseFile[]> {
  return withClientCache<KnowledgeBaseFile[]>(
    `${PREFIX}files:${name}`,
    async () => {
      const response = await apiFetch(apiUrl(`/api/v1/knowledge/${encodeURIComponent(name)}/files`), { cache: "no-store" });
      if (!response.ok) throw new Error(await readErrorDetail(response, `Failed to list files (${response.status})`));
      const data = await response.json();
      return Array.isArray((data as { files?: unknown[] }).files) ? (data as { files: KnowledgeBaseFile[] }).files : [];
    },
    { force: options?.force, ttlMs: 15_000 },
  );
}

export function knowledgeBaseFilePath(kbName: string, filename: string): string {
  return `/api/v1/knowledge/${encodeURIComponent(kbName)}/files/${filename.split("/").map(encodeURIComponent).join("/")}`;
}

export async function createKnowledgeBase(payload: {
  name: string;
  provider: string;
  files: File[];
}): Promise<KnowledgeTaskResponse> {
  const form = new FormData();
  form.append("name", payload.name);
  form.append("rag_provider", payload.provider);
  payload.files.forEach((file) => {
    form.append("files", file);
    form.append("rel_paths", (file as File & { webkitRelativePath?: string }).webkitRelativePath || "");
  });
  const res = await apiFetch(apiUrl("/api/v1/knowledge/create"), { method: "POST", body: form });
  if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to create knowledge base"));
  invalidateKnowledgeCaches();
  return (await res.json()) as KnowledgeTaskResponse;
}

export async function uploadKnowledgeBaseFiles(
  name: string,
  files: File[],
  options?: { provider?: string },
): Promise<KnowledgeTaskResponse> {
  const form = new FormData();
  files.forEach((file) => {
    form.append("files", file);
    form.append("rel_paths", (file as File & { webkitRelativePath?: string }).webkitRelativePath || "");
  });
  if (options?.provider) form.append("rag_provider", options.provider);
  const res = await apiFetch(apiUrl(`/api/v1/knowledge/${encodeURIComponent(name)}/upload`), { method: "POST", body: form });
  if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to upload files"));
  invalidateKnowledgeCaches();
  return (await res.json()) as KnowledgeTaskResponse;
}

export async function deleteKbFile(name: string, filename: string): Promise<{ was_indexed: boolean }> {
  const res = await apiFetch(apiUrl(knowledgeBaseFilePath(name, filename)), { method: "DELETE" });
  if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to delete file"));
  invalidateKnowledgeCaches();
  return (await res.json()) as { was_indexed: boolean };
}

export async function reindexKnowledgeBase(name: string): Promise<KnowledgeTaskResponse> {
  const res = await apiFetch(apiUrl(`/api/v1/knowledge/${encodeURIComponent(name)}/reindex`), { method: "POST" });
  if (!res.ok) throw new Error(await readErrorDetail(res, `Re-index failed (${res.status})`));
  invalidateKnowledgeCaches();
  return (await res.json()) as KnowledgeTaskResponse;
}

export async function deleteKnowledgeBase(name: string): Promise<void> {
  const res = await apiFetch(apiUrl(`/api/v1/knowledge/${encodeURIComponent(name)}`), { method: "DELETE" });
  if (!res.ok) throw new Error(await readErrorDetail(res, `Delete failed (${res.status})`));
  invalidateKnowledgeCaches();
}

export async function setDefaultKnowledgeBase(name: string): Promise<void> {
  const res = await apiFetch(apiUrl(`/api/v1/knowledge/default/${encodeURIComponent(name)}`), { method: "PUT" });
  if (!res.ok) throw new Error(await readErrorDetail(res, "Failed to set default"));
  invalidateKnowledgeCaches();
}
