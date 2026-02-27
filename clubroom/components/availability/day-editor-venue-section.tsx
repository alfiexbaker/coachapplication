/**
 * DayEditorVenueSection — Venue chips with map-based add-location modal.
 * Reuses the same AddLocationPicker flow used in session creation.
 */
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Keyboard, Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import AddLocationPicker from '@/components/location/add-location-picker';
import type {
  LocationCoordinates,
  SaveLocationPresetPayload,
} from '@/components/location/add-location-picker.types';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { useTheme } from '@/hooks/useTheme';
import type { CoachVenue } from '@/constants/types';
import type { CoachLocationPreset } from '@/constants/location-presets';
import { Row } from '@/components/primitives';
import { apiClient } from '@/services/api-client';
import { createLogger } from '@/utils/logger';
import {
  createLocationPreset,
  dedupeLocationPresets,
  deriveLocationLabel,
  parseStoredLocationPresets,
} from '@/utils/location-presets';

const logger = createLogger('DayEditorVenueSection');

interface DayEditorVenueSectionProps {
  venues: CoachVenue[];
  location: string;
  showAddVenueInput: boolean;
  newVenueLabel: string;
  onSelectVenue: (label: string) => void;
  onToggleAddInput: () => void;
  onNewVenueLabelChange: (label: string) => void;
  onAddVenue: (label: string) => void;
}

