import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Mood } from './types';
import { cn } from './utils';

/**
 * Palet maskot. Ganti nilai `lt` (terang), `base` (utama), `dk` (gelap), `rim` (pantulan bawah)
 * dengan warna logo Sentanu Jaya; semua gradien 3D ikut berubah.
 */
export type PuffyPalette = 'blue' | 'red';
export const PUFFY_PALETTES: Record<PuffyPalette, { label: string; lt: string; base: string; dk: string; rim: string; cheek: string }> = {
  blue: { label: 'Biru', lt: '#6db0ff', base: '#2f6fed', dk: '#1a3c9a', rim: '#8cc8ff', cheek: '#ff93b5' },
  red: { label: 'Merah', lt: '#ff7d76', base: '#e2323f', dk: '#8e1224', rim: '#ffa49c', cheek: '#ffa6c0' },
};

const BODY = 'M58 4C64 2 70 5 68 10C66 16 70 22 76 30C87 44 90 58 87 70C84 83 70 91 50 91C30 91 15 83 12 70C9 56 14 44 26 33C36 24 44 20 48 14C51 9 54 5.5 58 4Z';
/** Berpikir: ujung melengkung ke depan seperti tanda tanya terbalik, dagu memanjang, dasar melebar. */
const BODY_THINK = 'M80 22C82 12 72 2 60 3C52 4 48 10 46 16C42 22 36 25 26 34C14 45 9 57 12 70C15 85 30 93 50 93C70 93 84 85 87 70C90 58 87 46 78 36C73 31 70 27 69 22C68 17 67 13 70 12C72.5 11.5 73 16 73 22C73 25 80 25 80 22Z';
/** Bingung: ujung meliuk ke belakang (membentuk "?"). */
const BODY_CONFUSED = 'M20 22C18 12 28 2 40 3C48 4 52 10 54 16C58 22 64 25 74 34C86 45 91 57 88 70C85 85 70 93 50 93C30 93 16 85 13 70C10 58 13 46 22 36C27 31 30 27 31 22C32 17 33 13 30 12C27.5 11.5 27 16 27 22C27 25 20 25 20 22Z';
/** Posisi kilap di ujung (cx, cy, sudut) menurut bentuk badan. */
const TIP_HL: Partial<Record<Mood, [number, number, number]>> = { think: [68, 6, 20], confused: [32, 6, -20] };

const MOUTH_OPEN = 'M41 61C44 60.4 56 60.4 59 61C58.4 69 54.5 72 50 72C45.5 72 41.6 69 41 61Z';
const MOUTH_BIG = 'M39 60C43 59 57 59 61 60C60.5 71 55.5 75 50 75C44.5 75 39.5 71 39 60Z';
const MOUTH_CLOSED: Record<Mood, string> = {
  neutral: 'M43 63Q50 68.5 57 63', happy: 'M43 63Q50 68.5 57 63', love: 'M43 63Q50 68.5 57 63', excited: 'M43 63Q50 68.5 57 63',
  sad: 'M44 69Q50 63.5 56 69', think: 'M45 67Q50 66 55 67', confused: 'M44 67Q47 63 50 67T56 67',
};
const OPEN_MOUTH_MOODS: Mood[] = ['happy', 'love', 'excited'];

/** Pergeseran iris menurut mood (satuan viewBox). */
const IRIS_OFFSET: Partial<Record<Mood, [number, number]>> = { think: [1.4, -2], confused: [-1.2, 0.4], sad: [0, 1.2] };
/**
 * Sudut tangan (derajat) di sekitar bahu. Kedua tangan berbentuk sama (lonjong), kiri = cermin kanan.
 * 0 = menggantung di sisi badan. Kanan: negatif = naik. Kiri: positif = naik (melambai/menyapa).
 */
const LEFT_ARM: Record<Mood, number> = { neutral: 20, happy: 115, excited: 135, love: 125, think: 0, confused: 40, sad: -8 };
const RIGHT_ARM: Record<Mood, number> = { neutral: 0, happy: -8, excited: -135, love: -40, think: -100, confused: -90, sad: 8 };
/** Sudut tangan kiri saat melambai (terangkat). */
const WAVE_ARM = 125;

