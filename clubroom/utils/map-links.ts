import { Linking, Platform } from 'react-native';

export interface MapCoordinates {
  latitude: number;
  longitude: number;
}

interface OpenLocationInMapsOptions {
  location?: string | null;
  coordinates?: MapCoordinates | null;
}

function hasValidCoordinates(
  coordinates?: MapCoordinates | null,
): coordinates is MapCoordinates {
  return (
    !!coordinates &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)
  );
}

export async function openLocationInMaps({
  location,
  coordinates,
}: OpenLocationInMapsOptions): Promise<boolean> {
  const normalizedLocation = location?.trim() ?? '';
  const withCoordinates = hasValidCoordinates(coordinates);

  if (!normalizedLocation && !withCoordinates) {
    return false;
  }

  const query = encodeURIComponent(normalizedLocation);
  const destination = withCoordinates
    ? `${coordinates.latitude},${coordinates.longitude}`
    : '';

  const nativeUrl = withCoordinates
    ? Platform.select({
        ios: `maps://?daddr=${destination}`,
        android: `geo:0,0?q=${destination}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`,
      })
    : Platform.select({
        ios: `maps://?q=${query}`,
        android: `geo:0,0?q=${query}`,
        default: `https://www.google.com/maps/search/?api=1&query=${query}`,
      });

  const webFallbackUrl = withCoordinates
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
    : `https://www.google.com/maps/search/?api=1&query=${query}`;

  const candidates = [nativeUrl, webFallbackUrl].filter(
    (value): value is string => typeof value === 'string' && value.length > 0,
  );

  for (const url of candidates) {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) continue;

    await Linking.openURL(url);
    return true;
  }

  return false;
}
