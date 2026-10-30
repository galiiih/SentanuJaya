import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Mic, Minus, Send, Square, ThumbsDown, ThumbsUp } from "lucide-react";
import { useAuth } from "../../auth";
import { useLanguage } from "../../i18n";
import { PUFFY_BASE_URL, PUFFY_MOCK, ROUTES, resolveTarget } from "./config";
import { getPuffyEntity } from "./pageContext";
import { PuffyMascot } from "./PuffyMascot";
import { getStrings, type PuffyStrings } from "./strings";
import { ToolResultCard } from "./ToolResultCard";
import type { AssistantMessage, PageContext, PendingAction, UiHint } from "./types";
import { usePuffy } from "./usePuffy";
import { useSpeechInput, useSpeechOutput } from "./useSpeech";
import { waitFor } from "./utils";
import "./puffy.css";

const SIZE = { open: 64, point: 56, closed: 60 } as const;
const MARGIN = 20;
const PANEL = { width: 360, maxHeight: 560, mobileHeight: 416, bottom: 88, mobileBreak: 820, headerHeight: 64 } as const;

export interface PuffyAssistantProps {
  /** Default "/api/v1/puffy". */
  baseUrl?: string;
  /** Panel mengecil menjadi balon setelah sekian ms tanpa aktivitas. Default 9000. */
  idleAfterMs?: number;
  voice?: boolean;
  /** Mulai dalam keadaan terbuka. Default false: Puffy mulai sebagai balon "Ask me" agar tidak mengubah tata letak halaman. */
  defaultOpen?: boolean;
}

