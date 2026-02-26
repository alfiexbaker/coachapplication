import { memo } from 'react';
import { View, StyleSheet, ScrollView, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export const LOCATION_OPTIONS: {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'hyde_park', label: 'Hyde Park', icon: 'leaf-outline' },
  { id: 'victoria_park', label: 'Victoria Park', icon: 'leaf-outline' },
  { id: 'london_fields', label: 'London Fields', icon: 'leaf-outline' },
  { id: 'indoor', label: 'Indoor Facility', icon: 'business-outline' },
  { id: 'online', label: 'Online', icon: 'videocam-outline' },
  { id: 'custom', label: 'Custom', icon: 'create-outline' },
];

export interface LocationPickerProps {
  location: string;
  showCustomInput: boolean;
  onLocationChange: (location: string) => void;
  onShowCustomInput: (show: boolean) => void;
  palette: ThemeColors;
}

export const LocationPicker = memo(function LocationPicker({
  location,
  showCustomInput,
  onLocationChange,
  onShowCustomInput,
  palette,
}: LocationPickerProps) {
  return (
    <View style={styles.locationSection}>
      <ThemedText style={[styles.locationLabel, { color: palette.text }]}>Location</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.locationScroll}>
        <Row style={styles.locationChipsRow}>
          {LOCATION_OPTIONS.map((opt) => {
            const isCustom = opt.id === 'custom';
            const isSelected = isCustom ? showCustomInput : location === opt.label;
            return (
              <Clickable
                key={opt.id}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  if (isCustom) {
                    onShowCustomInput(true);
                    onLocationChange('');
                  } else {
                    onShowCustomInput(false);
                    onLocationChange(isSelected ? '' : opt.label);
                  }
                }}
                style={[
                  styles.locationChip,
                  {
                    backgroundColor: isSelected
                      ? withAlpha(palette.tint, 0.09)
                      : palette.background,
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <Ionicons
                  name={opt.icon}
                  size={14}
                  color={isSelected ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    styles.locationChipText,
                    { color: isSelected ? palette.tint : palette.text },
                  ]}
                >
                  {opt.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
      </ScrollView>
      {showCustomInput && (
        <Row
          style={[
            styles.customInput,
            { borderColor: palette.border, backgroundColor: palette.background },
          ]}
        >
          <Ionicons name="location-outline" size={18} color={palette.muted} />
          <TextInput
            style={[styles.customInputText, { color: palette.text }]}
            placeholder="Enter custom location"
            placeholderTextColor={palette.muted}
            value={location}
            onChangeText={onLocationChange}
            autoFocus

            maxLength={100}
          />
        </Row>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  locationSection: {
    gap: Spacing.sm,
  },
  locationLabel: {
    ...Typography.bodySmallSemiBold,
  },
  locationScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  locationChipsRow: {
    gap: Spacing.xs,
  },
  locationChip: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  locationChipText: {
    ...Typography.smallSemiBold,
  },
  customInput: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  customInputText: {
    flex: 1,
    ...Typography.body,
    padding: 0,
  },
});
