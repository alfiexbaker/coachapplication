/**
 * Extracted sub-components for AthleteNotesTab.
 *
 * FOCUS_OPTIONS — available football objectives.
 * NoteCard — single note with delete (memo).
 * PrimaryFocusSection — focus badge + picker (accepts palette).
 * NoteSearchBar — search input for notes (accepts palette).
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet, TextInput, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { RosterNote, FootballObjective } from '@/constants/types';

// ─── Constants ───────────────────────────────────────────────────────────────

export const FOCUS_OPTIONS: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

// ─── NoteCard ────────────────────────────────────────────────────────────────

interface NoteCardProps {
  note: RosterNote;
  onDelete: () => void;
  palette: ThemeColors;
}

export const NoteCard = memo(function NoteCard({
  note,
  onDelete,
  palette,
}: NoteCardProps) {
  const handleDelete = useCallback(() => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (Platform.OS !== 'web') {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          }
          onDelete();
        },
      },
    ]);
  }, [onDelete]);

  const date = new Date(note.createdAt);

  return (
    <View style={[styles.noteCard, { backgroundColor: palette.surfaceSecondary }]}>
      <Row gap="sm" align="center" justify="between">
        <ThemedText style={[styles.noteDate, { color: palette.muted }]}>
          {date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </ThemedText>
        <Clickable
          onPress={handleDelete}
          hitSlop={8}
          accessibilityLabel="Delete note"
        >
          <Ionicons name="trash-outline" size={16} color={palette.error} />
        </Clickable>
      </Row>
      <ThemedText style={styles.noteContent}>{note.content}</ThemedText>
    </View>
  );
});

// ─── PrimaryFocusSection ─────────────────────────────────────────────────────

interface PrimaryFocusSectionProps {
  primaryFocus: FootballObjective | undefined;
  showPicker: boolean;
  onTogglePicker: () => void;
  onSelectFocus: (focus: FootballObjective) => void;
  palette: ThemeColors;
}

export const PrimaryFocusSection = memo(function PrimaryFocusSection({
  primaryFocus,
  showPicker,
  onTogglePicker,
  onSelectFocus,
  palette,
}: PrimaryFocusSectionProps) {
  return (
    <SurfaceCard style={styles.section}>
      <Row gap="sm" align="center" justify="between">
        <ThemedText type="defaultSemiBold">Primary Focus</ThemedText>
        <Clickable onPress={onTogglePicker}>
          <ThemedText style={{ color: palette.tint, ...Typography.bodySemiBold }}>
            Change
          </ThemedText>
        </Clickable>
      </Row>

      <View style={[styles.focusBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="football-outline" size={18} color={palette.tint} />
        <ThemedText style={{ color: palette.tint, ...Typography.bodySemiBold }}>
          {primaryFocus ?? 'Not set'}
        </ThemedText>
      </View>

      {showPicker && (
        <Column gap="xs">
          {FOCUS_OPTIONS.map((focus) => (
            <Clickable
              key={focus}
              onPress={() => onSelectFocus(focus)}
              style={primaryFocus === focus
                ? [styles.focusOption, { backgroundColor: withAlpha(palette.tint, 0.09) }]
                : styles.focusOption}
            >
              <ThemedText style={styles.flex1}>{focus}</ThemedText>
              {primaryFocus === focus && (
                <Ionicons name="checkmark" size={20} color={palette.tint} />
              )}
            </Clickable>
          ))}
        </Column>
      )}
    </SurfaceCard>
  );
});

// ─── NoteSearchBar ───────────────────────────────────────────────────────────

interface NoteSearchBarProps {
  searchQuery: string;
  onChangeQuery: (query: string) => void;
  palette: ThemeColors;
}

export const NoteSearchBar = memo(function NoteSearchBar({
  searchQuery,
  onChangeQuery,
  palette,
}: NoteSearchBarProps) {
  return (
    <View style={[styles.searchContainer, { backgroundColor: palette.background }]}>
      <Ionicons name="search" size={16} color={palette.muted} />
      <TextInput
        style={[styles.searchInput, { color: palette.text }]}
        placeholder="Search notes..."
        placeholderTextColor={palette.muted}
        value={searchQuery}
        onChangeText={onChangeQuery}
        accessibilityLabel="Search notes"
      />
      {searchQuery.length > 0 && (
        <Clickable accessibilityLabel="Clear search" onPress={() => onChangeQuery('')}>
          <Ionicons name="close-circle" size={16} color={palette.muted} />
        </Clickable>
      )}
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  flex1: { flex: 1 },
  section: {
    gap: Spacing.sm,
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  focusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 44,
  },
  input: {
    ...Typography.bodySmall,
    minHeight: 80,
    borderRadius: Radii.md,
    padding: Spacing.md,
    textAlignVertical: 'top',
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
  },
  searchInput: {
    flex: 1,
    ...Typography.bodySmall,
    paddingVertical: Spacing.xxs,
  },
  noteCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.xs,
  },
  noteDate: {
    ...Typography.caption,
  },
  noteContent: {
    ...Typography.bodySmall,
    lineHeight: 20,
  },
  emptyNotes: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.small,
    textAlign: 'center',
    lineHeight: 18,
  },
});
