import React, {
  createContext, useCallback, useContext,
  useEffect, useMemo, useReducer, useRef,
} from "react";
import {
  UnifiedWSClient, StartTurnMessage,
  type StreamEvent,
} from "@eduorbit/api-client";
import { getSession, deleteMessage, type SessionMessage } from "@eduorbit/api-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  stage?: string;
  isStreaming?: boolean;
  error?: string | null;
}

interface ChatState {
  sessionId: string | null;
  sessionTitle: string;
  messages: ChatMsg[];
  isStreaming: boolean;
  currentStage: string;
  activeTurnId: string | null;
}

type ChatAction =
  | { type: "NEW_SESSION" }
  | { type: "LOAD_SESSION"; sessionId: string; title: string; messages: ChatMsg[] }
  | { type: "ADD_USER_MSG"; msg: ChatMsg }
  | { type: "STREAM_START"; turnId: string }
  | { type: "STREAM_EVENT"; event: StreamEvent }
  | { type: "STREAM_DONE"; sessionId: string; turnId: string }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "DELETE_MSG"; msgId: string }
  | { type: "SET_TITLE"; title: string };

const ASSISTANT_ID = "streaming-assistant";

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "NEW_SESSION":
      return { ...state, sessionId: null, sessionTitle: "New chat", messages: [], isStreaming: false, currentStage: "", activeTurnId: null };

    case "LOAD_SESSION":
      return { ...state, sessionId: action.sessionId, sessionTitle: action.title, messages: action.messages, isStreaming: false, currentStage: "", activeTurnId: null };

    case "ADD_USER_MSG":
      return { ...state, messages: [...state.messages, action.msg] };

    case "STREAM_START": {
      const assistantMsg: ChatMsg = { id: ASSISTANT_ID, role: "assistant", content: "", isStreaming: true };
      return { ...state, isStreaming: true, activeTurnId: action.turnId, currentStage: "", messages: [...state.messages, assistantMsg] };
    }

    case "STREAM_EVENT": {
      const ev = action.event;
      if (ev.type === "stage_start") return { ...state, currentStage: ev.stage ?? "" };
      if (ev.type !== "content" && ev.type !== "result") return state;
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === ASSISTANT_ID ? { ...m, content: m.content + (ev.content ?? "") } : m,
        ),
      };
    }

    case "STREAM_DONE": {
      const finalId = `msg-${Date.now()}`;
      return {
        ...state,
        isStreaming: false,
        currentStage: "",
        activeTurnId: null,
        sessionId: action.sessionId || state.sessionId,
        messages: state.messages.map(m =>
          m.id === ASSISTANT_ID ? { ...m, id: finalId, isStreaming: false } : m,
        ),
      };
    }

    case "STREAM_ERROR": {
      return {
        ...state,
        isStreaming: false,
        currentStage: "",
        activeTurnId: null,
        messages: state.messages.map(m =>
          m.id === ASSISTANT_ID ? { ...m, id: `err-${Date.now()}`, isStreaming: false, error: action.error } : m,
        ),
      };
    }

    case "DELETE_MSG":
      return { ...state, messages: state.messages.filter(m => m.id !== action.msgId) };

    case "SET_TITLE":
      return { ...state, sessionTitle: action.title };

    default:
      return state;
  }
}

const INITIAL_STATE: ChatState = {
  sessionId: null,
  sessionTitle: "New chat",
  messages: [],
  isStreaming: false,
  currentStage: "",
  activeTurnId: null,
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface ChatContextValue {
  state: ChatState;
  sendMessage: (content: string, options?: Partial<Pick<StartTurnMessage, "knowledge_bases" | "persona" | "llm_selection">>) => void;
  cancelTurn: () => void;
  newSession: () => void;
  loadSession: (sessionId: string) => Promise<void>;
  deleteMsg: (msgId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function sessionMessageToMsg(m: SessionMessage): ChatMsg {
  const role = m.role === "user" ? "user" : "assistant";
  const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
  return { id: String(m.id ?? Math.random()), role, content };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const wsRef = useRef<UnifiedWSClient | null>(null);

  useEffect(() => {
    const client = new UnifiedWSClient((event: StreamEvent) => {
      if (event.type === "done") {
        const sid = (event.session_id ?? event.metadata?.session_id ?? state.sessionId) as string;
        const tid = (event.turn_id ?? event.metadata?.turn_id ?? "") as string;
        dispatch({ type: "STREAM_DONE", sessionId: sid, turnId: tid });
      } else if (event.type === "error") {
        dispatch({ type: "STREAM_ERROR", error: event.content ?? "An error occurred" });
      } else {
        dispatch({ type: "STREAM_EVENT", event });
      }
    });
    client.connect();
    wsRef.current = client;
    return () => { client.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((
    content: string,
    options?: Partial<Pick<StartTurnMessage, "knowledge_bases" | "persona" | "llm_selection">>,
  ) => {
    if (!content.trim() || state.isStreaming) return;
    const userMsg: ChatMsg = { id: `user-${Date.now()}`, role: "user", content: content.trim() };
    dispatch({ type: "ADD_USER_MSG", msg: userMsg });

    const turnId = `turn-${Date.now()}`;
    dispatch({ type: "STREAM_START", turnId });

    const msg: StartTurnMessage = {
      type: "start_turn",
      content: content.trim(),
      session_id: state.sessionId ?? null,
      ...(options ?? {}),
    };
    wsRef.current?.send(msg);
  }, [state.isStreaming, state.sessionId]);

  const cancelTurn = useCallback(() => {
    if (!state.activeTurnId || !state.isStreaming) return;
    wsRef.current?.send({ type: "cancel_turn", turn_id: state.activeTurnId });
    dispatch({ type: "STREAM_ERROR", error: "Cancelled" });
  }, [state.activeTurnId, state.isStreaming]);

  const newSession = useCallback(() => { dispatch({ type: "NEW_SESSION" }); }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    try {
      const session = await getSession(sessionId);
      const messages = (session.messages ?? []).map(sessionMessageToMsg);
      dispatch({ type: "LOAD_SESSION", sessionId, title: session.title ?? "Chat", messages });
    } catch {
      // ignore — session list will still work
    }
  }, []);

  const deleteMsg = useCallback(async (msgId: string) => {
    if (state.sessionId) {
      await deleteMessage(state.sessionId, Number(msgId)).catch(() => {});
    }
    dispatch({ type: "DELETE_MSG", msgId });
  }, [state.sessionId]);

  const value = useMemo(() => ({ state, sendMessage, cancelTurn, newSession, loadSession, deleteMsg }), [state, sendMessage, cancelTurn, newSession, loadSession, deleteMsg]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
