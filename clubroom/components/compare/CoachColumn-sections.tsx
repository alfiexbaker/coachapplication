/**
 * Extracted sub-components for CoachColumn.
 *
 * formatPrice, formatAvailability — display helpers.
 * ValueCell — comparison value cell with "Best" badge.
 * CoachProfileSection — avatar + name + location.
 * TagsCell — specialties/formats/languages display.
 * BookButton — book session CTA.
 */

import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatPrice(min: number, max: number): string {
  if (min === max) return `$${min}`;
  return `$${min}-$${max}`;
}

export function formatAvailability(nextSlot: string | null): string {
  if (!nextSlot) return 'Not available';
  const date = new Date(nextSlot);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `In ${diffDays} days`;
  return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

// ─── ValueCell ───────────────────────────────────────────────────────────────

interface ValueCellProps {
  label: string;
  value: string | number;
  isBest?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  suffix?: string;
  palette: ThemeColors;
}

export const ValueCell = memo(function ValueCell({
  label,
  value,
  isBest,
  icon,
  suffix,
  palette,
}: ValueCellProps) {
  return (
    <View style={[styles.cell, isBest ? { backgroundColor: withAlpha(palette.success, 0.06) } : undefined]}>
      <View style={styles.cellHeader}>
        {icon && <Ionicons name={icon} size={14} color={palette.muted} />}
        <ThemedText style={[styles.cellLabel, { color: palette.muted }]}>{label}</ThemedText>
        {isBest && (
          <View style={[styles.bestBadge, { backgroundColor: palette.success }]}>
            <ThemedText style={[styles.bestText, { color: palette.onPrimary }]}>Best</ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={styles.cellValue}>
        {value}
        {suffix && <ThemedText style={[styles.cellSuffix, { color: palette.muted }]}> {suffix}</ThemedText>}
      </ThemedText>
    </View>
  );
});

// ─── CoachProfileSection ─────────────────────────────────────────────────────

interface CoachProfileSectionProps {
  name: string;
  avatar: string;
  distanceMiles: number;
  onPress: () => void;
  palette: ThemeColors;
}

export const CoachProfileSection = memo(function CoachProfileSection({
  name,
  avatar,
  distanceMiles,
  onPress,
  palette,
}: CoachProfileSectionProps) {
  return (
    <Pressable onPress={onPress} style={styles.profileSection}>
      <Image
        source={{ uri: avatar }}
        style={styles.avatar}
        contentFit="cover"
      />
      <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.name}>
        {name}
      </ThemedText>
      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={12} color={palette.muted} />
        <ThemedText style={[styles.location, { color: palette.muted }]}>
          {distanceMiles.toFixed(1)} mi
        </ThemedText>
      </View>
    </Pressable>
  );
});

// ─── TagsCell ────────────────────────────────────────────────────────────────

interface TagsCellProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tags: string[];
  palette: ThemeColors;
  maxTags?: number;
}

export const TagsCell = memo(function TagsCell({
  label,
  icon,
  tags,
  palette,
  maxTags,
}: TagsCellProps) {
  const displayTags = maxTags ? tags.slice(0, maxTags) : tags;

  return (
    <View style={styles.cell}>
      <View style={styles.cellHeader}>
        <Ionicons name={icon} size={14} color={palette.muted} />
        <ThemedText style={[styles.cellLabel, { color: palette.muted }]}>{label}</ThemedText>
      </View>
      <View style={styles.tags}>
        {displayTags.map((tag) => (
          <View
            key={tag}
            style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}
          >
            <ThemedText style={[styles.tagText, { color: palette.text }]}>{tag}</ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── BookButton ──────────────────────────────────────────────────────────────

interface BookButtonProps {
  name: string;
  onPress: () => void;
  palette: ThemeColors;
}

export const BookButton = memo(function BookButton({
  name,
  onPress,
  palette,
}: BookButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Book session with ${name}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bookButton,
        { backgroundColor: pressed ? palette.tintPressed : palette.tint },
      ]}
    >
      <Ionicons name="calendar" size={18} color={palette.onPrimary} />
      <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>Book Session</ThemedText>
    </Pressable>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  column: {
    flex: 1,
    minWidth: 160,
    maxWidth: 200,
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.xs,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  avatar: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    marginBottom: Spacing.xs,
  },
  name: { ...Typography.body, textAlign: 'center' },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginTop: Spacing.micro,
  },
  location: { ...Typography.caption },
  values: {
    flex: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  cell: {
    padding: Spacing.xs,
    borderRadius: Radii.sm,
  },
  cellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    marginBottom: Spacing.xxs,
  },
  cellLabel: { ...Typography.caption, flex: 1 },
  cellValue: { ...Typography.bodySemiBold },
  cellSuffix: { ...Typography.caption },
  bestBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  bestText: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xxs,
  },
  tag: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  tagText: { ...Typography.caption },
  languagesText: { ...Typography.small },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    margin: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radii.button,
  },
  bookButtonText: { ...Typography.bodySmallSemiBold },
});
