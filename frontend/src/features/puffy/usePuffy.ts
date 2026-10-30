import { useCallback, useEffect, useRef, useState } from "react";
import { PUFFY_BASE_URL, PUFFY_MOCK } from "./config";
import { mockPuffyResponse } from "./mock";
import { readSSE } from "./sse";
import type { ActionState, AssistantMessage, ChatMessage, Mood, PageContext, PendingAction, UiHint } from "./types";
import { uid } from "./utils";

const MOOD_EMOJI: Partial<Record<Mood, string>> = { think: "💭", confused: "❓", sad: "💧", love: "💗", excited: "✨" };

export interface PuffyApi {
  baseUrl?: string;
  /** Dipanggil saat backend mengirim petunjuk halaman/elemen yang harus ditunjuk. */
  onUi?: (ui: UiHint) => void;
}

const httpMessage = (s: number) =>
  s === 401 ? "Sesi berakhir. Silakan login ulang."
  : s === 403 ? "Kamu tidak punya izin untuk data ini."
  : s === 404 ? "Layanan Puffy belum tersedia di server (endpoint /puffy/chat belum ada)."
  : s === 429 ? "Terlalu banyak permintaan. Coba lagi sebentar lagi."
  : `Server bermasalah (${s}). Coba lagi.`;

export function usePuffy(api: PuffyApi) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [mood, setMoodState] = useState<Mood>("neutral");
  const [fx, setFx] = useState<{ id: number; emoji: string }[]>([]);

  const apiRef = useRef(api);
  useEffect(() => { apiRef.current = api; });
  const convRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const moodTimer = useRef(0);
  const fxId = useRef(0);
  const lastRef = useRef<{ text: string; ctx: PageContext } | null>(null);

  const setMood = useCallback((m: Mood, ms = 2800) => {
    window.clearTimeout(moodTimer.current);
    setMoodState(m);
    const emoji = MOOD_EMOJI[m];
    if (emoji) {
      const id = ++fxId.current;
      setFx((f) => [...f, { id, emoji }]);
      window.setTimeout(() => setFx((f) => f.filter((x) => x.id !== id)), 1700);
    }
    if (m !== "neutral") moodTimer.current = window.setTimeout(() => setMoodState("neutral"), ms);
  }, []);

  useEffect(() => () => {
    window.clearTimeout(moodTimer.current);
    abortRef.current?.abort();
  }, []);

  const patch = useCallback((id: string, fn: (m: AssistantMessage) => AssistantMessage) => {
    setMessages((list) => list.map((m) => (m.id === id && m.role === "assistant" ? fn(m) : m)));
  }, []);

  const post = useCallback(async (path: string, body: unknown, signal?: AbortSignal): Promise<Response> => {
    if (PUFFY_MOCK) return mockPuffyResponse(path, body, signal);
    // Sesi Laravel memakai cookie (sama seperti Axios di services/api.ts: withCredentials).
    return fetch(`${apiRef.current.baseUrl ?? PUFFY_BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      signal,
      headers: { "Content-Type": "application/json", Accept: path === "/chat" ? "text/event-stream" : "application/json" },
      body: JSON.stringify(body),
    });
  }, []);

  const send = useCallback(async (text: string, ctx: PageContext) => {
    const clean = text.trim();
    if (!clean) return;
    abortRef.current?.abort();
    lastRef.current = { text: clean, ctx };

    const aId = uid();
    setMessages((l) => [
      ...l,
      { id: uid(), role: "user", text: clean },
      { id: aId, role: "assistant", text: "", status: "…", streaming: true, results: [], actions: {} },
    ]);
    setBusy(true);
    setMood("think", 60_000);

    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const res = await post("/chat", { message: clean, conversation_id: convRef.current, page_context: ctx }, ac.signal);
      if (!res.ok) throw new Error(httpMessage(res.status));

      let gotResult = false;
      for await (const ev of readSSE(res)) {
        switch (ev.event) {
          case "status":
            patch(aId, (m) => ({ ...m, status: ev.data.label }));
            if (ev.data.ui) apiRef.current.onUi?.(ev.data.ui);
            break;
          case "tool_result":
            gotResult = true;
            patch(aId, (m) => ({ ...m, results: [...m.results, ev.data] }));
            setMood(ev.data.hasData ? "happy" : "confused", 3200);
            if (ev.data.ui) apiRef.current.onUi?.(ev.data.ui);
            break;
          case "token":
            patch(aId, (m) => ({ ...m, status: undefined, text: m.text + ev.data.text }));
            break;
          case "done":
            convRef.current = ev.data.conversation_id;
            patch(aId, (m) => ({ ...m, serverId: ev.data.message_id }));
            break;
          case "error":
            throw new Error(ev.data.message);
        }
      }
      if (!gotResult) setMood("happy", 2000);
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        if (abortRef.current === ac) setMood("neutral"); // dihentikan manual
        return;
      }
      patch(aId, (m) => ({ ...m, error: e instanceof Error ? e.message : "Terjadi kesalahan." }));
      setMood("sad", 3200);
    } finally {
      patch(aId, (m) => ({ ...m, streaming: false, status: undefined }));
      if (abortRef.current === ac) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }, [patch, post, setMood]);

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const retry = useCallback(() => {
    const last = lastRef.current;
    if (!last) return;
    setMessages((l) => l.slice(0, -2)); // buang pertanyaan + jawaban gagal
    void send(last.text, last.ctx);
  }, [send]);

  const feedback = useCallback(async (msg: AssistantMessage, value: "up" | "down") => {
    patch(msg.id, (m) => ({ ...m, feedback: value }));
    setMood(value === "up" ? "love" : "sad");
    if (!msg.serverId) return;
    try { await post("/feedback", { message_id: msg.serverId, value }); } catch { /* best-effort */ }
  }, [patch, post, setMood]);

  const runAction = useCallback(async (msg: AssistantMessage, action: PendingAction, decision: "confirm" | "cancel") => {
    const set = (s: ActionState) => patch(msg.id, (m) => ({ ...m, actions: { ...m.actions, [action.id]: s } }));
    set("confirming");
    try {
      const res = await post(`/actions/${encodeURIComponent(action.id)}/${decision}`, {});
      if (!res.ok) throw new Error(String(res.status));
      set(decision === "confirm" ? "done" : "cancelled");
      if (decision === "confirm") setMood("excited");
    } catch {
      set("failed");
      setMood("sad");
    }
  }, [patch, post, setMood]);

  return { messages, busy, mood, fx, setMood, send, stop, retry, feedback, runAction };
}