export function PuffyAssistant({ baseUrl = PUFFY_BASE_URL, idleAfterMs = 9000, voice = true, defaultOpen = false }: PuffyAssistantProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, hasPermission } = useAuth();
  const { language, t } = useLanguage();
  const s = getStrings(language);

  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState("");
  const [say, setSay] = useState<string | null>(defaultOpen ? s.greet : null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });

  const panelRef = useRef<HTMLElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const lastActive = useRef(0);
  const hoverRef = useRef(false);
  const sayTimer = useRef(0);
  const lastUiKey = useRef("");
  const viaVoice = useRef(false);
  const pathRef = useRef(pathname);
  const permRef = useRef(hasPermission);
  const sRef = useRef<PuffyStrings>(s);
  const uiRef = useRef<(ui: UiHint) => void>(() => {});
  const submitRef = useRef<(text: string) => void>(() => {});
  const busyRef = useRef(false);
  const voiceBusyRef = useRef(false);
  useEffect(() => { pathRef.current = pathname; permRef.current = hasPermission; sRef.current = s; });

  const ping = useCallback(() => { lastActive.current = Date.now(); }, []);
  useEffect(() => { lastActive.current = Date.now(); }, []);

  const showSay = useCallback((text: string, ms = 3200) => {
    setSay(text);
    window.clearTimeout(sayTimer.current);
    sayTimer.current = window.setTimeout(() => setSay(null), ms);
  }, []);
  useEffect(() => {
    sayTimer.current = window.setTimeout(() => setSay(null), 4200);
    return () => window.clearTimeout(sayTimer.current);
  }, []);

  /* ---------- Chat + suara ---------- */
  const { messages, busy, mood, fx, setMood, send, stop, retry, feedback, runAction } = usePuffy({
    baseUrl,
    onUi: (ui) => uiRef.current(ui),
  });

  const speechOut = useSpeechOutput(language === "en" ? "en-US" : "id-ID");
  const speechIn = useSpeechInput({
    lang: language === "en" ? "en-US" : "id-ID",
    onInterim: setInput,
    onFinal: (text) => { viaVoice.current = true; submitRef.current(text); },
    onError: (code) => showSay(code === "denied" ? s.micDenied : s.micNoSpeech, 4500),
  });

  const closePanel = useCallback(() => {
    setOpen(false);
    setPointer(null);
    targetRef.current = null;
    lastUiKey.current = "";
  }, []);

  const openPanel = useCallback(() => {
    setOpen(true);
    ping();
  }, [ping]);

  /* ---------- Menunjuk elemen: pindah halaman, scroll, sorot, Puffy duduk di pojok kanan atas ---------- */
  const track = useCallback(() => {
    const el = targetRef.current;
    if (!el) return;
    if (!el.isConnected) { targetRef.current = null; setPointer(null); return; }
    const r = el.getBoundingClientRect();
    const size = SIZE.point;
    setPointer({
      x: Math.min(window.innerWidth - size - 4, Math.max(4, r.right - size + 12)),
      y: Math.min(window.innerHeight - size - 8, Math.max(PANEL.headerHeight + 8, r.top - size + 8)),
    });
  }, []);

  const pointAt = useCallback(async (ui: UiHint) => {
    const key = `${ui.route ?? ""}|${ui.target ?? ""}`;
    if (key === lastUiKey.current) return;
    lastUiKey.current = key;

    if (ui.route) {
      const needed = ROUTES[ui.route];
      if (!needed) return; // rute di luar daftar diabaikan
      if (!permRef.current(needed)) {
        showSay(sRef.current.noAccess, 4000);
        setMood("confused");
        return;
      }
      if (ui.route !== pathRef.current) {
        navigate(ui.route);
        await waitFor(() => (pathRef.current === ui.route ? true : null));
      }
    }
    if (!ui.target) return;
    const found = await waitFor(() => resolveTarget(ui.target!));
    if (!found || lastUiKey.current !== key) return;

    const el = found.closest<HTMLElement>(".card") ?? found;
    targetRef.current = el;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("puffy-hl");
    window.setTimeout(() => el.classList.remove("puffy-hl"), 3600);
    track();
    window.setTimeout(track, 600);
  }, [navigate, setMood, showSay, track]);
  useEffect(() => { uiRef.current = (ui) => { void pointAt(ui); }; }, [pointAt]);

  useEffect(() => {
    let raf = 0;
    const onChange = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(track);
    };
    window.addEventListener("scroll", onChange, true); // .app-content adalah kontainer scroll
    window.addEventListener("resize", onChange);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [track]);

  /* ---------- Kirim pertanyaan ---------- */
  const submit = useCallback((text: string) => {
    const q = text.trim();
    if (!q) return;
    ping();
    setOpen(true);
    setInput("");
    lastUiKey.current = "";
    targetRef.current = null;
    setPointer(null);
    speechOut.cancel();
    const ctx: PageContext = {
      route: pathRef.current,
      title: document.title,
      language,
      role: user?.role ?? "",
      entity: getPuffyEntity(),
    };
    void send(q, ctx);
  }, [language, ping, send, speechOut, user?.role]);
  useEffect(() => { submitRef.current = submit; }, [submit]);

  // Bacakan jawaban bila pertanyaannya lewat suara.
  const wasBusy = useRef(false);
  useEffect(() => {
    if (wasBusy.current && !busy && viaVoice.current) {
      viaVoice.current = false;
      const last = messages[messages.length - 1];
      if (last?.role === "assistant") speechOut.speak(last.text || last.results[0]?.summary || "");
    }
    wasBusy.current = busy;
  }, [busy, messages, speechOut]);

  const last = messages[messages.length - 1];
  const talking = (last?.role === "assistant" && last.streaming && last.text.length > 0) || speechOut.speaking;

  /* ---------- Idle: mengecil menjadi balon, kecuali panel sedang dibaca atau dipakai ---------- */
  useEffect(() => { busyRef.current = busy; }, [busy]);
  useEffect(() => { voiceBusyRef.current = speechIn.listening || speechOut.speaking; }, [speechIn.listening, speechOut.speaking]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!open) return;
      const drafting = !!inputRef.current?.value && !!panelRef.current?.contains(document.activeElement);
      if (busyRef.current || voiceBusyRef.current || hoverRef.current || drafting) { ping(); return; }
      if (Date.now() - lastActive.current > idleAfterMs) closePanel();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, idleAfterMs, ping, closePanel]);

  // Ctrl+K membuka/memfokuskan Puffy. Esc hanya diproses di dalam panel (lihat onKeyDown) agar tidak bentrok dengan modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) return;
      e.preventDefault();
      if (open) inputRef.current?.focus();
      else { openPanel(); window.setTimeout(() => inputRef.current?.focus(), 650); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, openPanel]);

  // Beri ruang di layout: konten utama menyempit saat panel terbuka dan melebar saat Puffy mengecil (CSS di puffy.css).
  const mobile = vp.w <= PANEL.mobileBreak;
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("puffy-ready");
    root.classList.toggle("puffy-open", open && !mobile);
    return () => root.classList.remove("puffy-ready", "puffy-open");
  }, [open, mobile]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ---------- Posisi maskot (diturunkan dari ukuran viewport, sama dengan CSS panel) ---------- */
  const panelW = mobile ? vp.w - 24 : Math.min(PANEL.width, vp.w - 24);
  const panelH = mobile ? Math.min(PANEL.mobileHeight, vp.h * 0.55) : Math.min(PANEL.maxHeight, vp.h - 168);
  const panelLeft = vp.w - (mobile ? 12 : MARGIN) - panelW;
  const panelTop = vp.h - PANEL.bottom - panelH;
  const home = { x: Math.max(4, panelLeft - 22), y: Math.max(PANEL.headerHeight + 4, panelTop - 46) };

  const size = !open ? SIZE.closed : pointer ? SIZE.point : SIZE.open;
  const pos = !open ? { x: vp.w - MARGIN - SIZE.closed, y: vp.h - MARGIN - SIZE.closed } : (pointer ?? home);
  const sayText = !open ? s.askMe : say;
  const sayPlace = !open ? "puffy-say--closed" : pointer ? "puffy-say--left" : "puffy-say--home";

  const onMascot = () => {
    ping();
    if (!open) { openPanel(); setMood("happy"); showSay(s.greet); return; }
    setMood("happy");
    showSay(s.quips[Math.floor(Math.random() * s.quips.length)]);
  };

  const copy = (text: string, done: () => void, fail: () => void) => {
    const clip = navigator.clipboard;
    if (!clip) return fail();
    clip.writeText(text).then(done, fail);
  };

  const pageLabel = ((): string => {
    const nav = t.nav;
    const labels: Record<string, string | undefined> = {
      "/dashboard": nav.dashboard, "/custody": nav.custody, "/customer-po": nav.customerPo, "/delivery": nav.delivery,
      "/materials": nav.materials, "/invoicing": nav.invoicing, "/payments": nav.payments, "/reports": nav.reports, "/master": nav.master,
    };
    return labels[pathname] ?? pathname;
  })();

  const suggestions = s.suggestions.filter((x) => hasPermission(x.permission));
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <>
      <section
        ref={panelRef}
        className="puffy-panel"
        data-open={open}
        role="region"
        aria-label={s.title}
        aria-hidden={!open}
        inert={!open}
        onPointerEnter={() => { hoverRef.current = true; ping(); }}
        onPointerLeave={() => { hoverRef.current = false; ping(); }}
        onPointerMove={ping}
        onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); closePanel(); } }}
      >
        <header className="puffy-panel__header">
          <span className="puffy-dot" aria-hidden="true" />
          <h2>{s.title}</h2>
          {PUFFY_MOCK && <small className="puffy-badge">{s.mockBadge}</small>}
          <button type="button" className="icon-button puffy-minimize" onClick={closePanel} aria-label={s.minimize} title={s.minimize}>
            <Minus size={16} />
          </button>
        </header>
        <p className="puffy-panel__context">{s.page}: <b>{pageLabel}</b> · {s.shortcutHint}</p>

        <div ref={logRef} className="puffy-log" role="log" aria-live="polite">
          {messages.length === 0 && <p className="puffy-msg puffy-msg--ai">{s.welcome(firstName)}</p>}
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p key={m.id} className="puffy-msg puffy-msg--me">{m.text}</p>
            ) : (
              <AssistantBubble key={m.id} m={m} s={s} canRetry={i === messages.length - 1}
                onRetry={retry} onFeedback={feedback} onAction={runAction} onCopy={copy} />
            ),
          )}
        </div>

        <div className="puffy-chips">
          {suggestions.map((x) => (
            <button key={x.text} type="button" disabled={busy} onClick={() => submit(x.text)}>{x.text}</button>
          ))}
        </div>

        <form className="puffy-form" onSubmit={(e) => { e.preventDefault(); submit(input); }}>
          <input ref={inputRef} className="input" value={input} onChange={(e) => { setInput(e.target.value); ping(); }}
            placeholder={s.placeholder} autoComplete="off" aria-label={s.placeholder} />
          {voice && speechIn.supported && (
            <button type="button" className={`icon-button puffy-mic${speechIn.listening ? " is-listening" : ""}`}
              onClick={speechIn.toggle} aria-pressed={speechIn.listening} aria-label={s.mic} title={s.mic}>
              <Mic size={16} />
            </button>
          )}
          {busy ? (
            <button type="button" className="button button--secondary puffy-send" onClick={stop} aria-label={s.stop} title={s.stop}>
              <Square size={14} />
            </button>
          ) : (
            <button type="submit" className="button button--primary puffy-send" disabled={!input.trim()} aria-label={s.send} title={s.send}>
              <Send size={14} />
            </button>
          )}
        </form>
      </section>

      <div className="puffy-mascot" style={{ width: size, height: size, transform: `translate(${pos.x}px, ${pos.y}px)` }}>
        <button type="button" className="puffy-mascot__button" onClick={onMascot} aria-label={open ? "Puffy" : s.openChat}>
          <PuffyMascot mood={mood} talking={talking} bubble={!open} />
          <span className="puffy-tail" data-visible={!open} aria-hidden="true" />
          {fx.map((f) => <span key={f.id} className="puffy-fx" aria-hidden="true">{f.emoji}</span>)}
          <span role="status" className={`puffy-say ${sayPlace}`} data-visible={Boolean(sayText)}>{sayText}</span>
        </button>
      </div>
    </>
  );
}

