/**
 * Entri registri maskot. `kind` menentukan komponen renderer.
 * - `drop`  → PuffyMascot (Cat Drop SVG, 3D gradien)
 * - `blob`  → BlobMascot  (bulat universal + aksesoris behind/front)
 * - `image` → ImageMascot (gambar custom dari pengguna)
 */
export interface MascotEntry {
  id: string;
  kind: 'drop' | 'blob' | 'image' | 'wobnimo';
  /** Nama yang ditampilkan. */
  name: string;
  nameEn: string;
  /** Warna utama (CSS var) untuk warna tema panel. */
  color: string;
  /** SVG di belakang blob (telinga, tanduk, dll). */
  behind?: React.ReactNode;
  /** SVG di depan blob (aksesoris, topi, dll). */
  front?: React.ReactNode;
  /** Palet warna blob. */
  palette?: { body: string; belly: string; cheek: string; outline: string };
}

/* ---------- Aksesoris blob SVG ---------- */
const MochiEars = () => (
  <g data-mascot-behind="mochi">
    <ellipse cx="30" cy="22" rx="11" ry="16" fill="#f5e6d0" stroke="#d4b896" strokeWidth="1.5" transform="rotate(-15 30 22)" />
    <ellipse cx="30" cy="22" rx="6" ry="10" fill="#ffc0cb" opacity=".6" transform="rotate(-15 30 22)" />
    <ellipse cx="70" cy="22" rx="11" ry="16" fill="#f5e6d0" stroke="#d4b896" strokeWidth="1.5" transform="rotate(15 70 22)" />
    <ellipse cx="70" cy="22" rx="6" ry="10" fill="#ffc0cb" opacity=".6" transform="rotate(15 70 22)" />
  </g>
);

const BeruAntenna = () => (
  <g data-mascot-behind="beru">
    <line x1="50" y1="18" x2="50" y2="4" stroke="#5b9bd5" strokeWidth="2.5" strokeLinecap="round" />
    <circle cx="50" cy="3" r="4" fill="#7ec8e3" />
    <circle cx="50" cy="3" r="2" fill="#fff" opacity=".7" />
  </g>
);

const DaunLeaf = () => (
  <g data-mascot-front="daun">
    <path d="M50 12C42 2 30 6 32 16C34 26 46 22 50 12Z" fill="#6abf69" stroke="#3d8b37" strokeWidth="1" />
    <line x1="50" y1="12" x2="40" y2="8" stroke="#3d8b37" strokeWidth=".8" />
  </g>
);

/* ---------- Registry ---------- */
export const MASCOTS: MascotEntry[] = [
  {
    id: 'catdrop',
    kind: 'drop',
    name: 'Cat Drop',
    nameEn: 'Cat Drop',
    color: '#2f6fed',
  },
  {
    id: 'puffy',
    kind: 'blob',
    name: 'Puffy',
    nameEn: 'Puffy',
    color: '#e87ba8',
    palette: { body: '#ffb6c1', belly: '#fff0f3', cheek: '#ff93b5', outline: '#d4849a' },
  },
  {
    id: 'volt',
    kind: 'wobnimo',
    name: 'Volt (Wobnimo)',
    nameEn: 'Volt',
    color: '#ffc107',
  },
  {
    id: 'pip',
    kind: 'wobnimo',
    name: 'Pip (Wobnimo)',
    nameEn: 'Pip',
    color: '#00bcd4',
  },
  {
    id: 'miso',
    kind: 'wobnimo',
    name: 'Miso (Wobnimo)',
    nameEn: 'Miso',
    color: '#ff9800',
  },
  {
    id: 'drift',
    kind: 'wobnimo',
    name: 'Drift (Wobnimo)',
    nameEn: 'Drift',
    color: '#3f51b5',
  },
  {
    id: 'rex',
    kind: 'wobnimo',
    name: 'Rex (Wobnimo)',
    nameEn: 'Rex',
    color: '#4caf50',
  },
  {
    id: 'mochi',
    kind: 'blob',
    name: 'Mochi (Classic)',
    nameEn: 'Mochi',
    color: '#d4a76a',
    palette: { body: '#f5e6d0', belly: '#fff8f0', cheek: '#ffb89a', outline: '#d4b896' },
    behind: <MochiEars />,
  },
  {
    id: 'beru',
    kind: 'blob',
    name: 'Beru',
    nameEn: 'Beru',
    color: '#5b9bd5',
    palette: { body: '#a8d8f0', belly: '#e8f4fc', cheek: '#93c5fd', outline: '#6ba3c7' },
    behind: <BeruAntenna />,
  },
  {
    id: 'daun',
    kind: 'blob',
    name: 'Daun',
    nameEn: 'Daun',
    color: '#6abf69',
    palette: { body: '#a8e6a3', belly: '#e8f8e8', cheek: '#7ecf7a', outline: '#5da85a' },
    front: <DaunLeaf />,
  },
  {
    id: 'custom',
    kind: 'image',
    name: 'Custom',
    nameEn: 'Custom',
    color: '#888',
  },
];

export type MascotId = (typeof MASCOTS)[number]['id'];

export const DEFAULT_MASCOT_ID = 'catdrop';
export const DEFAULT_PALETTE: import('./PuffyMascot').PuffyPalette = 'blue';

/** Opsi palet untuk Cat Drop (PuffySettings picker). */
export const PALETTE_OPTIONS = Object.entries(
  // import dinamis dicegah — tulis langsung:
  { blue: { label: 'Biru', lt: '#6db0ff', base: '#2f6fed', dk: '#1a3c9a' },
    red: { label: 'Merah', lt: '#ff7d76', base: '#e2323f', dk: '#8e1224' } } as const
).map(([id, v]) => ({ id: id as import('./PuffyMascot').PuffyPalette, ...v }));

export function isPalette(v: unknown): v is import('./PuffyMascot').PuffyPalette {
  return v === 'blue' || v === 'red';
}

/** CSS variables → inline style object. */
export function varsToStyle(vars: Record<string, string>): React.CSSProperties {
  return vars as unknown as React.CSSProperties;
}

/** Cari maskot berdasarkan id, fallback ke catdrop. */
export function resolveMascot(settings: { mascotId?: string }): MascotEntry {
  return MASCOTS.find((m) => m.id === settings.mascotId) ?? MASCOTS[0];
}

/** CSS variables dari maskot terpilih (warna panel, tail, highlight). */
export function mascotVars(entry: MascotEntry, _settings: Record<string, unknown>): Record<string, string> {
  return {
    '--puffy-accent': entry.color,
    '--puffy-accent-soft': entry.color + '30',
  };
}
