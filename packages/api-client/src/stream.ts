import type { StreamEvent } from "./ws";

type ContentMeta = {
  call_id?: string;
  call_kind?: string;
  call_state?: string;
  call_role?: string;
  trace_kind?: string;
};

function eventMeta(event: StreamEvent): ContentMeta {
  return (event.metadata ?? {}) as ContentMeta;
}

export function shouldAppendEventContent(event: StreamEvent): boolean {
  if (event.type !== "content") return false;
  const meta = eventMeta(event);
  if (!meta.call_id) return true;
  return (
    meta.call_kind === "llm_final_response" ||
    meta.call_kind === "agent_loop_round"
  );
}

export function collectNarrationCallIds(events: StreamEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const event of events) {
    const meta = eventMeta(event);
    if (
      meta.trace_kind === "call_status" &&
      meta.call_state === "complete" &&
      meta.call_role === "narration" &&
      meta.call_id
    ) {
      ids.add(meta.call_id);
    }
  }
  return ids;
}

export function isNarrationMarker(event: StreamEvent): boolean {
  const meta = eventMeta(event);
  return (
    meta.trace_kind === "call_status" &&
    meta.call_state === "complete" &&
    meta.call_role === "narration"
  );
}

export function recomputeAnswerContent(events: StreamEvent[]): string {
  const narration = collectNarrationCallIds(events);
  let content = "";
  for (const event of events) {
    if (!shouldAppendEventContent(event)) continue;
    const callId = eventMeta(event).call_id;
    if (callId && narration.has(callId)) continue;
    content += event.content;
  }
  return content;
}
