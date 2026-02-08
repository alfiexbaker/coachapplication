/**
 * Cancellation Policy Card
 *
 * Collapsible card showing a coach's cancellation policy tiers.
 * Each tier is shown with a colored dot indicating refund level:
 * - Green dot for 100% refund
 * - Amber dot for partial refund
 * - Red dot for 0% refund
 *
 * Uses LayoutAnimation for expand/collapse.
 */

import { useState } from 'react';
import { View, StyleSheet, LayoutAnimation, UIManager, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { CancellationPolicy } from '@/constants/types';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CancellationPolicyCardProps {
  coachId: string;
  policy?: CancellationPolicy;
}

function getDotColor(refundPercentage: number, palette: typeof Colors.light): string {
  if (refundPercentage >= 100) return palette.success;
  if (refundPercentage > 0) return palette.warning;
  return palette.error;
}

export function CancellationPolicyCard({ coachId: _coachId, policy }: CancellationPolicyCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [expanded, setExpanded] = useState(false);

  if (!policy) {
    return null;
  }

  const handleToggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
  };

  // Sort tiers from highest refund to lowest
  const sortedTiers = [...policy.tiers].sort(
    (a, b) => b.refundPercentage - a.refundPercentage,
  );

  return (
    <View style={[styles.card, { borderColor: palette.border }]}>
      <Clickable onPress={handleToggle} style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.muted} />
          <ThemedText style={styles.headerTitle}>Cancellation Policy</ThemedText>
        </View>
        <View style={styles.headerRight}>
          <ThemedText style={[styles.policyName, { color: palette.muted }]}>
            {policy.name}
          </ThemedText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={palette.muted}
          />
        </View>
      </Clickable>

      {expanded && (
        <View style={styles.tiers}>
          {sortedTiers.map((tier, index) => (
            <View key={index} style={styles.tierRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: getDotColor(tier.refundPercentage, palette) },
                ]}
              />
              <View style={styles.tierContent}>
                <ThemedText style={[styles.tierPercentage, { color: palette.text }]}>
                  {tier.refundPercentage}% refund
                </ThemedText>
                <ThemedText style={[styles.tierDescription, { color: palette.muted }]}>
                  {tier.description}
                </ThemedText>
              </View>
            </View>
          ))}

          {!policy.allowCancellations && (
            <View style={[styles.noCancelBanner, { backgroundColor: withAlpha(palette.error, 0.06) }]}>
              <Ionicons name="information-circle-outline" size={16} color={palette.error} />
              <ThemedText style={[styles.noCancelText, { color: palette.error }]}>
                Cancellations not allowed for this coach
              </ThemedText>
            </View>
          )}

          {policy.minimumNoticeHours > 0 && (
            <ThemedText style={[styles.noticeText, { color: palette.muted }]}>
              Minimum {policy.minimumNoticeHours}h notice required
            </ThemedText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerTitle: {
    ...Typography.bodySmallSemiBold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  policyName: {
    ...Typography.caption,
  },
  tiers: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: Radii.sm,
    marginTop: Spacing.xxs,
  },
  tierContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  tierPercentage: {
    ...Typography.bodySmallSemiBold,
  },
  tierDescription: {
    ...Typography.caption,
  },
  noCancelBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  noCancelText: {
    ...Typography.bodySmall,
    flex: 1,
  },
  noticeText: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
});