/* ---------- Jambul: bergoyang mengikuti gerak maskot (inersia + pegas) ---------- */
const BEND_Y0 = 34; // bagian badan di atas y ini ikut melentur (ujung paling banyak, leher sedikit)
const BEND_H = 30;
const BEND_MAX = 8; // pergeseran maksimum ujung (satuan viewBox)
const BEND_GAIN = 0.0057; // satuan lentur per (satuan viewBox / detik)
const SPRING_K = 140; // kekakuan pegas
const SPRING_C = 9; // redaman (<2*sqrt(K) agar masih bergoyang sebentar setelah berhenti)

/** Geser sumbu-x titik-titik path di bagian atas (jambul) sebesar `bend`, makin ke ujung makin besar (kuadratik, tanpa patahan). */
function bendPath(d: string, bend: number): string {
  if (Math.abs(bend) < 0.01) return d;
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  let out = '';
  let x: number | null = null;
  for (const tk of tokens) {
    if (/[A-Za-z]/.test(tk)) { out += tk; continue; }
    const v = parseFloat(tk);
    if (x === null) { x = v; continue; }
    const w = v < BEND_Y0 ? ((BEND_Y0 - v) / BEND_H) ** 2 : 0;
    out += `${(x + bend * w).toFixed(2)} ${v} `;
    x = null;
  }
  return out;
}

const L_SHOULDER = '14px 59px';
const R_SHOULDER = '86px 59px';
const TRANSITION = 'transform 0.45s cubic-bezier(.34,1.4,.64,1)';

interface Props {
  mood: Mood;
  /** Mulut membuka-menutup (saat jawaban diketik atau dibacakan). */
  talking: boolean;
  /** Mode balon chat (idle): tangan dan kaki memudar. */
  bubble: boolean;
  /** Melambaikan tangan (sapaan). Otomatis aktif saat mood `excited`. */
  wave?: boolean;
  palette?: PuffyPalette;
  className?: string;
}

const Sclera = ({ cx }: { cx: number }) => (
  <>
    <ellipse cx={cx} cy="52" rx="7.4" ry="8.4" fill="#fff" />
    <ellipse cx={cx} cy="52.5" rx="7.4" ry="8.4" fill="none" stroke="#000" strokeOpacity=".12" strokeWidth=".8" />
  </>
);
const Iris = ({ cx }: { cx: number }) => (
  <>
    <ellipse cx={cx + 0.6} cy="53" rx="5" ry="5.6" fill="#3d2214" />
    <circle cx={cx - 1.4} cy="50.4" r="1.7" fill="#fff" />
    <circle cx={cx + 2.6} cy="55.4" r=".8" fill="#fff" opacity=".8" />
  </>
);
const HEART = 'M0 4C-9 -2 -5 -8 0 -3.5C5 -8 9 -2 0 4Z';

