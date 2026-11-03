import { Mascot } from 'wobnimo/react';
import type { Mood } from './types';

interface WobnimoMascotProps {
  character: string;
  mood: Mood;
  talking: boolean;
}

/**
 * Memetakan Mood Sentanu Jaya ke State Wobnimo
 */
function mapMoodToWobnimoState(mood: Mood, talking: boolean): 'idle' | 'listening' | 'thinking' | 'speaking' | 'celebrating' | 'error' | 'surprised' | 'sad' | 'sleeping' {
  if (talking) return 'speaking';
  switch (mood) {
    case 'happy':
    case 'excited':
      return 'celebrating';
    case 'love':
      return 'celebrating';
    case 'think':
      return 'thinking';
    case 'confused':
      return 'surprised';
    case 'sad':
      return 'sad';
    case 'neutral':
    default:
      return 'idle';
  }
}

export function WobnimoMascot({ character, mood, talking }: WobnimoMascotProps) {
  const state = mapMoodToWobnimoState(mood, talking);

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Mascot 
        character={character} 
        state={state} 
        style={{ width: '100%', height: '100%', maxWidth: '96px', maxHeight: '96px' }} 
      />
    </div>
  );
}
