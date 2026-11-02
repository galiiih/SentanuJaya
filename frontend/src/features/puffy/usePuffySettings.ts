import { useCallback, useState } from "react";
import { DEFAULT_MASCOT_ID, DEFAULT_PALETTE, MASCOTS, isPalette } from "./mascots";
import type { PuffyPalette } from "./PuffyMascot";

export interface PuffySettings {
  mascotId: string;
  palette: PuffyPalette;
  customImage: string | null;
  autoSpeak: boolean;
  idleSeconds: number;
  startOpen: boolean;
}

export const IDLE_OPTIONS = [5, 9, 15, 30, 0] as const;
const MAX_IMAGE_CHARS = 400_000;

const BASE_DEFAULTS: PuffySettings = {
  mascotId: DEFAULT_MASCOT_ID,
  palette: DEFAULT_PALETTE,
  customImage: null,
  autoSpeak: false,
  idleSeconds: 9,
  startOpen: false,
};

const storageKey = (userId?: string) => `puffy:settings:${userId ?? "anon"}`;

function load(userId: string | undefined, defaults: PuffySettings): PuffySettings {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<PuffySettings>;
    const customImage = typeof p.customImage === "string" && p.customImage.startsWith("data:image/") && p.customImage.length <= MAX_IMAGE_CHARS
      ? p.customImage : null;
    return {
      mascotId: typeof p.mascotId === "string" && MASCOTS.some((m) => m.id === p.mascotId) ? p.mascotId : defaults.mascotId,
      palette: isPalette(p.palette) ? p.palette : defaults.palette,
      customImage,
      autoSpeak: typeof p.autoSpeak === "boolean" ? p.autoSpeak : defaults.autoSpeak,
      idleSeconds: typeof p.idleSeconds === "number" && (IDLE_OPTIONS as readonly number[]).includes(p.idleSeconds) ? p.idleSeconds : defaults.idleSeconds,
      startOpen: typeof p.startOpen === "boolean" ? p.startOpen : defaults.startOpen,
    };
  } catch {
    return defaults;
  }
}

export function usePuffySettings(userId?: string, defaults?: Partial<PuffySettings>) {
  const [base] = useState<PuffySettings>(() => ({ ...BASE_DEFAULTS, ...defaults }));
  const [settings, setSettings] = useState<PuffySettings>(() => load(userId, base));

  const save = useCallback((next: PuffySettings) => {
    setSettings(next);
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(next));
    } catch { /* storage penuh atau diblokir */ }
  }, [userId]);

  const update = useCallback((patch: Partial<PuffySettings>) => save({ ...settings, ...patch }), [save, settings]);
  const reset = useCallback(() => save({ ...base, customImage: settings.customImage }), [base, save, settings.customImage]);

  return { settings, update, reset };
}
