import { useEffect, useRef } from 'react';
import type { MascotEntry } from './mascots';
import type { Mood } from './types';
import { cn } from './utils';

interface Props {
  entry: MascotEntry;
  mood: Mood;
  talking: boolean;
  bubble: boolean;
}

const MOUTH: Record<Mood, string> = {
  neutral: 'M40 62Q50 67 60 62',
  happy: 'M38 60Q50 70 62 60',
  love: 'M38 60Q50 70 62 60',
  excited: 'M36 58Q50 73 64 58',
  sad: 'M42 66Q50 60 58 66',
  think: 'M44 64Q50 62 56 64',
  confused: 'M42 64Q47 60 50 64T58 64',
};

/**
 * BlobMascot — maskot bulat universal dengan aksesoris `behind`/`front` dari registry.
 * Gradien radial 3D, pupil mengikuti pointer, mulut per mood.
 */
export function BlobMascot({ entry, mood, talking, bubble }: Props) {
  const pal = entry.palette ?? { body: '#ffb6c1', belly: '#fff0f3', cheek: '#ff93b5', outline: '#d4849a' };
  const pupilsRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pupil mengikuti pointer
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      const pupils = pupilsRef.current;
      if (!svg || !pupils) return;
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(2, d / 80);
      pupils.setAttribute('transform', `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k * 0.9).toFixed(2)})`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const openMouth = talking || mood === 'happy' || mood === 'love' || mood === 'excited';
  const limbFade = cn('bm-limb-fade', bubble && 'bm-limb-hidden');

  return (
    <svg ref={svgRef} viewBox="0 0 100 100" className="bm-svg" data-mascot={entry.id} aria-hidden="true">
      <defs>
        <radialGradient id={`bm-bg-${entry.id}`} cx=".4" cy=".3" r=".85">
          <stop offset="0" stopColor={pal.belly} />
          <stop offset=".5" stopColor={pal.body} />
          <stop offset="1" stopColor={pal.outline} />
        </radialGradient>
        <radialGradient id={`bm-ck-${entry.id}`}>
          <stop offset="0" stopColor={pal.cheek} stopOpacity=".8" />
          <stop offset="1" stopColor={pal.cheek} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`bm-sh-${entry.id}`}>
          <stop offset="0" stopColor="#1b1030" stopOpacity=".25" />
          <stop offset="1" stopColor="#1b1030" stopOpacity="0" />
        </radialGradient>
        <filter id={`bm-gl-${entry.id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".8" /></filter>
      </defs>

      {/* Bayangan lantai */}
      <ellipse cx="50" cy="94" rx="28" ry="4" fill={`url(#bm-sh-${entry.id})`} />

      {/* Aksesoris belakang */}
      {entry.behind}

      {/* Badan — animasi float per mascot */}
      <g className={cn('bm-body', `bm-body--${entry.id}`)}>
        <g className={cn(talking && 'bm-squish')}>
          {/* Badan 3D */}
          <ellipse cx="50" cy="56" rx="32" ry="36" fill={`url(#bm-bg-${entry.id})`} stroke={pal.outline} strokeWidth=".8" />
          {/* Rim highlight atas */}
          <ellipse cx="40" cy="32" rx="14" ry="7" fill="#fff" opacity=".35" transform="rotate(-20 40 32)" filter={`url(#bm-gl-${entry.id})`} />
          {/* Titik kilap */}
          <circle cx="35" cy="30" r="3" fill="#fff" opacity=".6" />

          {/* Perut */}
          <ellipse cx="50" cy="64" rx="20" ry="18" fill={pal.belly} opacity=".4" />

          {/* Tangan / Lengan */}
          <g className={limbFade}>
            <ellipse cx="20" cy="56" rx="5" ry="9" fill={pal.body} stroke={pal.outline} strokeWidth=".6" transform="rotate(15 20 56)" />
            <ellipse cx="80" cy="56" rx="5" ry="9" fill={pal.body} stroke={pal.outline} strokeWidth=".6" transform="rotate(-15 80 56)" />
          </g>

          {/* Pipi */}
          <ellipse cx="30" cy="62" rx="7" ry="5" fill={`url(#bm-ck-${entry.id})`} />
          <ellipse cx="70" cy="62" rx="7" ry="5" fill={`url(#bm-ck-${entry.id})`} />

          {/* Mata */}
          <g className="bm-blink">
            <ellipse cx="40" cy="50" rx="5" ry="6" fill="#fff" />
            <ellipse cx="60" cy="50" rx="5" ry="6" fill="#fff" />
            <g ref={pupilsRef}>
              <circle cx="40.5" cy="51" r="3.2" fill="#3d2214" />
              <circle cx="60.5" cy="51" r="3.2" fill="#3d2214" />
              <circle cx="39" cy="49" r="1.2" fill="#fff" />
              <circle cx="59" cy="49" r="1.2" fill="#fff" />
            </g>
          </g>

          {/* Mulut tertutup */}
          <path
            d={MOUTH[mood]}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            stroke="#3d2214"
            className={cn('bm-mouth-closed', openMouth && 'bm-hide')}
          />
          {/* Mulut terbuka */}
          <g className={cn('bm-mouth-open', !openMouth && 'bm-hide', talking && 'bm-yap')}>
            <path d={MOUTH[mood]} fill="#7a1f2d" />
            <ellipse cx="50" cy="67" rx="4" ry="3" fill="#ff7f8f" />
          </g>

          {/* Kaki */}
          <g className={limbFade}>
            <ellipse cx="38" cy="88" rx="8" ry="4" fill={pal.body} stroke={pal.outline} strokeWidth=".6" />
            <ellipse cx="62" cy="88" rx="8" ry="4" fill={pal.body} stroke={pal.outline} strokeWidth=".6" />
            <ellipse cx="36" cy="89" rx="3" ry="1" fill="#fff" opacity=".3" />
            <ellipse cx="60" cy="89" rx="3" ry="1" fill="#fff" opacity=".3" />
          </g>
        </g>
      </g>

      {/* Aksesoris depan */}
      {entry.front}
    </svg>
  );
}
