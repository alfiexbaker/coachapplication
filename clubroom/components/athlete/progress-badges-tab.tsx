/**
 * ProgressBadgesTab — Badge summary card with category breakdown + badge list.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { formatShortDateWithYear } from '@/utils/format';
import { getBadgeColor, getBadgeIcon, getTierColor } from '@/hooks/use-athlete-progress';
import type { BadgeAward } from '@/constants/types';
import { Row } from '@/components/primitives';

interface ProgressBadgesTabProps {
  awards: BadgeAward[];
}

function ProgressBadgesTabInner({ awards }: ProgressBadgesTabProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {/* Summary Card */}
      <SurfaceCard style={styles.summaryCard}>
        <Row style={styles.summaryHeader}>
          <View style={[styles.summaryIcon, { backgroundColor: withAlpha(palette.tint, 0.07) }]}>
            <Ionicons name="ribbon" size={28} color={palette.tint} />
          </View>
          <View style={styles.summaryInfo}>
            <ThemedText type="heading" style={styles.summaryCount}>
              {awards.length}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>
              Total Badges Earned
            </ThemedText>
          </View>
        </Row>

        <Row style={styles.categoryRow}>
          {[
            {
              label: 'Leadership',
              count: awards.filter((a) => a.badgeCategory === 'leadership').length,
              color: palette.premium,
            },
            {
              label: 'Technique',
              count: awards.filter((a) => a.badgeCategory === 'technique').length,
              color: palette.success,
            },
            {
              label: 'Mindset',
              count: awards.filter((a) => a.badgeCategory === 'mindset').length,
              color: palette.warning,
            },
          ].map((cat) => (
            <Row key={cat.label} style={styles.categoryItem}>
              <View style={[styles.categoryDot, { backgroundColor: cat.color }]} />
              <ThemedText style={[styles.categoryText, { color: palette.muted }]}>
                {cat.label}:{' '}
                <ThemedText style={{ fontWeight: '600', color: palette.text }}>
                  {cat.count}
                </ThemedText>
              </ThemedText>
            </Row>
          ))}
        </Row>
      </SurfaceCard>

      {/* Badge List */}
      {awards.length === 0 ? (
        <EmptyMetrics
          icon="ribbon-outline"
          title="No Badges Yet"
          description="Complete training sessions and achieve milestones to earn badges from your coaches"
        />
      ) : (
        <View style={styles.list}>
          {awards.map((award, index) => (
            <Animated.View key={award.id} entering={FadeInRight.delay(index * 50).springify()}>
              <SurfaceCard style={styles.badgeCard}>
                <View
                  style={[
                    styles.badgeIcon,
                    { backgroundColor: withAlpha(getBadgeColor(award.badgeCategory), 0.09) },
                  ]}
                >
                  <Ionicons
                    name={getBadgeIcon(award.badgeCategory)}
                    size={24}
                    color={getBadgeColor(award.badgeCategory)}
                  />
                  {award.badgeTier && (
                    <View
                      style={[
                        styles.tierIndicator,
                        { backgroundColor: getTierColor(award.badgeTier) },
                      ]}
                    >
                      <ThemedText style={[styles.tierText, { color: palette.onPrimary }]}>
                        {award.badgeTier}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <View style={styles.badgeContent}>
                  <ThemedText type="defaultSemiBold" style={styles.badgeLabel}>
                    {award.badgeLabel}
                  </ThemedText>
                  <ThemedText style={[styles.badgeReason, { color: palette.muted }]}>
                    {award.reason}
                  </ThemedText>
                  <Row style={styles.badgeMeta}>
                    <ThemedText style={[styles.badgeDate, { color: palette.muted }]}>
                      {formatShortDateWithYear(award.awardedAt)}
                    </ThemedText>
                    {award.coachId && (
                      <ThemedText style={[styles.badgeCoach, { color: palette.muted }]}>
                        from {award.coachId}
                      </ThemedText>
                    )}
                  </Row>
                </View>
              </SurfaceCard>
            </Animated.View>
          ))}
        </View>
      )}
    </Animated.View>
  );
}

export const ProgressBadgesTab = memo(ProgressBadgesTabInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  summaryCard: { padding: Spacing.md, gap: Spacing.md },
  summaryHeader: { alignItems: 'center', gap: Spacing.md },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: { gap: Spacing.micro },
  summaryCount: { ...Typography.display },
  summaryLabel: { ...Typography.caption },
  categoryRow: { flexWrap: 'wrap', gap: Spacing.md },
  categoryItem: { alignItems: 'center', gap: Spacing.xxs },
  categoryDot: { width: 8, height: 8, borderRadius: Radii.xs },
  categoryText: { ...Typography.caption },
  list: { gap: Spacing.sm },
  badgeCard: { padding: Spacing.md, gap: Spacing.md },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tierIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierText: { ...Typography.micro },
  badgeContent: { flex: 1, gap: Spacing.xxs },
  badgeLabel: { ...Typography.bodySmall },
  badgeReason: { ...Typography.caption },
  badgeMeta: { gap: Spacing.sm, marginTop: Spacing.micro },
  badgeDate: { ...Typography.caption },
  badgeCoach: { ...Typography.caption },
});
