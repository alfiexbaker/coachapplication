/**
 * DayEditorVenueSection — Venue chips with add-new-venue input.
 */
import { memo } from 'react';
import { View, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha, Components } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CoachVenue } from '@/constants/types';
import { Row } from '@/components/primitives';

interface DayEditorVenueSectionProps {
  venues: CoachVenue[];
  location: string;
  showAddVenueInput: boolean;
  newVenueLabel: string;
  onSelectVenue: (label: string) => void;
  onToggleAddInput: () => void;
  onNewVenueLabelChange: (label: string) => void;
  onAddVenue: () => void;
}

function DayEditorVenueSectionInner({
  venues, location, showAddVenueInput, newVenueLabel,
  onSelectVenue, onToggleAddInput, onNewVenueLabelChange, onAddVenue,
}: DayEditorVenueSectionProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Location</ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
        {venues.map((v) => {
          const isSelected = location === v.label;
          return (
            <Clickable
              key={v.id}
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectVenue(isSelected ? '' : v.label);
              }}
              accessibilityLabel={`Venue: ${v.label}`}
              style={[styles.chip, { backgroundColor: isSelected ? withAlpha(palette.tint, 0.12) : palette.background, borderColor: isSelected ? palette.tint : palette.border }]}
            >
              {v.icon && <Ionicons name={(v.icon as keyof typeof Ionicons.glyphMap) || 'location-outline'} size={14} color={isSelected ? palette.tint : palette.muted} />}
              <ThemedText style={[styles.chipText, { color: isSelected ? palette.tint : palette.text }]} numberOfLines={1}>{v.label}</ThemedText>
            </Clickable>
          );
        })}
        <Clickable onPress={onToggleAddInput} accessibilityLabel="Add new venue" style={[styles.chip, { backgroundColor: showAddVenueInput ? withAlpha(palette.tint, 0.12) : palette.background, borderColor: showAddVenueInput ? palette.tint : palette.border }]}>
          <Ionicons name="add" size={14} color={showAddVenueInput ? palette.tint : palette.muted} />
          <ThemedText style={[styles.chipText, { color: showAddVenueInput ? palette.tint : palette.muted }]}>Add</ThemedText>
        </Clickable>
      </ScrollView>
      {showAddVenueInput && (
        <Row style={[styles.addRow, { borderColor: palette.border, backgroundColor: palette.background }]}>
          <Ionicons name="location-outline" size={16} color={palette.muted} />
          <TextInput style={[styles.addInput, { color: palette.text }]} placeholder="New venue name" placeholderTextColor={palette.muted} value={newVenueLabel} onChangeText={onNewVenueLabelChange} onSubmitEditing={onAddVenue} autoFocus returnKeyType="done" />
          <Clickable onPress={onAddVenue} style={[styles.addBtn, { backgroundColor: palette.tint }]} accessibilityLabel="Confirm add venue">
            <Ionicons name="checkmark" size={16} color={palette.onPrimary} />
          </Clickable>
        </Row>
      )}
    </View>
  );
}

export const DayEditorVenueSection = memo(DayEditorVenueSectionInner);

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipsScroll: { gap: Spacing.xs, paddingVertical: Spacing.micro },
  chip: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, minHeight: 44, borderRadius: Radii.pill, borderWidth: 1 },
  chipText: { ...Typography.smallSemiBold },
  addRow: { alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radii.md, borderWidth: 1 },
  addInput: { flex: 1, ...Typography.body, padding: 0, minHeight: 44 },
  addBtn: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
});