interface BubbleProps {
  m: AssistantMessage;
  s: PuffyStrings;
  canRetry: boolean;
  onRetry: () => void;
  onFeedback: (m: AssistantMessage, v: "up" | "down") => void;
  onAction: (m: AssistantMessage, a: PendingAction, d: "confirm" | "cancel") => void;
  onCopy: (text: string, done: () => void, fail: () => void) => void;
}

function AssistantBubble({ m, s, canRetry, onRetry, onFeedback, onAction, onCopy }: BubbleProps) {
  const [copyLabel, setCopyLabel] = useState<string | null>(null);
  const finished = !m.streaming && !m.error && (m.text || m.results.length > 0);
  const flash = (label: string) => { setCopyLabel(label); window.setTimeout(() => setCopyLabel(null), 1600); };

  return (
    <div className="puffy-ai">
      {m.status && (
        <div className="puffy-status">
          <i /><i /><i />
          <span>{m.status === "…" ? "" : m.status}</span>
        </div>
      )}
      {m.text && <p className="puffy-msg puffy-msg--ai">{m.text}</p>}
      {m.results.map((r, i) => (
        <ToolResultCard key={`${r.tool}-${i}`} result={r} s={s}
          actionState={r.action ? (m.actions[r.action.id] ?? "pending") : undefined}
          onAction={(a, d) => onAction(m, a, d)} />
      ))}
      {m.error && (
        <div role="alert" className="alert alert--danger puffy-error">
          <span>{m.error}</span>
          {canRetry && <button type="button" onClick={onRetry}>{s.retry}</button>}
        </div>
      )}
      {finished && (
        <div className="puffy-feedback">
          <button type="button" aria-pressed={m.feedback === "up"} onClick={() => onFeedback(m, "up")} title={s.helpful}>
            <ThumbsUp size={13} /><span className="sr-only">{s.helpful}</span>
          </button>
          <button type="button" aria-pressed={m.feedback === "down"} onClick={() => onFeedback(m, "down")} title={s.notHelpful}>
            <ThumbsDown size={13} /><span className="sr-only">{s.notHelpful}</span>
          </button>
          <button type="button" onClick={() => onCopy(m.text || m.results.map((r) => r.summary).join("\n"), () => flash(s.copied), () => flash(s.copyFailed))}>
            <Copy size={13} /> {copyLabel ?? s.copy}
          </button>
        </div>
      )}
    </div>
  );
}
