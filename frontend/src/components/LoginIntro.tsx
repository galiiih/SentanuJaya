import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { INTRO_TIMING as T } from '../loginIntro';

type Phase = 'center' | 'fly' | 'wave' | 'skip';
type Geometry = { dx: number; dy: number; scale: number; wx: number; wy: number; max: number; mobile: boolean };
const MOBILE_QUERY = '(max-width: 820px)';

function measureTarget(root: HTMLElement, logo: HTMLElement): Geometry {
  const mobile = typeof window.matchMedia === 'function' && window.matchMedia(MOBILE_QUERY).matches;
  const target = mobile
    ? document.querySelector<HTMLElement>('.app-header__context .menu-button')
    : document.querySelector<HTMLElement>('.sidebar__brand [data-sentanu-logo]');
  const rootRect = root.getBoundingClientRect();
  const finite = (value: number, fallback: number) => Number.isFinite(value) ? value : fallback;
  const rootLeft = finite(rootRect.left, 0);
  const rootTop = finite(rootRect.top, 0);
  const rootWidth = finite(rootRect.width, window.innerWidth || 1);
  const rootHeight = finite(rootRect.height, window.innerHeight || 1);
  const size = finite(logo.getBoundingClientRect().width || logo.offsetWidth, 160);
  const rect = target?.getBoundingClientRect();
  const hasTarget = !!rect
    && Number.isFinite(rect.left) && Number.isFinite(rect.top)
    && Number.isFinite(rect.width) && Number.isFinite(rect.height)
    && rect.width > 0 && rect.height > 0;
  // A missing/hidden mobile trigger must never poison the CSS transform with NaN.
  const tx = hasTarget ? rect.left + rect.width / 2 : rootLeft + 48;
  const ty = hasTarget ? rect.top + rect.height / 2 : rootTop + 48;
  const targetSize = hasTarget ? Math.min(rect.width, rect.height) : 36;
  const cx = rootLeft + rootWidth / 2;
  const cy = rootTop + rootHeight / 2;
  const wx = finite(tx - rootLeft, 48);
  const wy = finite(ty - rootTop, 48);
  const dx = finite(tx - cx, 0);
  const dy = finite(ty - cy, 0);
  const scale = finite(Math.max(0.05, targetSize / Math.max(size, 1)), 0.225);
  const max = finite(Math.hypot(Math.max(wx, rootWidth - wx), Math.max(wy, rootHeight - wy)) + 120, 2000);
  return { dx, dy, scale, wx, wy, max, mobile };
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
    // A throttled background tab may delay the scheduled wave timer past the
    // completion deadline. Always release the app from its intro-wait state.
    callbacks.current.onWave();
    callbacks.current.onDone();
  }, [go]);
  const flatFallback = typeof window !== 'undefined' && !(window as unknown as { THREE?: unknown }).THREE;

  useEffect(() => {
    // Schedule each phase against the same mount-time clock. Chained timers
    // can be lost when a browser throttles/replays effects during navigation.
    const flyTimer = window.setTimeout(() => {
      if (phaseRef.current === 'skip') return;
      if (rootRef.current && logoRef.current) {
        const measured = measureTarget(rootRef.current, logoRef.current);
        // Write the validated geometry before changing phase. This guarantees
        // the fly/wave CSS never observes an unset or stale transform target.
        const cssPx = (value: number) => `${Number.isFinite(value) ? value : 0}px`;
        rootRef.current.style.setProperty('--intro-dx', cssPx(measured.dx));
        rootRef.current.style.setProperty('--intro-dy', cssPx(measured.dy));
        rootRef.current.style.setProperty('--intro-wave-x', cssPx(measured.wx));
        rootRef.current.style.setProperty('--intro-wave-y', cssPx(measured.wy));
        rootRef.current.style.setProperty('--intro-wave-max', cssPx(measured.max));
        rootRef.current.style.setProperty('--intro-scale', String(Number.isFinite(measured.scale) ? measured.scale : 0.225));
        rootRef.current.style.setProperty('--intro-ring-scale', String(Number.isFinite((measured.max * 2) / 120) ? (measured.max * 2) / 120 : 30));
        setGeo(measured);
      }
      go('fly');
    }, T.flyAt);

    const waveTimer = window.setTimeout(() => {
      if (phaseRef.current === 'skip') return;
      go('wave');
      callbacks.current.onWave();
    }, T.waveAt);

    const doneTimer = window.setTimeout(() => {
      // The deadline is the final safety net even if a skip timer was
      // interrupted by navigation or effect cleanup. finish() is idempotent.
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
    <div ref={rootRef} className={`login-intro login-intro--${phase}${geo?.mobile ? ' login-intro--mobile' : ''}`} style={style} data-testid="login-intro" role="status" aria-label="Memuat aplikasi">
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
