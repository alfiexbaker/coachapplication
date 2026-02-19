/**
 * Starter presets for UK-first coach accounts.
 * Each preset carries coordinates so map pins can be replayed exactly.
 */
export interface LocationPresetCoordinates {
  latitude: number;
  longitude: number;
}

export interface CoachLocationPreset {
  id: string;
  label: string;
  address: string;
  coordinates?: LocationPresetCoordinates;
}

export const COACH_LOCATION_FALLBACK_PRESETS: CoachLocationPreset[] = [
  {
    id: 'preset-shoreditch-park',
    label: 'Shoreditch Park',
    address: 'Shoreditch Park, New North Road, London N1 6TA',
    coordinates: { latitude: 51.5353, longitude: -0.0907 },
  },
  {
    id: 'preset-hackney-marshes',
    label: 'Hackney Marshes',
    address: 'Hackney Marshes Centre, Homerton Road, London E9 5PF',
    coordinates: { latitude: 51.5519, longitude: -0.0339 },
  },
  {
    id: 'preset-powerleague-shoreditch',
    label: 'Powerleague Shoreditch',
    address: 'Powerleague Shoreditch, Braithwaite Street, London E1 6GJ',
    coordinates: { latitude: 51.5244, longitude: -0.0754 },
  },
  {
    id: 'preset-regents-park-hub',
    label: "Regent's Park Hub",
    address: "The Hub, Regent's Park, London NW1 4RU",
    coordinates: { latitude: 51.5296, longitude: -0.1547 },
  },
];
