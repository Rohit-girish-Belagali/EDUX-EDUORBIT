import { apiFetch, apiUrl, wsUrl } from "./core";
import type { Book, BookDetail, BookProposal, Page, Spine, Block } from "@eduorbit/types";

const BASE = "/api/v1/book";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await apiFetch(apiUrl(`${BASE}${path}`), {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let detail: string;
    try {
      const data = await res.json();
      detail = ((data as { detail?: string; message?: string }).detail || (data as { message?: string }).message) || res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`book api ${path} → ${res.status}: ${detail}`);
  }
  return (await res.json()) as T;
}

export interface CreateBookPayload {
  user_intent: string;
  chat_session_id?: string;
  chat_selections?: Array<{ session_id: string; message_ids: number[] }>;
  notebook_refs?: Array<Record<string, unknown>>;
  knowledge_bases?: string[];
  question_categories?: number[];
  question_entries?: number[];
  language?: string;
}

export const bookApi = {
  list: () => request<{ books: Book[] }>("/books"),
  get: (book_id: string) => request<BookDetail>(`/books/${encodeURIComponent(book_id)}`),
  delete: (book_id: string) => request<{ deleted: boolean; book_id: string }>(`/books/${encodeURIComponent(book_id)}`, { method: "DELETE" }),
  getSpine: (book_id: string) => request<{ spine: Spine }>(`/books/${encodeURIComponent(book_id)}/spine`),
  getPage: (book_id: string, page_id: string) => request<{ page: Page }>(`/books/${encodeURIComponent(book_id)}/pages/${encodeURIComponent(page_id)}`),
  create: (payload: CreateBookPayload) => request<{ book: Book; proposal: BookProposal }>("/books", { method: "POST", body: JSON.stringify(payload) }),
  confirmProposal: (book_id: string, proposal?: BookProposal) =>
    request<{ book: Book; spine: Spine }>("/books/confirm-proposal", { method: "POST", body: JSON.stringify({ book_id, proposal: proposal ?? null }) }),
  confirmSpine: (book_id: string, spine?: Spine, auto_compile = true) =>
    request<{ pages: Page[] }>("/books/confirm-spine", { method: "POST", body: JSON.stringify({ book_id, spine: spine ?? null, auto_compile }) }),
  compilePage: (book_id: string, page_id: string, force = false) =>
    request<{ page: Page }>("/books/compile-page", { method: "POST", body: JSON.stringify({ book_id, page_id, force }) }),
  regenerateBlock: (book_id: string, page_id: string, block_id: string, params_override?: Record<string, unknown>) =>
    request<{ block: Block | null }>("/books/regenerate-block", { method: "POST", body: JSON.stringify({ book_id, page_id, block_id, params_override: params_override ?? null }) }),
  insertBlock: (params: { book_id: string; page_id: string; block_type: string; params?: Record<string, unknown>; position?: number; compile_now?: boolean }) =>
    request<{ block: Block }>("/books/insert-block", { method: "POST", body: JSON.stringify({ compile_now: true, ...params }) }),
  deleteBlock: (book_id: string, page_id: string, block_id: string) =>
    request<{ ok: boolean }>("/books/delete-block", { method: "POST", body: JSON.stringify({ book_id, page_id, block_id }) }),
  rebuild: (book_id: string, auto_compile = true) =>
    request<{ pages: Page[] }>("/books/rebuild", { method: "POST", body: JSON.stringify({ book_id, auto_compile }) }),
  health: (book_id: string) =>
    request<{ kb_drift: Record<string, unknown>; log_health: Record<string, unknown> }>(`/books/${encodeURIComponent(book_id)}/health`),
  recordQuizAttempt: (params: { book_id: string; page_id: string; block_id: string; question_id?: string; user_answer?: string; is_correct: boolean }) =>
    request<{ progress: Record<string, unknown> }>("/books/quiz-attempt", { method: "POST", body: JSON.stringify(params) }),
};

export type BookWsEvent = { type: string; [key: string]: unknown };

export function openBookSocket(
  onEvent: (event: BookWsEvent) => void,
  onError?: (error: Event) => void,
): WebSocket {
  const socket = new WebSocket(wsUrl(`${BASE}/ws`));
  socket.onmessage = (event) => {
    try { onEvent(JSON.parse(event.data as string)); } catch { /* ignore */ }
  };
  if (onError) socket.onerror = onError;
  return socket;
}
