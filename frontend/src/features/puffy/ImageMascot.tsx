import type { Mood } from './types';

interface Props {
  src?: string;
  mood: Mood;
}

const MOOD_CLASS: Record<Mood, string> = {
  neutral: '', happy: 'im-bounce', love: 'im-pulse', excited: 'im-bounce im-fast',
  sad: 'im-droop', think: 'im-tilt', confused: 'im-wobble',
};

/** Maskot gambar custom dari pengguna. Menerapkan animasi mood via CSS class. */
export function ImageMascot({ src, mood }: Props) {
  if (!src) return <div className="im-placeholder">?</div>;
  return (
    <div className={`im-wrap ${MOOD_CLASS[mood]}`.trim()}>
      <img src={src} alt="Mascot" className="im-img" draggable={false} />
    </div>
  );
}
