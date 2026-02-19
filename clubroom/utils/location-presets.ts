import type {
  CoachLocationPreset,
  LocationPresetCoordinates,
} from '@/constants/location-presets';

export interface SaveLocationPresetInput {
  label?: string;
  address: string;
  coordinates: LocationPresetCoordinates | null;
}

const COORDINATE_EPSILON = 0.00005;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'location';
}

function normalizeCoordinates(
  coordinates: LocationPresetCoordinates,
): LocationPresetCoordinates {
  return {
    latitude: Number(coordinates.latitude.toFixed(6)),
    longitude: Number(coordinates.longitude.toFixed(6)),
  };
}

export function hasValidCoordinates(
  coordinates?: Partial<LocationPresetCoordinates> | null,
): coordinates is LocationPresetCoordinates {
  return (
    !!coordinates &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)
  );
}

export function deriveLocationLabel(address: string): string {
  const normalizedAddress = normalizeText(address);
  if (!normalizedAddress) return '';
  const firstSegment = normalizedAddress.split(',')[0]?.trim();
  return firstSegment || normalizedAddress;
}

function buildPresetId(
  label: string,
  address: string,
  coordinates?: LocationPresetCoordinates,
): string {
  if (coordinates) {
    return `preset-${slugify(label)}-${coordinates.latitude.toFixed(5)}-${coordinates.longitude.toFixed(5)}`;
  }
  return `preset-${slugify(label || address)}`;
}

export function createLocationPreset(
  input: SaveLocationPresetInput,
): CoachLocationPreset | null {
  const address = normalizeText(input.address);
  if (!address || !hasValidCoordinates(input.coordinates)) {
    return null;
  }

  const coordinates = normalizeCoordinates(input.coordinates);
  const label = normalizeText(input.label || '') || deriveLocationLabel(address);

  return {
    id: buildPresetId(label, address, coordinates),
    label,
    address,
    coordinates,
  };
}

function parseCoordinates(raw: unknown): LocationPresetCoordinates | undefined {
  if (hasValidCoordinates(raw as Partial<LocationPresetCoordinates>)) {
    return normalizeCoordinates(raw as LocationPresetCoordinates);
  }

  if (raw && typeof raw === 'object') {
    const candidate = raw as Record<string, unknown>;
    const latitude = candidate.lat ?? candidate.latitude;
    const longitude = candidate.lng ?? candidate.lon ?? candidate.longitude;
    const latitudeNumber = Number(latitude);
    const longitudeNumber = Number(longitude);
    if (Number.isFinite(latitudeNumber) && Number.isFinite(longitudeNumber)) {
      return normalizeCoordinates({
        latitude: latitudeNumber,
        longitude: longitudeNumber,
      });
    }
  }

  return undefined;
}

function parseLocationPreset(raw: unknown): CoachLocationPreset | null {
  if (typeof raw === 'string') {
    const address = normalizeText(raw);
    if (!address) return null;
    const label = deriveLocationLabel(address);
    return {
      id: buildPresetId(label, address),
      label,
      address,
    };
  }

  if (!raw || typeof raw !== 'object') return null;

  const candidate = raw as Record<string, unknown>;
  const address =
    typeof candidate.address === 'string'
      ? normalizeText(candidate.address)
      : typeof candidate.location === 'string'
        ? normalizeText(candidate.location)
        : typeof candidate.value === 'string'
          ? normalizeText(candidate.value)
          : '';

  if (!address) return null;

  const labelRaw =
    typeof candidate.label === 'string'
      ? candidate.label
      : typeof candidate.name === 'string'
        ? candidate.name
        : '';
  const label = normalizeText(labelRaw) || deriveLocationLabel(address);
  const coordinates = parseCoordinates(candidate.coordinates ?? candidate);
  const id =
    typeof candidate.id === 'string' && candidate.id.trim().length > 0
      ? candidate.id.trim()
      : buildPresetId(label, address, coordinates);

  return {
    id,
    label,
    address,
    coordinates,
  };
}

function normalizedAddressKey(address: string): string {
  return normalizeText(address).toLowerCase();
}

function coordinatesMatch(
  left?: LocationPresetCoordinates,
  right?: LocationPresetCoordinates | null,
): boolean {
  if (!left || !right) return false;
  return (
    Math.abs(left.latitude - right.latitude) <= COORDINATE_EPSILON &&
    Math.abs(left.longitude - right.longitude) <= COORDINATE_EPSILON
  );
}

export function dedupeLocationPresets(
  presets: CoachLocationPreset[],
): CoachLocationPreset[] {
  const seenAddresses = new Set<string>();
  const seenCoordinateKeys = new Set<string>();
  const deduped: CoachLocationPreset[] = [];

  presets.forEach((preset) => {
    const address = normalizeText(preset.address);
    if (!address) return;
    const label = normalizeText(preset.label) || deriveLocationLabel(address);
    const coordinates = preset.coordinates
      ? normalizeCoordinates(preset.coordinates)
      : undefined;
    const addressKey = normalizedAddressKey(address);
    const coordinateKey = coordinates
      ? `${coordinates.latitude.toFixed(6)}:${coordinates.longitude.toFixed(6)}`
      : '';

    if (seenAddresses.has(addressKey) || (coordinateKey && seenCoordinateKeys.has(coordinateKey))) {
      return;
    }

    seenAddresses.add(addressKey);
    if (coordinateKey) {
      seenCoordinateKeys.add(coordinateKey);
    }

    deduped.push({
      id: preset.id || buildPresetId(label, address, coordinates),
      label,
      address,
      coordinates,
    });
  });

  return deduped;
}

export function parseStoredLocationPresets(raw: unknown): CoachLocationPreset[] {
  if (!Array.isArray(raw)) return [];
  const parsed = raw
    .map((entry) => parseLocationPreset(entry))
    .filter((entry): entry is CoachLocationPreset => !!entry);
  return dedupeLocationPresets(parsed);
}

export function findMatchingLocationPreset(
  presets: CoachLocationPreset[],
  address: string,
  coordinates?: LocationPresetCoordinates | null,
): CoachLocationPreset | null {
  if (coordinates) {
    const coordinatesMatchPreset = presets.find((preset) =>
      coordinatesMatch(preset.coordinates, coordinates),
    );
    if (coordinatesMatchPreset) {
      return coordinatesMatchPreset;
    }
  }

  const addressKey = normalizedAddressKey(address);
  if (!addressKey) return null;

  return presets.find((preset) => normalizedAddressKey(preset.address) === addressKey) ?? null;
}