function DayEditorVenueSectionInner({
  venues,
  location,
  showAddVenueInput,
  newVenueLabel,
  onSelectVenue,
  onToggleAddInput,
  onNewVenueLabelChange,
  onAddVenue,
}: DayEditorVenueSectionProps) {
  const { colors: palette } = useTheme();
  const insets = useSafeAreaInsets();

  const [savedLocations, setSavedLocations] = useState<CoachLocationPreset[]>([]);
  const [locationSearchValue, setLocationSearchValue] = useState('');
  const [locationCoordinates, setLocationCoordinates] = useState<LocationCoordinates | null>(null);

  useEffect(() => {
    const loadSavedLocations = async () => {
      try {
        const stored = await apiClient.get<unknown>(STORAGE_KEYS.SAVED_LOCATIONS, null);
        setSavedLocations(parseStoredLocationPresets(stored));
      } catch (error) {
        logger.error('Failed to load saved locations', error);
      }
    };

    void loadSavedLocations();
  }, []);

  const persistLocationPreset = useCallback(async (payload: SaveLocationPresetPayload) => {
    const preset = createLocationPreset({
      label: payload.label,
      address: payload.address.trim(),
      coordinates: payload.coordinates,
    });
    if (!preset) return;

    setSavedLocations((previous) => {
      const updated = dedupeLocationPresets([preset, ...previous]).slice(0, 8);
      void apiClient.set(STORAGE_KEYS.SAVED_LOCATIONS, updated).catch((error) => {
        logger.error('Failed to save location preset', error);
      });
      return updated;
    });
  }, []);

  const closeAddVenueModal = useCallback(() => {
    Keyboard.dismiss();
    if (showAddVenueInput) onToggleAddInput();
  }, [onToggleAddInput, showAddVenueInput]);

  const openAddVenueModal = useCallback(() => {
    if (showAddVenueInput) return;
    setLocationSearchValue('');
    setLocationCoordinates(null);
    onNewVenueLabelChange('');
    onToggleAddInput();
  }, [onNewVenueLabelChange, onToggleAddInput, showAddVenueInput]);

  const handleSelectSavedLocation = useCallback(
    (preset: CoachLocationPreset) => {
      setLocationSearchValue(preset.address);
      setLocationCoordinates(preset.coordinates ?? null);
      if (!newVenueLabel.trim()) {
        onNewVenueLabelChange(preset.label);
      }
    },
    [newVenueLabel, onNewVenueLabelChange],
  );

  const canConfirmLocation = useMemo(() => {
    const derived = deriveLocationLabel(locationSearchValue).trim();
    return Boolean(newVenueLabel.trim() || derived);
  }, [locationSearchValue, newVenueLabel]);

  const handleConfirmAddVenue = useCallback(() => {
    const normalizedAddress = locationSearchValue.trim();
    const fallbackLabel = deriveLocationLabel(normalizedAddress).trim();
    const venueLabel = (newVenueLabel.trim() || fallbackLabel).trim();

    if (!venueLabel) {
      Alert.alert('Add location', 'Search a location on the map, then name the venue.');
      return;
    }

    if (normalizedAddress.length > 0 && locationCoordinates) {
      void persistLocationPreset({
        label: venueLabel,
        address: normalizedAddress,
        coordinates: locationCoordinates,
      });
    }

    onAddVenue(venueLabel);
    onSelectVenue(venueLabel);
    closeAddVenueModal();
  }, [
    closeAddVenueModal,
    locationCoordinates,
    locationSearchValue,
    newVenueLabel,
    onAddVenue,
    onSelectVenue,
    persistLocationPreset,
  ]);

  return (
    <>
      <View style={styles.section}>
        <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Location</ThemedText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {venues.map((v) => {
            const isSelected = location === v.label;
            return (
              <Clickable
                key={v.id}
                onPress={() => {
                  if (Platform.OS !== 'web')
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelectVenue(isSelected ? '' : v.label);
                }}
                accessibilityLabel={`Venue: ${v.label}`}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(palette.tint, 0.12)
                      : palette.background,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                {v.icon && (
                  <Ionicons
                    name={(v.icon as keyof typeof Ionicons.glyphMap) || 'location-outline'}
                    size={14}
                    color={isSelected ? palette.tint : palette.muted}
                  />
                )}
                <ThemedText
                  style={[styles.chipText, { color: isSelected ? palette.tint : palette.text }]}
                  numberOfLines={1}
                >
                  {v.label}
                </ThemedText>
              </Clickable>
            );
          })}
          <Clickable
            onPress={openAddVenueModal}
            accessibilityLabel="Add new venue"
            style={[
              styles.chip,
              {
                backgroundColor: showAddVenueInput
                  ? withAlpha(palette.tint, 0.12)
                  : palette.background,
                borderColor: showAddVenueInput ? palette.tint : palette.border,
              },
            ]}
          >
            <Ionicons
              name="add"
              size={14}
              color={showAddVenueInput ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[styles.chipText, { color: showAddVenueInput ? palette.tint : palette.muted }]}
            >
              Add
            </ThemedText>
          </Clickable>
        </ScrollView>
      </View>

      <Modal
        visible={showAddVenueInput}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeAddVenueModal}
      >
        <View style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <Row align="center" justify="space-between" style={styles.modalHeader}>
            <ThemedText type="subtitle">Add Location</ThemedText>
            <Clickable
              accessibilityLabel="Close add location modal"
              onPress={closeAddVenueModal}
              style={[styles.modalCloseBtn, { borderColor: palette.border }]}
            >
              <Ionicons name="close" size={18} color={palette.muted} />
            </Clickable>
          </Row>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: Math.max(insets.bottom + Spacing.lg, Spacing['2xl']) },
            ]}
          >
            <AddLocationPicker
              value={locationSearchValue}
              venueName={newVenueLabel}
              coordinates={locationCoordinates}
              savedLocations={savedLocations}
              onChangeValue={setLocationSearchValue}
              onChangeVenueName={onNewVenueLabelChange}
              onChangeCoordinates={setLocationCoordinates}
              onSelectSavedLocation={handleSelectSavedLocation}
              onSavePreset={(payload) => {
                void persistLocationPreset(payload);
              }}
            />
          </ScrollView>

          <Row gap="xs" style={[styles.actionsRow, { borderTopColor: palette.border }]}>
            <Clickable
              accessibilityLabel="Cancel add location"
              onPress={closeAddVenueModal}
              style={[
                styles.actionBtn,
                { borderColor: palette.border, backgroundColor: palette.surface },
              ]}
            >
              <ThemedText style={[styles.actionBtnText, { color: palette.muted }]}>
                Cancel
              </ThemedText>
            </Clickable>
            <Clickable
              accessibilityLabel="Use location"
              onPress={handleConfirmAddVenue}
              disabled={!canConfirmLocation}
              style={[
                styles.actionBtn,
                {
                  borderColor: canConfirmLocation ? palette.tint : palette.border,
                  backgroundColor: canConfirmLocation ? palette.tint : palette.surface,
                  opacity: canConfirmLocation ? 1 : 0.6,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.actionBtnText,
                  { color: canConfirmLocation ? palette.onPrimary : palette.muted },
                ]}
              >
                Use Location
              </ThemedText>
            </Clickable>
          </Row>
        </View>
      </Modal>
    </>
  );
}

export const DayEditorVenueSection = memo(DayEditorVenueSectionInner);

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsScroll: { gap: Spacing.xs, paddingVertical: Spacing.micro },
  chip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: { ...Typography.smallSemiBold },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  actionsRow: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    ...Typography.bodySmallSemiBold,
  },
});
