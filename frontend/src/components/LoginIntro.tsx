import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { INTRO_TIMING as T } from '../loginIntro';

type Phase = 'center' | 'fly' | 'wave' | 'skip';
type Geometry = { dx: number; dy: number; scale: number; wx: number; wy: number; max: number; mobile: boolean };
const MOBILE_QUERY = '(max-width: 760px)';

function measureTarget(root: HTMLElement, logo: HTMLElement): Geometry {
  const mobile = typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches;
  const target = mobile
    ? document.querySelector<HTMLElement>('.sidebar-mobile-trigger')
    : document.querySelector<HTMLElement>('.sidebar__brand [data-sentanu-logo]');
  const rootRect = root.getBoundingClientRect();
  const size = logo.offsetWidth || 160;
  const rect = target?.getBoundingClientRect();
  const hasTarget = !!rect && rect.width > 0 && rect.height > 0;
  const tx = hasTarget ? rect.left + rect.width / 2 : 48;
  const ty = hasTarget ? rect.top + rect.height / 2 : 48;
  const targetSize = hasTarget ? Math.min(rect.width, rect.height) : 36;
  const cx = rootRect.left + rootRect.width / 2;
  const cy = rootRect.top + rootRect.height / 2;
  return {
    dx: tx - cx, dy: ty - cy, scale: Math.max(0.05, targetSize / size),
    wx: tx - rootRect.left, wy: ty - rootRect.top,
    max: Math.hypot(Math.max(tx, rootRect.width - tx), Math.max(ty, rootRect.height - ty)) + 120,
    mobile,
  };
}

export function LoginIntro({ onWave, onDone }: { onWave: () => void; onDone: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('center');
  const [geo, setGeo] = useState<Geometry | null>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const skipTimerRef = useRef<number | null>(null);
  const callbacks = useRef({ onWave, onDone });
  useEffect(() => { callbacks.current = { onWave, onDone }; });
  const phaseRef = useRef<Phase>('center');
  const finishedRef = useRef(false);
  const go = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next); }, []);
  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    go('skip');
    callbacks.current.onDone();
  }, [go]);
  // Keep the animated SVG visible until the 3D renderer has actually drawn.
  // THREE may be loaded while WebGL context creation still fails (e.g. llvmpipe).
  const flatFallback = true;

  useEffect(() => {
    // Schedule each phase against the same mount-time clock. Chained timers
    // can be lost when a browser throttles/replays effects during navigation.
    const flyTimer = window.setTimeout(() => {
      if (phaseRef.current === 'skip') return;
      if (rootRef.current && logoRef.current) {
        setGeo(measureTarget(rootRef.current, logoRef.current));
      }
      go('fly');
    }, T.flyAt);

    const waveTimer = window.setTimeout(() => {
      if (phaseRef.current === 'skip') return;
      go('wave');
      callbacks.current.onWave();
    }, T.waveAt);

    const doneTimer = window.setTimeout(() => {
      // A manual skip owns completion once requested. The shared finish guard
      // also makes the deadline and skip callback safe if they race.
      if (phaseRef.current === 'skip') return;
      finish();
    }, T.doneAt);

    return () => {
      window.clearTimeout(flyTimer);
      window.clearTimeout(waveTimer);
      window.clearTimeout(doneTimer);
    };
  }, [finish, go]);

  const skip = useCallback(() => {
    if (phaseRef.current === 'skip') return;
    go('skip'); callbacks.current.onWave();
    if (skipTimerRef.current !== null) window.clearTimeout(skipTimerRef.current);
    skipTimerRef.current = window.setTimeout(() => {
      skipTimerRef.current = null;
      finish();
    }, 220);
  }, [finish, go]);

  useLayoutEffect(() => {
    skipRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || phaseRef.current === 'skip') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      skip();
    };
    // Capture Escape before page-level shortcuts or focus handlers can consume it.
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      if (skipTimerRef.current !== null) window.clearTimeout(skipTimerRef.current);
    };
  }, [skip]);

  const style = {
    '--intro-dx': `${geo?.dx ?? 0}px`, '--intro-dy': `${geo?.dy ?? 0}px`,
    '--intro-scale': geo?.scale ?? 1, '--intro-wave-x': `${geo?.wx ?? 0}px`,
    '--intro-wave-y': `${geo?.wy ?? 0}px`, '--intro-wave-max': `${geo?.max ?? 2000}px`,
    '--intro-ring-scale': geo ? (geo.max * 2) / 120 : 30,
  } as CSSProperties;

  return createPortal(
    <div ref={rootRef} className={`login-intro login-intro--${phase}${geo?.mobile ? ' login-intro--mobile' : ''}`} style={style} data-testid="login-intro" role="status" aria-label="Memuat aplikasi" onTransitionEnd={(event) => { if (event.target === event.currentTarget && phaseRef.current === 'skip') finish(); }}>
      <div className="login-intro__veil" />
      <span className="login-intro__ring" aria-hidden="true" />
      <span className="login-intro__ring login-intro__ring--blue" aria-hidden="true" />
      <div ref={logoRef} className={`login-intro__logo${flatFallback ? ' login-intro__logo--flat' : ''}`}>
        <div data-sentanu-logo data-hold={T.logoHoldSec} data-rot={T.logoRotSec} data-glow={T.logoGlowSec} style={{ width: '100%', height: '100%' }} />
      </div>
      <button ref={skipRef} type="button" className="login-intro__skip" onClick={skip} aria-label="Lewati animasi pembuka">Lewati</button>
    </div>,
    document.body,
  );
}
