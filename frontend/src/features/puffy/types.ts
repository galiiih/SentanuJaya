import type { Language } from "../../i18n";

export type Mood = "neutral" | "happy" | "think" | "confused" | "sad" | "love" | "excited";

export interface Metric { label: string; value: string }
export interface ChartPoint { label: string; value: number }

/**
 * Petunjuk untuk Puffy. `route` harus salah satu rute di config.ts.
 * `target` = kunci elemen (mis. "table", "kpi", "chart", "table:1") atau nilai atribut [data-puffy].
 */
export interface UiHint { route?: string; target?: string }

/** Aksi tulis yang menunggu konfirmasi admin. Backend hanya mengeksekusinya setelah /confirm. */
export interface PendingAction { id: string; label: string; description: string }
export type ActionState = "pending" | "confirming" | "done" | "cancelled" | "failed";

/** Hasil satu tool dari backend. Angka SELALU berasal dari sini, bukan dari teks model. */
export interface ToolResult {
  tool: string;
  title: string;
  summary: string;
  hasData: boolean;
  metrics?: Metric[];
  table?: { columns: string[]; rows: string[][] };
  chart?: { title: string; points: ChartPoint[] };
  source: string;
  /** ISO 8601, mis. "2026-10-28T14:05:00+07:00" */
  asOf: string;
  ui?: UiHint;
  action?: PendingAction;
}

export interface UserMessage { id: string; role: "user"; text: string }
export interface AssistantMessage {
  id: string;
  role: "assistant";
  text: string;
  status?: string;
  streaming: boolean;
  results: ToolResult[];
  actions: Record<string, ActionState>;
  error?: string;
  feedback?: "up" | "down";
  /** ID pesan di database (dari event `done`), dipakai untuk feedback. */
  serverId?: string;
}
export type ChatMessage = UserMessage | AssistantMessage;

export type StreamEvent =
  | { event: "status"; data: { label: string; ui?: UiHint } }
  | { event: "tool_result"; data: ToolResult }
  | { event: "token"; data: { text: string } }
  | { event: "done"; data: { message_id: string; conversation_id: string } }
  | { event: "error"; data: { message: string } };

export interface PageContext {
  route: string;
  title: string;
  language: Language;
  role: string;
  entity?: { type: string; id: string | number };
}
