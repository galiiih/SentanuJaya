import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "../../i18n";
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

const httpMessage = (status: number, language: "id" | "en") => {
  if (language === "en") {
    return status === 401 ? "Your session has expired. Please sign in again."
      : status === 403 ? "You do not have permission to access this data."
      : status === 404 ? "The Nanu service is not available on this server (the /puffy/chat endpoint is missing)."
      : status === 429 ? "Too many requests. Please try again shortly."
      : `The server encountered an error (${status}). Please try again.`;
  }
  return status === 401 ? "Sesi berakhir. Silakan login ulang."
    : status === 403 ? "Kamu tidak punya izin untuk data ini."
    : status === 404 ? "Layanan Nanu belum tersedia di server (endpoint /puffy/chat belum ada)."
    : status === 429 ? "Terlalu banyak permintaan. Coba lagi sebentar lagi."
    : `Server bermasalah (${status}). Coba lagi.`;
};

export function usePuffy(api: PuffyApi) {
  const { language } = useLanguage();
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
      if (!res.ok) throw new Error(httpMessage(res.status, language));

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
      patch(aId, (m) => ({ ...m, error: e instanceof Error ? e.message : (language === "en" ? "An unexpected error occurred." : "Terjadi kesalahan.") }));
      setMood("sad", 3200);
    } finally {
      patch(aId, (m) => ({ ...m, streaming: false, status: undefined }));
      if (abortRef.current === ac) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  }, [language, patch, post, setMood]);

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
  }, [language, patch, post, setMood]);

  const runAction = useCallback(async (msg: AssistantMessage, action: PendingAction, decision: "confirm" | "cancel") => {
    const set = (s: ActionState) => patch(msg.id, (m) => ({ ...m, actions: { ...m.actions, [action.id]: s } }));
    set("confirming");
    try {
      const res = await post(`/actions/${encodeURIComponent(action.id)}/${decision}`, {});
      let payload: { message?: string; success?: boolean } = {};
      try { payload = await res.json(); } catch { /* response body may be empty */ }
      if (!res.ok || payload.success === false) {
        const fallback = language === "en"
          ? (res.status === 403 ? "You are not authorized to perform this action."
            : res.status === 404 ? "The action draft was not found or does not belong to this account."
            : res.status === 409 ? "The action was already processed or the source data changed. Refresh the data and create a new draft."
            : res.status === 410 ? "The action draft has expired. Submit the action again through Nanu."
            : res.status === 422 ? "The data does not meet ERP validation rules."
            : res.status >= 500 ? "The server could not process the action. Check the transaction status before retrying."
            : `The action failed (HTTP ${res.status}).`)
          : (res.status === 403 ? "Kamu tidak memiliki izin untuk tindakan ini."
            : res.status === 404 ? "Draft aksi tidak ditemukan atau bukan milik akun ini."
            : res.status === 409 ? "Aksi sudah diproses atau data sumber berubah. Muat ulang data lalu buat draft baru."
            : res.status === 410 ? "Draft aksi sudah kedaluwarsa. Ajukan ulang tindakan dari Nanu."
            : res.status === 422 ? "Data tidak memenuhi aturan ERP untuk tindakan ini."
            : res.status >= 500 ? "Server gagal memproses tindakan. Periksa status transaksi sebelum mencoba lagi."
            : `Tindakan gagal diproses (HTTP ${res.status}).`);
        throw new Error(payload.message || fallback);
      }
      set(decision === "confirm" ? "done" : "cancelled");
      if (decision === "confirm") setMood("excited");
    } catch (error) {
      const message = error instanceof Error ? error.message : (language === "en" ? "The action could not be processed." : "Tindakan gagal diproses.");
      patch(msg.id, (m) => ({ ...m, error: message }));
      set("failed");
      setMood("sad");
    }
  }, [patch, post, setMood]);

  return { messages, busy, mood, fx, setMood, send, stop, retry, feedback, runAction };
}
