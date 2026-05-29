import { useEffect, useRef, useState, startTransition } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, type MapPressEvent, type Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row, Column } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import { COACH_LOCATION_FALLBACK_PRESETS } from '@/constants/location-presets';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  dedupeLocationPresets,
  deriveLocationLabel,
  findMatchingLocationPreset,
} from '@/utils/location-presets';
import type { AddLocationPickerProps, LocationCoordinates } from './add-location-picker.types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const DEFAULT_COORDINATES: LocationCoordinates = {
  latitude: 51.5246,
  longitude: -0.0675,
};

const DEFAULT_DELTA = {
  latitudeDelta: 0.04,
  longitudeDelta: 0.04,
};

function normalizeLocation(value: string): string {
  return value.trim();
}

const EMPTY_SAVED_LOCATIONS: NonNullable<AddLocationPickerProps['savedLocations']> = [];

function formatAddress(address: Location.LocationGeocodedAddress): string {
  const lineOneParts = [address.name, address.street].filter(
    (part): part is string => typeof part === 'string' && part.trim().length > 0,
  );
  const lineTwoParts = [
    address.district,
    address.city,
    address.postalCode,
    address.region,
    address.country,
  ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
  const allParts = [...lineOneParts, ...lineTwoParts];
  return Array.from(new Set(allParts)).join(', ');
}

function toRegion(coordinates: LocationCoordinates, currentRegion: Region | null): Region {
  return {
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    latitudeDelta: currentRegion?.latitudeDelta ?? DEFAULT_DELTA.latitudeDelta,
    longitudeDelta: currentRegion?.longitudeDelta ?? DEFAULT_DELTA.longitudeDelta,
  };
}

export default function AddLocationPicker({
  value,
  venueName = '',
  coordinates,
  savedLocations = EMPTY_SAVED_LOCATIONS,
  onChangeValue,
  onChangeVenueName,
  onChangeCoordinates,
  onSelectSavedLocation,
  onSavePreset,
  defaultCoordinates,
}: AddLocationPickerProps) {
  const { colors: palette } = useTheme();
  const mapRef = useRef<MapView>(null);
  const initialCoordinates = coordinates ?? defaultCoordinates ?? DEFAULT_COORDINATES;

  const [mapRegion, setMapRegion] = useState<Region>(() => ({
    latitude: initialCoordinates.latitude,
    longitude: initialCoordinates.longitude,
    ...DEFAULT_DELTA,
  }));
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const coordinatesKey = coordinates
    ? `${coordinates.latitude.toFixed(6)}:${coordinates.longitude.toFixed(6)}`
    : '';
  const lastAnimatedCoordinatesKeyRef = useRef('');

  const normalizedValue = normalizeLocation(value);
  const presetLocations = dedupeLocationPresets([...savedLocations, ...COACH_LOCATION_FALLBACK_PRESETS]).slice(0, 8);
  const selectedPreset = findMatchingLocationPreset(presetLocations, normalizedValue, coordinates);
  const hasPresetValue = selectedPreset !== null;

  useEffect(() => {
    startTransition(() => {
      setSavedFeedback(false);
    });
  }, [normalizedValue]);

  useEffect(() => {
    if (!coordinates || coordinatesKey.length === 0) return;
    if (lastAnimatedCoordinatesKeyRef.current === coordinatesKey) return;
    lastAnimatedCoordinatesKeyRef.current = coordinatesKey;

    startTransition(() => {
      setMapRegion((currentRegion) => {
        const nextRegion = toRegion(coordinates, currentRegion);
        mapRef.current?.animateToRegion(nextRegion, 260);
        return nextRegion;
      });
    });
  }, [coordinates, coordinatesKey]);

  const focusMap = (nextCoordinates: LocationCoordinates) => {
    lastAnimatedCoordinatesKeyRef.current = `${nextCoordinates.latitude.toFixed(6)}:${nextCoordinates.longitude.toFixed(6)}`;
    setMapRegion((currentRegion) => {
      const nextRegion = toRegion(nextCoordinates, currentRegion);
      mapRef.current?.animateToRegion(nextRegion, 260);
      return nextRegion;
    });
  };

  const reverseGeocode = async (nextCoordinates: LocationCoordinates) => {
    setIsResolvingAddress(true);

    return await runAsyncTryCatchFinally(async () => {
      const resolved = await Location.reverseGeocodeAsync(nextCoordinates);
      const topAddress = resolved[0];
      if (!topAddress) return;
      const formatted = formatAddress(topAddress);
      if (formatted.length > 0) {
        onChangeValue(formatted);
      }
    }, async error => {
      // Best-effort only; keep manual text unchanged when reverse lookup fails.
    }, () => {
      setIsResolvingAddress(false);
    });
  };

  const geocodeAddress = async (query: string, options?: { silent?: boolean }) => {
    const normalized = normalizeLocation(query);
    if (normalized.length < 3) {
      if (!options?.silent) {
        setInlineError('Enter at least 3 characters to search an address.');
      }
      return false;
    }

    setIsSearching(true);

    return await runAsyncTryCatchFinally(async () => {
      const matches = await Location.geocodeAsync(normalized);
      if (matches.length === 0) {
        onChangeCoordinates(null);
        if (!options?.silent) {
          setInlineError('Address not found. Try adding city or postcode for a better match.');
        }
        return false;
      }

      const nextCoordinates: LocationCoordinates = {
        latitude: matches[0].latitude,
        longitude: matches[0].longitude,
      };
      onChangeCoordinates(nextCoordinates);
      focusMap(nextCoordinates);
      setInlineError(null);
      setPermissionDenied(false);
      return true;
    }, async error => {
      onChangeCoordinates(null);
      if (!options?.silent) {
        setInlineError('Could not search this location right now.');
      }
      return false;
    }, () => {
      setIsSearching(false);
    });
  };

  const handleUseCurrentLocation = async () => {
    // S-40: Privacy warning before using GPS
    const proceed = await new Promise<boolean>((resolve) => {
      uiFeedback.alert(
        'Location Privacy',
        'Your current location will be used to set the session venue. This location may be visible to session participants. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Use Location', onPress: () => resolve(true) },
        ],
      );
    });
    if (!proceed) return;

    setIsLocating(true);

    return await runAsyncTryCatchFinally(async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setPermissionDenied(true);
        setInlineError(
          'Location access is required to pin your current spot. Enable it in device settings.',
        );
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextCoordinates: LocationCoordinates = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      onChangeCoordinates(nextCoordinates);
      focusMap(nextCoordinates);
      await reverseGeocode(nextCoordinates);
      setInlineError(null);
      setPermissionDenied(false);
    }, async error => {
      setPermissionDenied(false);
      setInlineError('Unable to get location. Check signal and try again.');
    }, () => {
      setIsLocating(false);
    });
  };

  const handlePinCoordinates = (nextCoordinates: LocationCoordinates) => {
    onChangeCoordinates(nextCoordinates);
    focusMap(nextCoordinates);
    void reverseGeocode(nextCoordinates);
  };

  const handleMapPress = (event: MapPressEvent) => {
    handlePinCoordinates(event.nativeEvent.coordinate);
  };

  const handleSavedLocationPress = async (preset: (typeof presetLocations)[number]) => {
    if (onSelectSavedLocation) {
      onSelectSavedLocation(preset);
    } else {
      onChangeValue(preset.address);
      onChangeCoordinates(preset.coordinates ?? null);
    }
    setInlineError(null);
    setPermissionDenied(false);

    if (preset.coordinates) {
      focusMap(preset.coordinates);
      setIsEditorOpen(false);
      return;
    }

    const matched = await geocodeAddress(preset.address);
    if (matched) {
      setIsEditorOpen(false);
    }
  };

  const handleTextChange = (nextValue: string) => {
    onChangeValue(nextValue);
    setInlineError(null);
    setPermissionDenied(false);
    if (coordinates && nextValue.trim() !== value.trim()) {
      onChangeCoordinates(null);
    }
  };

  const handleSavePreset = () => {
    if (!onSavePreset) return;
    if (normalizedValue.length < 3) {
      setInlineError('Search or drop a pin, then save this preset.');
      return;
    }
    if (!coordinates) {
      setInlineError('Drop a pin or use Find so this location saves exactly.');
      return;
    }

    onSavePreset({
      label: venueName.trim() || selectedPreset?.label || deriveLocationLabel(normalizedValue),
      address: normalizedValue,
      coordinates,
    });
    setSavedFeedback(true);
    setInlineError(null);
    setPermissionDenied(false);
  };

  const selectedPrimaryLabel =
    venueName.trim() || selectedPreset?.label || normalizedValue || 'Drop a pin and add a location';
  const selectedSecondaryLabel = venueName.trim()
    ? selectedPreset?.label || normalizedValue
    : hasPresetValue
      ? 'Saved location'
      : '';

  return (
    <Column gap="sm">
      <Row align="center" style={styles.presetsHeader}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Preset locations</ThemedText>
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Row gap="sm">
          {presetLocations.map((preset) => {
            const selected = selectedPreset?.id === preset.id;
            return (
              <Clickable
                key={preset.id}
                onPress={() => {
                  void handleSavedLocationPress(preset);
                }}
                accessibilityLabel={`Use preset location ${preset.label}`}
                style={[
                  styles.presetChip,
                  {
                    borderColor: selected ? palette.tint : palette.border,
                    backgroundColor: selected ? withAlpha(palette.tint, 0.1) : palette.surface,
                  },
                ]}
              >
                <Row align="center" gap="xxs">
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'location-outline'}
                    size={13}
                    color={selected ? palette.tint : palette.muted}
                  />
                  <ThemedText style={styles.presetChipText} numberOfLines={1}>
                    {preset.label}
                  </ThemedText>
                </Row>
              </Clickable>
            );
          })}
        </Row>
      </ScrollView>

      {!isEditorOpen && (
        <Clickable
          onPress={() => setIsEditorOpen(true)}
          accessibilityLabel="Add new location"
          style={[
            styles.addNewBtn,
            {
              borderColor: palette.border,
              backgroundColor: withAlpha(palette.tint, 0.08),
            },
          ]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="add-circle-outline" size={15} color={palette.tint} />
            <ThemedText style={[styles.addNewText, { color: palette.tint }]}>
              Add new location
            </ThemedText>
          </Row>
        </Clickable>
      )}

      {!isEditorOpen && (
        <View
          style={[
            styles.selectedLocationCard,
            {
              borderColor: palette.border,
              backgroundColor: palette.surface,
            },
          ]}
        >
          <Row align="center" gap="sm">
            <Ionicons name="pin-outline" size={16} color={palette.tint} />
            <Column style={styles.flex}>
              <ThemedText style={styles.selectedLabel}>Selected location</ThemedText>
              <ThemedText numberOfLines={2} style={{ color: palette.text }}>
                {selectedPrimaryLabel}
              </ThemedText>
              {selectedSecondaryLabel.length > 0 ? (
                <ThemedText numberOfLines={1} style={[styles.selectedMeta, { color: palette.muted }]}>
                  {selectedSecondaryLabel}
                </ThemedText>
              ) : null}
            </Column>
          </Row>
        </View>
      )}

      {isEditorOpen && (
        <Column gap="sm">
          <Row align="center" justify="space-between">
            <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>
              Add new location
            </ThemedText>
            <Clickable
              onPress={() => setIsEditorOpen(false)}
              accessibilityLabel="Close location editor"
              style={[styles.doneBtn, { borderColor: palette.border }]}
            >
              <ThemedText style={[styles.doneText, { color: palette.tint }]}>Done</ThemedText>
            </Clickable>
          </Row>

          {onChangeVenueName && (
            <Row
              align="center"
              gap="sm"
              style={[
                styles.venueInputWrap,
                {
                  backgroundColor: palette.surface,
                  borderColor: palette.border,
                },
              ]}
            >
              <Ionicons name="pricetag-outline" size={16} color={palette.muted} />
              <TextInput
                style={[styles.input, { color: palette.text }]}
                placeholder="Venue name (optional) e.g. Home Turf"
                placeholderTextColor={palette.muted}
                value={venueName}
                onChangeText={onChangeVenueName}
                accessibilityLabel="Venue name"

            maxLength={50}
          />
            </Row>
          )}

          <Row
            align="center"
            gap="sm"
            style={[
              styles.inputWrap,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={palette.muted} />
            <TextInput
              style={[styles.input, { color: palette.text }]}
              placeholder="Search pitch, postcode, or area..."
              placeholderTextColor={palette.muted}
              value={value}
              onChangeText={handleTextChange}
              returnKeyType="search"
              onSubmitEditing={() => {
                void geocodeAddress(value);
              }}
              accessibilityLabel="Session location"
            />
            <Clickable
              onPress={() => {
                void geocodeAddress(value);
              }}
              accessibilityLabel="Find location on map"
              style={[
                styles.searchBtn,
                {
                  backgroundColor: withAlpha(palette.tint, 0.1),
                },
              ]}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color={palette.tint} />
              ) : (
                <ThemedText style={[styles.searchBtnText, { color: palette.tint }]}>Find</ThemedText>
              )}
            </Clickable>
          </Row>
          {inlineError ? (
            <ThemedText style={[styles.errorText, { color: palette.error }]} accessibilityRole="alert">
              {inlineError}
            </ThemedText>
          ) : null}
          {permissionDenied ? (
            <Clickable
              onPress={() => {
                void Linking.openSettings();
              }}
              accessibilityLabel="Open settings"
              style={[styles.settingsBtn, { borderColor: palette.error }]}
            >
              <ThemedText style={[styles.settingsBtnText, { color: palette.error }]}>
                Open Settings
              </ThemedText>
            </Clickable>
          ) : null}

          <Row gap="sm">
            <Clickable
              onPress={() => {
                void handleUseCurrentLocation();
              }}
              accessibilityLabel="Use current location"
              style={[
                styles.actionBtn,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                },
              ]}
            >
              <Row align="center" gap="xxs">
                <Ionicons
                  name={isLocating ? 'hourglass-outline' : 'locate-outline'}
                  size={14}
                  color={palette.muted}
                />
                <ThemedText style={styles.actionText}>
                  {isLocating ? 'Locating...' : 'Use my location'}
                </ThemedText>
              </Row>
            </Clickable>

            <Clickable
              onPress={() => onChangeCoordinates(null)}
              accessibilityLabel="Clear map pin"
              style={[
                styles.actionBtn,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.surface,
                  opacity: coordinates ? 1 : 0.55,
                },
              ]}
              disabled={!coordinates}
            >
              <Row align="center" gap="xxs">
                <Ionicons name="close-circle-outline" size={14} color={palette.muted} />
                <ThemedText style={styles.actionText}>Clear pin</ThemedText>
              </Row>
            </Clickable>
          </Row>

          <View
            style={[
              styles.mapWrap,
              {
                borderColor: palette.border,
                backgroundColor: withAlpha(palette.muted, 0.08),
              },
            ]}
          >
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              initialRegion={mapRegion}
              onPress={handleMapPress}
              onRegionChangeComplete={setMapRegion}
              showsCompass={false}
              toolbarEnabled={false}
              accessibilityLabel="Location map"
            >
              {coordinates ? (
                <Marker
                  coordinate={coordinates}
                  draggable
                  onDragEnd={(event) => {
                    handlePinCoordinates(event.nativeEvent.coordinate);
                  }}
                  title="Training location"
                  description={value || 'Pinned location'}
                />
              ) : null}
            </MapView>
            {!coordinates && (
              <Row align="center" gap="xxs" style={[styles.pinHint, { backgroundColor: withAlpha(palette.surface, 0.92) }]}>
                <Ionicons name="location" size={15} color={palette.tint} />
                <ThemedText style={styles.pinHintText}>Tap map to drop pin</ThemedText>
              </Row>
            )}
          </View>

          <Row align="center" justify="space-between">
            <ThemedText style={[styles.metaText, { color: palette.muted }]}>
              {coordinates
                ? `Pin: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
                : 'No pin selected yet'}
            </ThemedText>
            {isResolvingAddress ? <ActivityIndicator size="small" color={palette.muted} /> : null}
          </Row>

          {onSavePreset && (
            <Clickable
              onPress={handleSavePreset}
              accessibilityLabel="Save location to presets"
              style={[
                styles.savePresetBtn,
                {
                  borderColor: hasPresetValue ? palette.border : palette.tint,
                  backgroundColor: hasPresetValue
                    ? withAlpha(palette.success, 0.1)
                    : withAlpha(palette.tint, 0.08),
                },
              ]}
              disabled={hasPresetValue || normalizedValue.length < 3 || !coordinates}
            >
              <Row align="center" justify="center" gap="xs">
                <Ionicons
                  name={hasPresetValue || savedFeedback ? 'checkmark-circle' : 'bookmark-outline'}
                  size={15}
                  color={hasPresetValue || savedFeedback ? palette.success : palette.tint}
                />
                <ThemedText
                  style={{
                    ...Typography.smallSemiBold,
                    color: hasPresetValue || savedFeedback ? palette.success : palette.tint,
                  }}
                >
                  {hasPresetValue || savedFeedback ? 'Saved in presets' : 'Save as preset'}
                </ThemedText>
              </Row>
            </Clickable>
          )}
        </Column>
      )}
    </Column>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  presetsHeader: {
    minHeight: 34,
  },
  sectionLabel: {
    ...Typography.caption,
  },
  addLocationBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  addLocationText: {
    ...Typography.smallSemiBold,
  },
  addNewBtn: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radii.md,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  addNewText: {
    ...Typography.smallSemiBold,
  },
  presetChip: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    minHeight: 34,
    justifyContent: 'center',
    maxWidth: 210,
  },
  presetChipText: {
    ...Typography.caption,
  },
  selectedLocationCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  selectedLabel: {
    ...Typography.caption,
  },
  selectedMeta: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  doneBtn: {
    minHeight: 32,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    justifyContent: 'center',
  },
  doneText: {
    ...Typography.smallSemiBold,
  },
  inputWrap: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.xs,
  },
  venueInputWrap: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingLeft: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  input: {
    flex: 1,
    ...Typography.body,
  },
  searchBtn: {
    borderRadius: Radii.sm,
    minHeight: 34,
    minWidth: 52,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  searchBtnText: {
    ...Typography.smallSemiBold,
  },
  errorText: {
    ...Typography.caption,
  },
  settingsBtn: {
    minHeight: 34,
    borderWidth: 1,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    alignSelf: 'flex-start',
  },
  settingsBtnText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  actionBtn: {
    flex: 1,
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  actionText: {
    ...Typography.caption,
  },
  mapWrap: {
    height: 220,
    borderRadius: Radii.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  pinHint: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  pinHintText: {
    ...Typography.caption,
  },
  metaText: {
    ...Typography.caption,
  },
  savePresetBtn: {
    minHeight: 42,
    borderRadius: Radii.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
});
