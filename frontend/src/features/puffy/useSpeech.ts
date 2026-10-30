import { useCallback, useEffect, useRef, useState } from "react";

// Tipe minimal Web Speech API (belum ada di lib.dom semua versi TypeScript).
interface SRAlt { transcript: string }
interface SRResult { readonly isFinal: boolean; readonly length: number; [i: number]: SRAlt }
interface SREvent extends Event { readonly resultIndex: number; readonly results: { readonly length: number; [i: number]: SRResult } }
interface SRErrorEvent extends Event { readonly error: string }
interface SRInstance {
  lang: string; interimResults: boolean; continuous: boolean;
  onstart: (() => void) | null; onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null; onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type SRCtor = new () => SRInstance;

function getCtor(): SRCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export type SpeechErrorCode = "denied" | "no-speech";

interface InputOpts {
  lang: string;
  onInterim: (t: string) => void;
  onFinal: (t: string) => void;
  onError: (code: SpeechErrorCode) => void;
}

/**
 * Speech-to-text bawaan browser. Catatan privasi: di Chrome audio diproses server browser,
 * jadi TIDAK lokal. Ganti dengan Whisper lokal bila data harus tetap on-premise.
 */
export function useSpeechInput(opts: InputOpts) {
  const optsRef = useRef(opts);
  useEffect(() => { optsRef.current = opts; });
  const recRef = useRef<SRInstance | null>(null);
  const [listening, setListening] = useState(false);
  const [supported] = useState(() => getCtor() !== undefined);

  const toggle = useCallback(() => {
    if (recRef.current) { recRef.current.stop(); return; }
    const Ctor = getCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = optsRef.current.lang;
    rec.interimResults = true;
    rec.continuous = false;
    let text = "";
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      text = t;
      optsRef.current.onInterim(t);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") optsRef.current.onError("denied");
      else if (e.error === "no-speech") optsRef.current.onError("no-speech");
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
      if (text.trim()) optsRef.current.onFinal(text.trim());
    };
    recRef.current = rec;
    try { rec.start(); } catch { recRef.current = null; }
  }, []);

  useEffect(() => () => recRef.current?.abort(), []);
  return { supported, listening, toggle };
}

export function useSpeechOutput(lang: string) {
  const [speaking, setSpeaking] = useState(false);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "").trim();
    if (!clean) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = lang; u.pitch = 1.5; u.rate = 1.05;
    u.onstart = () => setSpeaking(true);
    u.onend = u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }, [lang]);

  const cancel = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  return { speaking, speak, cancel };
}
