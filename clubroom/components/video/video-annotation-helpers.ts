import type { VideoAnnotationType } from '@/constants/types';

// Decorative: annotation type category colors (not themeable)
export const ANNOTATION_TYPES: { type: VideoAnnotationType; label: string; color: string; icon: string }[] = [
  { type: 'HIGHLIGHT', label: 'Highlight', color: '#4CAF50', icon: 'star' },
  { type: 'TECHNIQUE', label: 'Technique', color: '#2196F3', icon: 'football' },
  { type: 'IMPROVEMENT', label: 'Improvement', color: '#FF9800', icon: 'trending-up' },
];

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
