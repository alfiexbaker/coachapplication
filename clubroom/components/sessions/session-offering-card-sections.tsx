import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
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
      <Row
        align="center"
        gap="xxs"
        style={[styles.typeBadge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}
      >
        <Ionicons name="people" size={12} color={palette.accent} />
        <ThemedText style={[styles.typeBadgeText, { color: palette.accent }]}>Group</ThemedText>
      </Row>
    );
  }
  if (sessionType === '1on1') {
    return (
      <Row
        align="center"
        gap="xxs"
        style={[styles.typeBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
      >
        <Ionicons name="person" size={12} color={palette.tint} />
        <ThemedText style={[styles.typeBadgeText, { color: palette.tint }]}>1:1</ThemedText>
      </Row>
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
  price?: number;
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
  price,
  palette,
}: SessionFooterBadgesProps) {
  return (
    <Row wrap align="center" gap={8} style={styles.footer}>
      {ageMin && ageMax && (
        <View style={[styles.ageBadge, { backgroundColor: palette.border }]}>
          <ThemedText style={styles.ageText}>
            Ages {ageMin}-{ageMax}
          </ThemedText>
        </View>
      )}
      {showCapacity && sessionType === 'group' && (
        <View
          style={[
            styles.capacityBadge,
            {
              backgroundColor: isFull
                ? withAlpha(palette.error, 0.09)
                : withAlpha(palette.success, 0.09),
            },
          ]}
        >
          <ThemedText
            style={[styles.capacityText, { color: isFull ? palette.error : palette.success }]}
          >
            {isFull ? 'Full' : `${capacityText} spots`}
          </ThemedText>
        </View>
      )}
      {price !== undefined && price > 0 && (
        <View style={styles.priceContainer}>
          <ThemedText style={styles.priceText}>£{price}</ThemedText>
        </View>
      )}
    </Row>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  typeBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    letterSpacing: 0.15,
  },
  footer: {
    marginTop: Spacing.xxs,
  },
  ageBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  ageText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  capacityBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  capacityText: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  priceContainer: {
    marginLeft: 'auto',
  },
  priceText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
