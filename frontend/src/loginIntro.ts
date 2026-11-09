// Intro animasi setelah login: logo di tengah → putar 360° + titik bersinar → terbang ke sidebar → wave → aplikasi.
export const LOGIN_INTRO_FLAG = 'sentanu:login-intro';

export const INTRO_TIMING = {
  logoHoldSec: 0.15,
  logoRotSec: 1.1,
  logoGlowSec: 0.8,
  flyAt: 1800,
  flyMs: 700,
  waveAt: 2450,
  waveMs: 800,
  doneAt: 3300,
  sidebarLogoHoldSec: 3.4,
} as const;

const prefersReducedMotion = () => {
  try { return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export function markLoginIntro() {
  try { sessionStorage.setItem(LOGIN_INTRO_FLAG, '1'); } catch { /* storage diblokir: intro dilewati */ }
}

export function clearLoginIntro() {
  try { sessionStorage.removeItem(LOGIN_INTRO_FLAG); } catch { /* abaikan */ }
}

export function shouldPlayLoginIntro() {
  if (prefersReducedMotion()) return false;
  try { return sessionStorage.getItem(LOGIN_INTRO_FLAG) === '1'; } catch { return false; }
}
