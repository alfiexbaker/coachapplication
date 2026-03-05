import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
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

function normalizeLocation(value: string): string {
  return value.trim();
}

export default memo(function AddLocationPickerWeb({
  value,
  venueName = '',
  coordinates,
  savedLocations = [],
  onChangeValue,
  onChangeVenueName,
  onChangeCoordinates,
  onSelectSavedLocation,
  onSavePreset,
}: AddLocationPickerProps) {
  const { colors: palette } = useTheme();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  const normalizedValue = normalizeLocation(value);
  const presetLocations = useMemo(
    () => dedupeLocationPresets([...savedLocations, ...COACH_LOCATION_FALLBACK_PRESETS]).slice(0, 8),
    [savedLocations],
  );
  const selectedPreset = useMemo(
    () => findMatchingLocationPreset(presetLocations, normalizedValue, coordinates),
    [coordinates, normalizedValue, presetLocations],
  );
  const hasPresetValue = selectedPreset !== null;

  useEffect(() => {
    setSavedFeedback(false);
  }, [normalizedValue]);

  const geocodeAddress = useCallback(
    async (query: string, options?: { silent?: boolean }) => {
      const normalized = normalizeLocation(query);
      if (normalized.length < 3) {
        if (!options?.silent) {
          uiFeedback.alert('Add a location', 'Enter at least 3 characters to search an address.');
        }
        return false;
      }

      setIsSearching(true);
      try {
        const matches = await Location.geocodeAsync(normalized);
        if (matches.length === 0) {
          onChangeCoordinates(null);
          if (!options?.silent) {
            uiFeedback.alert('Address not found', 'Try adding city or postcode for a better match.');
          }
          return false;
        }
        const nextCoordinates: LocationCoordinates = {
          latitude: matches[0].latitude,
          longitude: matches[0].longitude,
        };
        onChangeCoordinates(nextCoordinates);
        return true;
      } catch {
        onChangeCoordinates(null);
        if (!options?.silent) {
          uiFeedback.alert('Search failed', 'Could not search this location right now.');
        }
        return false;
      } finally {
        setIsSearching(false);
      }
    },
    [onChangeCoordinates],
  );

  const handleSavedLocationPress = useCallback(
    async (preset: (typeof presetLocations)[number]) => {
      if (onSelectSavedLocation) {
        onSelectSavedLocation(preset);
      } else {
        onChangeValue(preset.address);
        onChangeCoordinates(preset.coordinates ?? null);
      }

      if (preset.coordinates) {
        setIsEditorOpen(false);
        return;
      }

      const matched = await geocodeAddress(preset.address);
      if (matched) {
        setIsEditorOpen(false);
      }
    },
    [geocodeAddress, onChangeCoordinates, onChangeValue, onSelectSavedLocation],
  );

  const handleTextChange = useCallback(
    (nextValue: string) => {
      onChangeValue(nextValue);
      if (coordinates && nextValue.trim() !== value.trim()) {
        onChangeCoordinates(null);
      }
    },
    [coordinates, onChangeCoordinates, onChangeValue, value],
  );

  const handleSavePreset = useCallback(() => {
    if (!onSavePreset) return;
    if (normalizedValue.length < 3) {
      uiFeedback.alert('Add a location first', 'Search for an address, then save this preset.');
      return;
    }
    if (!coordinates) {
      uiFeedback.alert('Pin required', 'Use Find first so this preset stores exact coordinates.');
      return;
    }

    onSavePreset({
      label: venueName.trim() || selectedPreset?.label || deriveLocationLabel(normalizedValue),
      address: normalizedValue,
      coordinates,
    });
    setSavedFeedback(true);
  }, [coordinates, normalizedValue, onSavePreset, selectedPreset?.label, venueName]);

  const selectedPrimaryLabel =
    venueName.trim() || selectedPreset?.label || normalizedValue || 'Add a location';
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
              accessibilityLabel="Find location"
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

          <View
            style={[
              styles.placeholder,
              {
                backgroundColor: withAlpha(palette.muted, 0.08),
                borderColor: palette.border,
              },
            ]}
          >
            <Ionicons name="map-outline" size={28} color={palette.muted} />
            <ThemedText style={[styles.placeholderTitle, { color: palette.text }]}>Pin drop works in iOS/Android app</ThemedText>
            <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>Use Find to set coordinates here, or switch to mobile app for exact pin placement.</ThemedText>
          </View>

          <ThemedText style={[styles.metaText, { color: palette.muted }]}>
            {coordinates
              ? `Pin: ${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}`
              : 'No pin selected yet'}
          </ThemedText>

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
});

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
  placeholder: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  placeholderTitle: {
    ...Typography.smallSemiBold,
  },
  placeholderText: {
    ...Typography.caption,
    textAlign: 'center',
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
