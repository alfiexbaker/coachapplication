/**
 * Extracted sub-components for SessionJournal.
 *
 * MoodSelector — row of 5 mood face options.
 * StarRating — 1-5 star energy rating.
 * JournalTimelineEntry — single past journal entry card.
 * MOOD_OPTIONS — mood configuration.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JournalEntry {
  id: string;
  sessionId: string;
  athleteId: string;
  coachNotes?: string;
  personalNotes: string;
  mood: number;
  energyLevel: number;
  createdAt: string;
}

type MoodOption = {
  value: number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const MOOD_OPTIONS: MoodOption[] = [
  { value: 1, label: 'Awful', icon: 'sad-outline' },
  { value: 2, label: 'Meh', icon: 'sad' },
  { value: 3, label: 'OK', icon: 'happy-outline' },
  { value: 4, label: 'Good', icon: 'happy' },
  { value: 5, label: 'Great', icon: 'heart-circle-outline' },
];

// ─── MoodSelector ─────────────────────────────────────────────────────────────

interface MoodSelectorProps {
  selected: number;
  onSelect: (v: number) => void;
  palette: ThemeColors;
}

export const MoodSelector = memo(function MoodSelector({
  selected,
  onSelect,
  palette,
}: MoodSelectorProps) {
  return (
    <Row style={styles.moodRow}>
      {MOOD_OPTIONS.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <Clickable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            accessibilityLabel={opt.label}
          >
            <View
              style={[
                styles.moodItem,
                {
                  backgroundColor: isActive ? palette.tint : palette.surfaceSecondary,
                },
              ]}
            >
              <Ionicons
                name={opt.icon}
                size={Components.icon.lg}
                color={isActive ? palette.surface : palette.muted}
              />
              <ThemedText
                style={[styles.moodLabel, { color: isActive ? palette.surface : palette.muted }]}
              >
                {opt.label}
              </ThemedText>
            </View>
          </Clickable>
        );
      })}
    </Row>
  );
});

// ─── StarRating ───────────────────────────────────────────────────────────────

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  palette: ThemeColors;
}

export const StarRating = memo(function StarRating({ value, onChange, palette }: StarRatingProps) {
  return (
    <Row style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Clickable
          key={star}
          onPress={() => onChange(star)}
          accessibilityLabel={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={Components.icon.xl}
            color={star <= value ? palette.warning : palette.muted}
          />
        </Clickable>
      ))}
    </Row>
  );
});

// ─── JournalTimelineEntry ─────────────────────────────────────────────────────

interface JournalTimelineEntryProps {
  entry: JournalEntry;
  palette: ThemeColors;
}

export const JournalTimelineEntry = memo(function JournalTimelineEntry({
  entry,
  palette,
}: JournalTimelineEntryProps) {
  const moodOpt = MOOD_OPTIONS.find((m) => m.value === entry.mood) ?? MOOD_OPTIONS[2];
  const entryDate = new Date(entry.createdAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Row style={styles.timelineItem}>
      <View style={[styles.timelineDot, { backgroundColor: palette.tint }]} />
      <SurfaceCard style={styles.timelineCard}>
        <Row style={styles.timelineHeader}>
          <ThemedText style={[styles.timelineDate, { color: palette.muted }]}>
            {entryDate}
          </ThemedText>
          <Row style={styles.timelineIcons}>
            <Ionicons name={moodOpt.icon} size={Components.icon.sm} color={palette.muted} />
            <Row style={styles.miniStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= entry.energyLevel ? 'star' : 'star-outline'}
                  size={10}
                  color={s <= entry.energyLevel ? palette.warning : palette.muted}
                />
              ))}
            </Row>
          </Row>
        </Row>
        <ThemedText style={[styles.timelineText, { color: palette.foreground }]} numberOfLines={3}>
          {entry.personalNotes}
        </ThemedText>
      </SurfaceCard>
    </Row>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  moodRow: {
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  moodItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radii.md,
    minWidth: 56,
    gap: Spacing.xs / 2,
  },
  moodLabel: { ...Typography.micro },
  starRow: { gap: Spacing.xs },
  timelineItem: { gap: Spacing.sm },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
    marginTop: Spacing.sm,
  },
  timelineCard: { flex: 1, gap: Spacing.xs },
  timelineHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineDate: { ...Typography.caption },
  timelineIcons: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  miniStars: { gap: 1 },
  timelineText: { ...Typography.body },
});
