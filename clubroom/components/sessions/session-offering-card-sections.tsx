import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── SessionTypeBadge ───────────────────────────────────────────

export interface SessionTypeBadgeProps {
  sessionType: string;
  palette: ThemeColors;
}

export const SessionTypeBadge = memo(function SessionTypeBadge({
  sessionType,
  palette,
}: SessionTypeBadgeProps) {
  if (sessionType === 'group') {
    return (
      <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
        <Ionicons name="people" size={12} color={palette.accent} />
        <ThemedText style={[styles.typeBadgeText, { color: palette.accent }]}>Group</ThemedText>
      </View>
    );
  }
  if (sessionType === '1on1') {
    return (
      <View style={[styles.typeBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name="person" size={12} color={palette.tint} />
        <ThemedText style={[styles.typeBadgeText, { color: palette.tint }]}>1:1</ThemedText>
      </View>
    );
  }
  return null;
});

// ─── SessionFooterBadges ────────────────────────────────────────

export interface SessionFooterBadgesProps {
  ageMin?: number;
  ageMax?: number;
  sessionType: string;
  isFull: boolean;
  showCapacity: boolean;
  showCoach: boolean;
  capacityText: string;
  registeredCount: number;
  maxParticipants: number;
  priceUsd?: number;
  palette: ThemeColors;
}

export const SessionFooterBadges = memo(function SessionFooterBadges({
  ageMin,
  ageMax,
  sessionType,
  isFull,
  showCapacity,
  showCoach,
  capacityText,
  registeredCount,
  maxParticipants,
  priceUsd,
  palette,
}: SessionFooterBadgesProps) {
  return (
    <View style={styles.footer}>
      {ageMin && ageMax && (
        <View style={[styles.ageBadge, { backgroundColor: palette.border }]}>
          <ThemedText style={styles.ageText}>Ages {ageMin}-{ageMax}</ThemedText>
        </View>
      )}
      {showCapacity && sessionType === 'group' && (
        <View style={[styles.capacityBadge, {
          backgroundColor: isFull ? withAlpha(palette.error, 0.09) : withAlpha(palette.success, 0.09),
        }]}>
          <ThemedText style={[styles.capacityText, { color: isFull ? palette.error : palette.success }]}>
            {isFull ? 'FULL' : showCoach
              ? `${registeredCount} attending · ${maxParticipants - registeredCount} left`
              : `${capacityText} spots`}
          </ThemedText>
        </View>
      )}
      {priceUsd !== undefined && priceUsd > 0 && (
        <View style={styles.priceContainer}>
          <ThemedText style={styles.priceText}>£{priceUsd}</ThemedText>
        </View>
      )}
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  ageBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  ageText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  capacityBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  capacityText: {
    fontSize: scaleFont(13),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  priceContainer: {
    marginLeft: 'auto',
  },
  priceText: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
