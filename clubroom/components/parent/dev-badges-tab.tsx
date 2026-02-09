/**
 * DevBadgesTab — Shared badges + full badge log.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { EmptyMetrics } from '@/components/analytics/enhanced-stats';
import { formatDate } from '@/constants/mock-data';
import { getBadgeColor, getBadgeIcon } from '@/hooks/use-parent-development';
import type { BadgeAward } from '@/constants/types';

interface DevBadgesTabProps {
  awards: BadgeAward[];
  sharedBadges: BadgeAward[];
  coachOnlyCount: number;
  selectedChildId: string | undefined;
}

function DevBadgesTabInner({ awards, sharedBadges, coachOnlyCount, selectedChildId }: DevBadgesTabProps) {
  const { colors: palette } = useTheme();

  const handleViewAll = useCallback(() => {
    if (selectedChildId) router.push(Routes.childBadges(selectedChildId));
  }, [selectedChildId]);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {/* Shared Badges */}
      {sharedBadges.length > 0 && (
        <SurfaceCard style={styles.sharedCard}>
          <View style={styles.sharedHeader}>
            <View style={[styles.headerIcon, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
              <Ionicons name="share" size={16} color={palette.success} />
            </View>
            <View style={styles.headerContent}>
              <ThemedText type="defaultSemiBold">Shared With You</ThemedText>
              <ThemedText style={[styles.hint, { color: palette.muted }]}>Badges coaches wanted you to see</ThemedText>
            </View>
          </View>
          <View style={styles.sharedList}>
            {sharedBadges.map((award, index) => (
              <Animated.View
                key={award.id}
                entering={FadeInRight.delay(index * 50).springify()}
                style={[styles.sharedBadge, { borderColor: palette.border }]}
              >
                <View style={[styles.badgeIcon, { backgroundColor: withAlpha(getBadgeColor(award.badgeCategory, palette), 0.09) }]}>
                  <Ionicons name={getBadgeIcon(award.badgeCategory) as keyof typeof Ionicons.glyphMap} size={20} color={getBadgeColor(award.badgeCategory, palette)} />
                </View>
                <View style={styles.badgeContent}>
                  <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                  <ThemedText style={[styles.reason, { color: palette.muted }]}>{award.reason}</ThemedText>
                  {award.note && (
                    <ThemedText style={[styles.note, { color: palette.text }]} numberOfLines={2}>
                      &quot;{award.note}&quot;
                    </ThemedText>
                  )}
                  <ThemedText style={[styles.date, { color: palette.muted }]}>{formatDate(award.awardedAt)}</ThemedText>
                </View>
              </Animated.View>
            ))}
          </View>
        </SurfaceCard>
      )}

      {/* Badge Log */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Badge Log</ThemedText>
          <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.countText, { color: palette.tint }]}>{awards.length}</ThemedText>
          </View>
        </View>

        {coachOnlyCount > 0 && (
          <View style={[styles.infoStrip, { backgroundColor: withAlpha(palette.icon, 0.03) }]}>
            <Ionicons name="shield" size={14} color={palette.icon} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              {coachOnlyCount} coach-only badge{coachOnlyCount > 1 ? 's are' : ' is'} hidden
            </ThemedText>
          </View>
        )}

        {awards.length === 0 ? (
          <EmptyMetrics icon="ribbon-outline" title="No Badges Yet" description="Badges will appear here when coaches award them" />
        ) : selectedChildId ? (
          <>
            <Clickable onPress={handleViewAll} style={[styles.viewAllLink, { borderColor: palette.border }]}>
              <Ionicons name="ribbon-outline" size={16} color={palette.tint} />
              <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                View all {awards.length} badge{awards.length !== 1 ? 's' : ''}
              </ThemedText>
              <Ionicons name="chevron-forward" size={14} color={palette.tint} />
            </Clickable>
            <View style={styles.badgeList}>
              {awards.map((award, index) => (
                <Animated.View key={award.id} entering={FadeInDown.delay(index * 50).springify()}>
                  <SurfaceCard style={styles.badgeCard}>
                    <View style={styles.badgeCardHeader}>
                      <View style={[styles.badgeIcon, { backgroundColor: withAlpha(getBadgeColor(award.badgeCategory, palette), 0.09) }]}>
                        <Ionicons name={getBadgeIcon(award.badgeCategory) as keyof typeof Ionicons.glyphMap} size={20} color={getBadgeColor(award.badgeCategory, palette)} />
                      </View>
                      <View style={styles.badgeCardContent}>
                        <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                        <ThemedText style={[styles.reason, { color: palette.muted }]}>{award.reason}</ThemedText>
                      </View>
                      <ThemedText style={[styles.date, { color: palette.muted }]}>{formatDate(award.awardedAt)}</ThemedText>
                    </View>
                    <View style={styles.badgeCardFooter}>
                      <View style={[
                        styles.visibilityPill,
                        { backgroundColor: award.shared ? withAlpha(palette.success, 0.07) : withAlpha(palette.icon, 0.03) }
                      ]}>
                        <Ionicons name={award.shared ? 'share' : 'eye'} size={12} color={award.shared ? palette.success : palette.icon} />
                        <ThemedText style={[styles.visibilityText, { color: award.shared ? palette.success : palette.icon }]}>
                          {award.shared ? 'Shared with you' : 'Visible in app'}
                        </ThemedText>
                      </View>
                    </View>
                  </SurfaceCard>
                </Animated.View>
              ))}
            </View>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
}

export const DevBadgesTab = memo(DevBadgesTabInner);

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  sharedCard: { padding: Spacing.md, gap: Spacing.md },
  sharedHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  headerIcon: { width: 36, height: 36, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  headerContent: { flex: 1, gap: Spacing.micro },
  hint: { ...Typography.caption },
  sharedList: { gap: Spacing.sm },
  sharedBadge: { flexDirection: 'row', padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.md, gap: Spacing.sm },
  badgeIcon: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  badgeContent: { flex: 1, gap: Spacing.xxs },
  reason: { ...Typography.caption },
  note: { ...Typography.caption, fontStyle: 'italic' },
  date: { ...Typography.caption },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...Typography.subheading },
  countBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: Radii.pill },
  countText: { ...Typography.caption },
  infoStrip: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.md },
  infoText: { ...Typography.caption },
  viewAllLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: Radii.md },
  viewAllText: { ...Typography.smallSemiBold },
  badgeList: { gap: Spacing.sm },
  badgeCard: { padding: Spacing.md, gap: Spacing.sm },
  badgeCardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  badgeCardContent: { flex: 1, gap: Spacing.xxs },
  badgeCardFooter: { flexDirection: 'row' },
  visibilityPill: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  visibilityText: { ...Typography.caption },
});
