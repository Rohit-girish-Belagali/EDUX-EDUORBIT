import { apiFetch, apiUrl, wsUrl } from "./core";

export interface SubagentConnection {
  id: string; name: string; description?: string;
  transport: "stdio" | "sse" | "streamable_http" | "http";
  command?: string; args?: string[]; env?: Record<string, string>;
  url?: string; enabled: boolean; connected?: boolean;
  error?: string | null;
}

export interface CreateSubagentPayload {
  name: string; description?: string;
  transport: SubagentConnection["transport"];
  command?: string; args?: string[]; env?: Record<string, string>;
  url?: string; enabled?: boolean;
}

async function expectJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { detail?: string };
    throw new Error(body.detail ?? `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listSubagentConnections(): Promise<SubagentConnection[]> {
  return expectJson(await apiFetch(apiUrl("/api/v1/subagents"), { cache: "no-store" }));
}

export async function getSubagentConnection(id: string): Promise<SubagentConnection> {
  return expectJson(await apiFetch(apiUrl(`/api/v1/subagents/${encodeURIComponent(id)}`)));
}

export async function connectSubagent(payload: CreateSubagentPayload): Promise<SubagentConnection> {
  return expectJson(await apiFetch(apiUrl("/api/v1/subagents"), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function updateSubagentConnection(id: string, payload: Partial<CreateSubagentPayload>): Promise<SubagentConnection> {
  return expectJson(await apiFetch(apiUrl(`/api/v1/subagents/${encodeURIComponent(id)}`), {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  }));
}

export async function disconnectSubagent(id: string): Promise<void> {
  await expectJson(await apiFetch(apiUrl(`/api/v1/subagents/${encodeURIComponent(id)}`), { method: "DELETE" }));
}

export function openSubagentSocket(
  connectionId: string,
  onMessage: (data: Record<string, unknown>) => void,
): { disconnect(): void } {
  const ws = new WebSocket(wsUrl(`/ws/subagent/${encodeURIComponent(connectionId)}`));
  ws.onmessage = (ev) => {
    try { onMessage(JSON.parse(ev.data as string)); } catch {}
  };
  ws.onerror = (err) => console.error("Subagent WS error:", err);
  return { disconnect: () => ws.close() };
}
