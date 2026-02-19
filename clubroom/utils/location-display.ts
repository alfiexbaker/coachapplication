import type { MapCoordinates } from '@/utils/map-links';

const PINNED_LOCATION_PATTERN =
  /^Pinned location \(-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?\)$/;

export function formatPinnedLocationLabel(coordinates: MapCoordinates): string {
  return `Pinned location (${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)})`;
}

export function isPinnedLocationLabel(label: string): boolean {
  return PINNED_LOCATION_PATTERN.test(label.trim());
}

export function getDisplayLocationLabel(
  location: string,
  coordinates?: MapCoordinates | null,
): string {
  const normalized = location.trim();
  if (normalized.length > 0) {
    return normalized;
  }
  if (!coordinates) {
    return '';
  }
  return formatPinnedLocationLabel(coordinates);
}
