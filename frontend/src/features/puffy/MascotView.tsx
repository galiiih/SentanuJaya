import { PuffyMascot, type PuffyPalette } from './PuffyMascot';
import { BlobMascot } from './BlobMascot';
import { ImageMascot } from './ImageMascot';
import { resolveMascot } from './mascots';
import type { Mood } from './types';

interface MascotViewProps {
  choice: { mascotId?: string; palette?: PuffyPalette; customImage?: string };
  mood: Mood;
  talking: boolean;
  bubble: boolean;
  wave?: boolean;
}

/**
 * Router komponen maskot. Memilih renderer berdasarkan `kind` dari registry.
 */
export function MascotView({ choice, mood, talking, bubble, wave }: MascotViewProps) {
  const entry = resolveMascot(choice);

  switch (entry.kind) {
    case 'drop':
      return <PuffyMascot mood={mood} talking={talking} bubble={bubble} wave={wave} palette={choice.palette} />;
    case 'blob':
      return <BlobMascot entry={entry} mood={mood} talking={talking} bubble={bubble} />;
    case 'image':
      return <ImageMascot src={choice.customImage} mood={mood} />;
    default:
      return <PuffyMascot mood={mood} talking={talking} bubble={bubble} wave={wave} />;
  }
}