export function PuffyMascot({ mood, talking, bubble, wave = false, palette = 'blue', className }: Props) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef<SVGSVGElement>(null);
  const bodyDRef = useRef(BODY);
  const pupilsRef = useRef<SVGGElement>(null);

  // Pupil mengikuti pointer tanpa re-render React.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const svg = svgRef.current;
      const pupils = pupilsRef.current;
      if (!svg || !pupils) return;
      const r = svg.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1.7, d / 90);
      pupils.setAttribute('transform', `translate(${((dx / d) * k).toFixed(2)} ${((dy / d) * k * 0.9).toFixed(2)})`);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  // Jambul bergoyang: ukur kecepatan horizontal maskot di layar (mis. saat Puffy berpindah ke kartu yang ditunjuk).
  // Bergerak ke kiri -> jambul terayun ke kanan, dan sebaliknya; setelah berhenti masih bergoyang sebentar lalu tenang.
  // Memanipulasi atribut `d` langsung (tanpa re-render React) seperti pelacak pupil di atas.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    let prevX = NaN;
    let vx = 0;
    let b = 0;
    let vb = 0;
    let atRest = true;
    const write = (bend: number) => {
      const d = bendPath(bodyDRef.current, bend);
      svg.querySelector('[data-puffy-body]')?.setAttribute('d', d);
      svg.querySelector('[data-puffy-clip]')?.setAttribute('d', d);
      svg.querySelector('[data-puffy-tip]')?.setAttribute('transform', `translate(${(bend * 0.5).toFixed(2)} 0)`);
    };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000) || 0.016;
      last = now;
      const r = svg.getBoundingClientRect();
      const x = r.left + r.width / 2;
      if (!Number.isNaN(prevX)) vx += (((x - prevX) / dt) - vx) * 0.35; // dihaluskan agar tidak patah-patah
      prevX = x;
      const vu = (vx * 100) / Math.max(r.width, 1); // kecepatan dalam satuan viewBox/detik, tak tergantung ukuran maskot
      const target = Math.max(-BEND_MAX, Math.min(BEND_MAX, -vu * BEND_GAIN));
      vb += (SPRING_K * (target - b) - SPRING_C * vb) * dt;
      b += vb * dt;
      if (Math.abs(b) < 0.02 && Math.abs(vb) < 0.05 && Math.abs(target) < 0.02) {
        if (!atRest) { write(0); atRest = true; }
      } else {
        atRest = false;
        write(b);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pal = PUFFY_PALETTES[palette];
  const vars = { '--pf-lt': pal.lt, '--pf-base': pal.base, '--pf-dk': pal.dk, '--pf-rim': pal.rim, '--pf-cheek': pal.cheek } as CSSProperties;

  const waving = wave || mood === 'excited';
  const openMouth = talking || OPEN_MOUTH_MOODS.includes(mood);
  const mouthD = mood === 'excited' ? MOUTH_BIG : MOUTH_OPEN;
  const showNormalEyes = mood !== 'love' && mood !== 'excited';
  const [ix, iy] = IRIS_OFFSET[mood] ?? [0, 0];
  const leftDeg = waving ? WAVE_ARM : LEFT_ARM[mood];
  const bodyD = mood === 'think' ? BODY_THINK : mood === 'confused' ? BODY_CONFUSED : BODY;
  bodyDRef.current = bodyD;
  const [tipX, tipY, tipR] = TIP_HL[mood] ?? [64, 12, -25];
  const melt = mood === 'think' || mood === 'confused'; // dasar melebar seperti genangan kecil
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bodyAnim = mood === 'excited' ? 'pf-hop' : mood === 'sad' ? '' : 'pf-bob';
  const poseTransform = mood === 'sad' ? 'translateY(1.5px) scaleY(.97)'
    : mood === 'confused' ? 'rotate(-5deg) scale(1.05, .93)'
    : mood === 'think' ? 'rotate(3deg) scale(1.03, .98)' : 'none';
  const limbFade = cn('pf-limb-fade', bubble ? 'pf-limb-hidden' : 'pf-limb-visible');

  return (
    <svg ref={svgRef} viewBox="0 0 100 100" aria-hidden="true" style={vars} className={cn('pf-svg', className)}>
      <defs>
        <radialGradient id={`b${uid}`} cx=".36" cy=".3" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--pf-lt)' }} />
          <stop offset=".55" style={{ stopColor: 'var(--pf-base)' }} />
          <stop offset="1" style={{ stopColor: 'var(--pf-dk)' }} />
        </radialGradient>
        <radialGradient id={`l${uid}`} cx=".35" cy=".3" r=".9">
          <stop offset="0" style={{ stopColor: 'var(--pf-lt)' }} />
          <stop offset="1" style={{ stopColor: 'var(--pf-base)' }} />
        </radialGradient>
        <radialGradient id={`s${uid}`}>
          <stop offset="0" stopColor="#1b1030" stopOpacity=".35" />
          <stop offset="1" stopColor="#1b1030" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`c${uid}`}>
          <stop offset="0" style={{ stopColor: 'var(--pf-cheek)' }} stopOpacity=".95" />
          <stop offset="1" style={{ stopColor: 'var(--pf-cheek)' }} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`k${uid}`}><path data-puffy-clip="" d={bodyD} /></clipPath>
        <clipPath id={`e${uid}`}><ellipse cx="38" cy="52" rx="7.4" ry="8.4" /><ellipse cx="62" cy="52" rx="7.4" ry="8.4" /></clipPath>
        <clipPath id={`m${uid}`}><path d={mouthD} /></clipPath>
        <filter id={`f${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2" /></filter>
        <filter id={`w${uid}`} x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="3" result="n">
            {!reduceMotion && <animate attributeName="baseFrequency" dur="1.4s" values="0.025;0.045;0.025" repeatCount="indefinite" />}
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id={`g${uid}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation=".7" /></filter>
      </defs>

      {/* bayangan lantai + kaki (diam saat badan bergerak) */}
      <g style={{ transform: melt ? 'scaleX(1.18)' : 'none', transformOrigin: '50px 97px', transition: TRANSITION }}>
        <ellipse cx="50" cy="97" rx="32" ry="3.2" fill={`url(#s${uid})`} />
      </g>
      <g className={limbFade} style={{ transform: melt ? 'scaleX(1.14)' : 'none', transformOrigin: '50px 91px', transition: TRANSITION }}>
        <ellipse cx="36" cy="91" rx="10" ry="5.6" fill={`url(#l${uid})`} />
        <ellipse cx="64" cy="91" rx="10" ry="5.6" fill={`url(#l${uid})`} />
        <ellipse cx="33" cy="93" rx="4" ry="1.3" fill="#fff" opacity=".35" />
        <ellipse cx="61" cy="93" rx="4" ry="1.3" fill="#fff" opacity=".35" />
      </g>

      {/* badan: bob/hop -> pose mood -> squash saat bicara */}
      <g className={cn('pf-body-anim', bodyAnim)}>
        <g style={{ transform: poseTransform, transformOrigin: '50px 91px', transition: TRANSITION }}>
          <g className={cn(talking && 'pf-talk')}>

            {/* tangan kiri: cermin tangan kanan (bentuk sama); terangkat dan berayun saat melambai */}
            <g className={limbFade}>
              <g style={{ transform: `rotate(${leftDeg}deg)`, transformOrigin: L_SHOULDER, transition: TRANSITION }}>
                <g style={{ transformOrigin: L_SHOULDER }} className={cn(waving && 'pf-wave')}>
                  <g transform="rotate(15 10 68)">
                    <ellipse cx="10" cy="68" rx="6.5" ry="11" fill={`url(#l${uid})`} />
                    <ellipse cx="11" cy="64" rx="1.6" ry="5" fill="#fff" opacity=".35" filter={`url(#g${uid})`} />
                  </g>
                </g>
              </g>
            </g>
            {/* tangan kanan (isyarat saat bicara); disembunyikan SEKETIKA saat berpikir (tanpa transisi) agar tidak tampak dobel dengan tangan penopang dagu */}
            <g className={cn(bubble || mood === 'think' ? 'pf-limb-hidden' : 'pf-limb-visible', mood !== 'think' && 'pf-limb-fade')}>
              <g style={{ transform: `rotate(${RIGHT_ARM[mood]}deg)`, transformOrigin: R_SHOULDER, transition: TRANSITION }}>
                <g style={{ transformOrigin: R_SHOULDER }} className={cn(talking && 'pf-gesture')}>
                  <g transform="rotate(-15 90 68)">
                    <ellipse cx="90" cy="68" rx="6.5" ry="11" fill={`url(#l${uid})`} />
                    <ellipse cx="89" cy="64" rx="1.6" ry="5" fill="#fff" opacity=".35" filter={`url(#g${uid})`} />
                  </g>
                </g>
              </g>
            </g>

            {/* tubuh 3D */}
            <g filter={mood === 'confused' ? `url(#w${uid})` : undefined}>
            <path data-puffy-body="" d={bodyD} fill={`url(#b${uid})`} />
            <g clipPath={`url(#k${uid})`}>
              <ellipse cx="50" cy="86" rx="30" ry="9" style={{ fill: 'var(--pf-rim)' }} opacity=".4" filter={`url(#f${uid})`} />
              <ellipse cx="33" cy="40" rx="14" ry="8" fill="#fff" opacity=".38" transform="rotate(-38 33 40)" filter={`url(#f${uid})`} />
              <g data-puffy-tip="">
                <ellipse cx={tipX} cy={tipY} rx="5" ry="1.8" fill="#fff" opacity=".8" transform={`rotate(${tipR} ${tipX} ${tipY})`} filter={`url(#g${uid})`} />
              </g>
              <circle cx="22" cy="56" r="1.6" fill="#fff" opacity=".7" />
            </g>
            </g>

            {/* pipi */}
            <ellipse cx="29" cy="63" rx="7" ry="4.6" fill={`url(#c${uid})`} />
            <ellipse cx="71" cy="63" rx="7" ry="4.6" fill={`url(#c${uid})`} />

            {/* mata */}
            <g className={cn('pf-blink', showNormalEyes ? 'pf-show' : 'pf-hide')}>
              <Sclera cx={38} />
              <Sclera cx={62} />
              <g clipPath={`url(#e${uid})`}>
                <g style={{ transform: `translate(${ix}px, ${iy}px)`, transition: 'transform 0.3s' }}>
                  <g ref={pupilsRef}>
                    <Iris cx={38} />
                    <Iris cx={62} />
                  </g>
                </g>
              </g>
            </g>
            <g className={cn('pf-fade', mood === 'love' ? 'pf-show' : 'pf-hide')}>
              <g transform="translate(38 52) scale(1.15)"><path d={HEART} fill="#ff4f7b" /><circle cx="-2.6" cy="-2.6" r="1.2" fill="#fff" opacity=".8" /></g>
              <g transform="translate(62 52) scale(1.15)"><path d={HEART} fill="#ff4f7b" /><circle cx="-2.6" cy="-2.6" r="1.2" fill="#fff" opacity=".8" /></g>
            </g>
            <g className={cn('pf-excited-eyes', mood === 'excited' ? 'pf-show' : 'pf-hide')}>
              <path d="M31 55Q38 45 45 55" strokeWidth="3.2" strokeLinecap="round" fill="none" stroke="#3d2214" />
              <path d="M55 55Q62 45 69 55" strokeWidth="3.2" strokeLinecap="round" fill="none" stroke="#3d2214" />
            </g>
            <g className={cn('pf-sad-brows', mood === 'sad' ? 'pf-show' : 'pf-hide')}>
              <path d="M31 44L45 41" strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ stroke: 'var(--pf-dk)' }} />
              <path d="M55 41L69 44" strokeWidth="2.2" strokeLinecap="round" fill="none" style={{ stroke: 'var(--pf-dk)' }} />
            </g>

            {/* mulut */}
            <path d={MOUTH_CLOSED[mood]} strokeWidth="2.4" strokeLinecap="round"
              className={cn('pf-mouth-closed', openMouth && 'pf-hide')} fill="none" stroke="#3d2214" />
            <g className={cn('pf-mouth-open', openMouth ? 'pf-show' : 'pf-hide', talking && 'pf-yap')}>
              <path d={mouthD} fill="#7a1f2d" />
              <ellipse cx="50" cy="73" rx="5.4" ry="3.6" fill="#ff7f8f" clipPath={`url(#m${uid})`} />
              <path d="M42.5 61.8C46 61.2 54 61.2 57.5 61.8" stroke="#fff" strokeOpacity=".9" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            </g>

            {/* tangan menopang dagu: satu bentuk saja (sama seperti tangan di mood lain), diberi bayangan lembut agar terpisah dari badan */}
            <g className={cn('pf-fade', mood === 'think' ? 'pf-show' : 'pf-hide')}>
              <g transform="rotate(60 73 72.5)">
                <ellipse cx="74.2" cy="74.8" rx="6.2" ry="13.4" style={{ fill: 'var(--pf-dk)' }} opacity=".4" filter={`url(#g${uid})`} />
                <ellipse cx="73" cy="72.5" rx="6.2" ry="13.4" fill={`url(#l${uid})`} />
                <ellipse cx="71.5" cy="68" rx="1.6" ry="5.5" fill="#fff" opacity=".4" filter={`url(#g${uid})`} />
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
