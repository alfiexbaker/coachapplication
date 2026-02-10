/**
 * Extracted sub-components for ReferralHistory.
 *
 * ReferralHistoryItemInner — single referral row with status badge.
 * ReferralHistorySkeletonInner — loading skeleton for referral list.
 * ReferralEmptyState — empty state when no referrals.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { referralService } from '@/services/referral-service';
import { scaleFont } from '@/utils/scale';
import type { Referral } from '@/constants/types';
import type { ThemeColors } from '@/hooks/useTheme';

// ─── ReferralHistoryItemInner ─────────────────────────────────────────────────

interface ReferralHistoryItemInnerProps {
  referral: Referral;
  onPress?: () => void;
  isLast: boolean;
  palette: ThemeColors;
}

export const ReferralHistoryItemInner = memo(function ReferralHistoryItemInner({
  referral,
  onPress,
  isLast,
  palette,
}: ReferralHistoryItemInnerProps) {
  const { label: statusLabel, color: statusColor } = referralService.getStatusInfo(referral.status);
  const formattedDate = referralService.formatDate(referral.createdAt);

  const initials = referral.refereeName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <SurfaceCard
      style={[styles.item, !isLast && styles.itemWithBorder, !isLast && { borderBottomColor: palette.border }]}
      onPress={onPress}
      tactile={Boolean(onPress)}
    >
      <Row align="center" gap="sm">
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {initials}
          </ThemedText>
        </View>

        <View style={styles.itemDetails}>
          <Row align="center" justify="space-between" gap="xs">
            <ThemedText type="defaultSemiBold" style={styles.itemName} numberOfLines={1}>
              {referral.refereeName}
            </ThemedText>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </ThemedText>
            </View>
          </Row>

          <Row gap="md">
            <Row align="center" gap="xxs">
              <Ionicons name="calendar-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {formattedDate}
              </ThemedText>
            </Row>

            {referral.status === 'COMPLETED' && referral.creditAwarded > 0 && (
              <Row align="center" gap="xxs">
                <Ionicons name="wallet-outline" size={12} color={palette.success} />
                <ThemedText style={[styles.metaText, { color: palette.success }]}>
                  +{referralService.formatCredit(referral.creditAwarded)}
                </ThemedText>
              </Row>
            )}

            {referral.status === 'PENDING' && (
              <Row align="center" gap="xxs">
                <Ionicons name="time-outline" size={12} color={palette.warning} />
                <ThemedText style={[styles.metaText, { color: palette.warning }]}>
                  Awaiting first booking
                </ThemedText>
              </Row>
            )}
          </Row>
        </View>

        {onPress && (
          <Ionicons name="chevron-forward" size={18} color={palette.muted} />
        )}
      </Row>
    </SurfaceCard>
  );
});

// ─── ReferralHistorySkeletonInner ─────────────────────────────────────────────

interface ReferralHistorySkeletonInnerProps {
  palette: ThemeColors;
}

export const ReferralHistorySkeletonInner = memo(function ReferralHistorySkeletonInner({
  palette,
}: ReferralHistorySkeletonInnerProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" justify="space-between" style={styles.header}>
        <View style={[styles.skeletonTitle, { backgroundColor: palette.border }]} />
      </Row>
      {[1, 2, 3].map((i) => (
        <View key={i} style={[styles.item, i < 3 && styles.itemWithBorder, i < 3 && { borderBottomColor: palette.border }]}>
          <Row align="center" gap="sm">
            <View style={[styles.avatar, { backgroundColor: palette.border }]} />
            <View style={styles.itemDetails}>
              <View style={[styles.skeletonName, { backgroundColor: palette.border }]} />
              <View style={[styles.skeletonMeta, { backgroundColor: palette.border }]} />
            </View>
          </Row>
        </View>
      ))}
    </SurfaceCard>
  );
});

// ─── ReferralEmptyState ───────────────────────────────────────────────────────

interface ReferralEmptyStateProps {
  palette: ThemeColors;
}

export const ReferralEmptyState = memo(function ReferralEmptyState({
  palette,
}: ReferralEmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
        <Ionicons name="people-outline" size={32} color={palette.muted} />
      </View>
      <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
        No referrals yet
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        Share your referral code with friends to start earning credits!
      </ThemedText>
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  header: {
    marginBottom: Spacing.xs,
  },
  item: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 0,
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
  itemWithBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  itemContent: {
    // layout moved to Row props
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: scaleFont(14), fontWeight: '600' },
  itemDetails: { flex: 1, gap: Spacing.xxs },
  itemHeader: {
    // layout moved to Row props
  },
  itemName: { flex: 1, fontSize: scaleFont(15) },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { fontSize: scaleFont(11), fontWeight: '600', letterSpacing: 0.3 },
  itemMeta: { /* layout moved to Row */ },
  metaItem: { /* layout moved to Row */ },
  metaText: { fontSize: scaleFont(12) },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  emptyTitle: { fontSize: scaleFont(16), fontWeight: '600' },
  emptyText: {
    fontSize: scaleFont(14),
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: scaleFont(20),
  },
  skeletonTitle: { width: 120, height: 20, borderRadius: Radii.sm },
  skeletonName: { width: 140, height: 16, borderRadius: Radii.sm },
  skeletonMeta: {
    width: 100,
    height: 12,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
});
