import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getTierColour } from '@/hooks/use-booking-cancel';
import type { CancellationPolicy, RefundCalculation, RefundTier } from '@/constants/types';
import { Row } from '@/components/primitives';

interface CancelPolicyTiersProps {
  policy: CancellationPolicy;
  sortedTiers: RefundTier[];
  refundCalc: RefundCalculation | null;
}

export const CancelPolicyTiers = function CancelPolicyTiers({
  policy,
  sortedTiers,
  refundCalc,
}: CancelPolicyTiersProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.header}>
        <Ionicons name="document-text-outline" size={20} color={palette.tint} />
        <ThemedText type="defaultSemiBold">Cancellation Policy</ThemedText>
        <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.badgeText, { color: palette.tint }]}>{policy.name}</ThemedText>
        </View>
      </Row>

      <View style={styles.tiers}>
        {sortedTiers.map((tier, index) => {
          const isActive = refundCalc?.appliedTier === tier;
          const tierColor = getTierColour(tier, palette);

          return (
            <View
              key={`${tier.hoursBeforeSession}:${tier.refundPercentage}:${tier.description}`}
              style={styles.tierContainer}
            >
              {index > 0 && (
                <View style={[styles.connector, { backgroundColor: palette.border }]} />
              )}
              <View
                style={[
                  styles.tierRow,
                  isActive && {
                    backgroundColor: withAlpha(tierColor, 0.06),
                    borderRadius: Radii.sm,
                    marginHorizontal: -Spacing.xs,
                    paddingHorizontal: Spacing.xs,
                  },
                ]}
              >
                <View
                  style={[styles.dot, { backgroundColor: tierColor }, isActive && styles.dotActive]}
                />
                <View style={styles.tierContent}>
                  <Row style={styles.tierTopRow}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.tierPercent, { color: tierColor }]}
                    >
                      {tier.refundPercentage}% refund
                    </ThemedText>
                    {isActive && (
                      <View style={[styles.activeBadge, { backgroundColor: tierColor }]}>
                        <ThemedText style={[styles.activeText, { color: palette.onPrimary }]}>
                          Current
                        </ThemedText>
                      </View>
                    )}
                  </Row>
                  <ThemedText style={[styles.tierDesc, { color: palette.muted }]}>
                    {tier.description}
                  </ThemedText>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  header: { alignItems: 'center', gap: Spacing.sm },
  badge: {
    marginLeft: 'auto',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  badgeText: { ...Typography.caption },
  tiers: { marginTop: Spacing.xs },
  tierContainer: { position: 'relative' },
  connector: { position: 'absolute', left: 11, top: -6, width: 2, height: 12 },
  tierRow: { alignItems: 'flex-start', gap: Spacing.sm, paddingVertical: Spacing.xs },
  dot: { width: 10, height: 10, borderRadius: Radii.sm, marginTop: 5 },
  dotActive: {
    width: 14,
    height: 14,
    borderRadius: Radii.sm,
    marginTop: Spacing.micro,
    marginLeft: -2,
    marginRight: -2,
  },
  tierContent: { flex: 1 },
  tierTopRow: { alignItems: 'center', gap: Spacing.xs },
  tierPercent: { ...Typography.bodySmall },
  activeBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.xs,
  },
  activeText: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  tierDesc: {
    ...Typography.caption,
    marginTop: Spacing.micro,
    lineHeight: Typography.micro.lineHeight,
  },
});
