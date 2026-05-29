import type { VideoAnnotation } from '@/constants/types';

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getMarkerColor(
  type: VideoAnnotation['type'],
  palette: { success: string; warning: string; tint: string; muted: string },
) {
  switch (type) {
    case 'HIGHLIGHT':
      return palette.success;
    case 'IMPROVEMENT':
      return palette.warning;
    case 'TECHNIQUE':
      return palette.tint;
    default:
      return palette.muted;
  }
}
