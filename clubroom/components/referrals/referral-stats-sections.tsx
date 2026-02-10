/**
 * Extracted sub-components for ReferralStats.
 *
 * StatItem — horizontal variant stat (icon + value + label).
 * CompactStatItem — compact inline stat row.
 * StatCard — default card variant with icon bg + description.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';

// ─── StatItem (horizontal variant) ──────────────────────────────────────────

interface StatItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  value: string;
  label: string;
  palette: ThemeColors;
}

export const StatItem = memo(function StatItem({
  icon,
  iconColor,
  value,
  label,
  palette,
}: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <ThemedText type="title" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.statLabel, { color: palette.muted }]}>
        {label}
      </ThemedText>
    </View>
  );
});

// ─── CompactStatItem ─────────────────────────────────────────────────────────

export const CompactStatItem = memo(function CompactStatItem({
  icon,
  iconColor,
  value,
  label,
  palette,
}: StatItemProps) {
  return (
    <Row align="center" gap="xxs">
      <Ionicons name={icon} size={16} color={iconColor} />
      <ThemedText type="defaultSemiBold" style={styles.compactValue}>
        {value}
      </ThemedText>
      <ThemedText style={[styles.compactLabel, { color: palette.muted }]}>
        {label}
      </ThemedText>
    </Row>
  );
});

// ─── StatCard (default variant) ──────────────────────────────────────────────

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  value: string;
  label: string;
  description: string;
  palette: ThemeColors;
  flex?: boolean;
}

export const StatCard = memo(function StatCard({
  icon,
  iconColor,
  iconBgColor,
  value,
  label,
  description,
  palette,
  flex,
}: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: palette.background }, flex ? styles.flexCard : undefined]}>
      <View style={[styles.statCardIcon, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.statCardContent}>
        <ThemedText type="title" style={styles.statCardValue}>
          {value}
        </ThemedText>
        <ThemedText type="defaultSemiBold" style={styles.statCardLabel}>
          {label}
        </ThemedText>
        <ThemedText style={[styles.statCardDescription, { color: palette.muted }]}>
          {description}
        </ThemedText>
      </View>
    </View>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  horizontalCard: {
    padding: Spacing.md,
  },
  horizontalRow: {
    // flexDirection/alignItems/justifyContent moved to Row props
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
    flex: 1,
  },
  statValue: {
    fontSize: scaleFont(22),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(12),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compactRow: {
    // layout moved to Row props
  },
  compactStatItem: {
    // layout moved to Row props
  },
  compactValue: {
    fontSize: scaleFont(15),
  },
  compactLabel: {
    fontSize: scaleFont(13),
  },
  defaultGrid: {
    gap: Spacing.sm,
  },
  defaultRow: {
    // layout moved to Row props
  },
  statCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.sm,
  },
  flexCard: {
    flex: 1,
  },
  statCardIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statCardContent: {
    gap: Spacing.micro,
  },
  statCardValue: {
    fontSize: scaleFont(28),
    fontWeight: '700',
  },
  statCardLabel: {
    fontSize: scaleFont(14),
  },
  statCardDescription: {
    fontSize: scaleFont(12),
  },
});
