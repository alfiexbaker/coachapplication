import type { CoachLocationPreset } from '@/constants/location-presets';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface SaveLocationPresetPayload {
  label: string;
  address: string;
  coordinates: LocationCoordinates;
}

export interface AddLocationPickerProps {
  value: string;
  venueName?: string;
  coordinates?: LocationCoordinates | null;
  savedLocations?: CoachLocationPreset[];
  onChangeValue: (value: string) => void;
  onChangeVenueName?: (value: string) => void;
  onChangeCoordinates: (coordinates: LocationCoordinates | null) => void;
  onSelectSavedLocation?: (preset: CoachLocationPreset) => void;
  onSavePreset?: (payload: SaveLocationPresetPayload) => void;
  defaultCoordinates?: LocationCoordinates;
}
