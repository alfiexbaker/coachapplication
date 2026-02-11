/**
 * DevBadgesTab — Shared badges + full badge log.
 */
import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
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
import { formatShortDateWithYear } from '@/utils/format';
import { getBadgeColor, getBadgeIcon } from '@/hooks/use-parent-development';
import type { BadgeAward } from '@/constants/types';

interface DevBadgesTabProps {
  awards: BadgeAward[];
  sharedBadges: BadgeAward[];
  coachOnlyCount: number;
  selectedChildId: string | undefined;
}

function DevBadgesTabInner({
  awards,
  sharedBadges,
  coachOnlyCount,
  selectedChildId,
}: DevBadgesTabProps) {
  const { colors: palette } = useTheme();

  const handleViewAll = useCallback(() => {
    if (selectedChildId) router.push(Routes.childBadges(selectedChildId));
  }, [selectedChildId]);

  return (
    <Animated.View entering={FadeIn} style={styles.container}>
      {/* Shared Badges */}
      {sharedBadges.length > 0 && (
        <SurfaceCard style={styles.sharedCard}>
          <Row align="flex-start" gap="sm">
            <Row
              align="center"
              justify="center"
              style={[styles.headerIcon, { backgroundColor: withAlpha(palette.success, 0.07) }]}
            >
              <Ionicons name="share" size={16} color={palette.success} />
            </Row>
            <View style={styles.headerContent}>
              <ThemedText type="defaultSemiBold">Shared With You</ThemedText>
              <ThemedText style={[styles.hint, { color: palette.muted }]}>
                Badges coaches wanted you to see
              </ThemedText>
            </View>
          </Row>
          <View style={styles.sharedList}>
            {sharedBadges.map((award, index) => (
              <Animated.View
                key={award.id}
                entering={FadeInRight.delay(index * 50).springify()}
                style={[styles.sharedBadge, { borderColor: palette.border }]}
              >
                <Row gap="sm">
                  <Row
                    align="center"
                    justify="center"
                    style={[
                      styles.badgeIcon,
                      {
                        backgroundColor: withAlpha(
                          getBadgeColor(award.badgeCategory, palette),
                          0.09,
                        ),
                      },
                    ]}
                  >
                    <Ionicons
                      name={getBadgeIcon(award.badgeCategory) as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={getBadgeColor(award.badgeCategory, palette)}
                    />
                  </Row>
                  <View style={styles.badgeContent}>
                    <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                    <ThemedText style={[styles.reason, { color: palette.muted }]}>
                      {award.reason}
                    </ThemedText>
                    {award.note && (
                      <ThemedText style={[styles.note, { color: palette.text }]} numberOfLines={2}>
                        &quot;{award.note}&quot;
                      </ThemedText>
                    )}
                    <ThemedText style={[styles.date, { color: palette.muted }]}>
                      {formatShortDateWithYear(award.awardedAt)}
                    </ThemedText>
                  </View>
                </Row>
              </Animated.View>
            ))}
          </View>
        </SurfaceCard>
      )}

      {/* Badge Log */}
      <View style={styles.section}>
        <Row align="center" justify="space-between">
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Badge Log
          </ThemedText>
          <View style={[styles.countBadge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <ThemedText style={[styles.countText, { color: palette.tint }]}>
              {awards.length}
            </ThemedText>
          </View>
        </Row>

        {coachOnlyCount > 0 && (
          <Row
            align="center"
            gap="xs"
            style={[styles.infoStrip, { backgroundColor: withAlpha(palette.icon, 0.03) }]}
          >
            <Ionicons name="shield" size={14} color={palette.icon} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              {coachOnlyCount} coach-only badge{coachOnlyCount > 1 ? 's are' : ' is'} hidden
            </ThemedText>
          </Row>
        )}

        {awards.length === 0 ? (
          <EmptyMetrics
            icon="ribbon-outline"
            title="No Badges Yet"
            description="Badges will appear here when coaches award them"
          />
        ) : selectedChildId ? (
          <>
            <Clickable onPress={handleViewAll}>
              <Row
                align="center"
                justify="center"
                gap="xs"
                style={[styles.viewAllLink, { borderColor: palette.border }]}
              >
                <Ionicons name="ribbon-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
                  View all {awards.length} badge{awards.length !== 1 ? 's' : ''}
                </ThemedText>
                <Ionicons name="chevron-forward" size={14} color={palette.tint} />
              </Row>
            </Clickable>
            <View style={styles.badgeList}>
              {awards.map((award, index) => (
                <Animated.View key={award.id} entering={FadeInDown.delay(index * 50).springify()}>
                  <SurfaceCard style={styles.badgeCard}>
                    <Row align="flex-start" gap="sm">
                      <Row
                        align="center"
                        justify="center"
                        style={[
                          styles.badgeIcon,
                          {
                            backgroundColor: withAlpha(
                              getBadgeColor(award.badgeCategory, palette),
                              0.09,
                            ),
                          },
                        ]}
                      >
                        <Ionicons
                          name={getBadgeIcon(award.badgeCategory) as keyof typeof Ionicons.glyphMap}
                          size={20}
                          color={getBadgeColor(award.badgeCategory, palette)}
                        />
                      </Row>
                      <View style={styles.badgeCardContent}>
                        <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                        <ThemedText style={[styles.reason, { color: palette.muted }]}>
                          {award.reason}
                        </ThemedText>
                      </View>
                      <ThemedText style={[styles.date, { color: palette.muted }]}>
                        {formatShortDateWithYear(award.awardedAt)}
                      </ThemedText>
                    </Row>
                    <Row>
                      <Row
                        align="center"
                        gap="xxs"
                        style={[
                          styles.visibilityPill,
                          {
                            backgroundColor: award.shared
                              ? withAlpha(palette.success, 0.07)
                              : withAlpha(palette.icon, 0.03),
                          },
                        ]}
                      >
                        <Ionicons
                          name={award.shared ? 'share' : 'eye'}
                          size={12}
                          color={award.shared ? palette.success : palette.icon}
                        />
                        <ThemedText
                          style={[
                            styles.visibilityText,
                            { color: award.shared ? palette.success : palette.icon },
                          ]}
                        >
                          {award.shared ? 'Shared with you' : 'Visible in app'}
                        </ThemedText>
                      </Row>
                    </Row>
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
  headerIcon: { width: 36, height: 36, borderRadius: Radii.xl },
  headerContent: { flex: 1, gap: Spacing.micro },
  hint: { ...Typography.caption },
  sharedList: { gap: Spacing.sm },
  sharedBadge: { padding: Spacing.sm, borderWidth: 1, borderRadius: Radii.md },
  badgeIcon: { width: 40, height: 40, borderRadius: Radii.xl },
  badgeContent: { flex: 1, gap: Spacing.xxs },
  reason: { ...Typography.caption },
  note: { ...Typography.caption, fontStyle: 'italic' },
  date: { ...Typography.caption },
  section: { gap: Spacing.sm },
  sectionTitle: { ...Typography.subheading },
  countBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  countText: { ...Typography.caption },
  infoStrip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.md,
  },
  infoText: { ...Typography.caption },
  viewAllLink: { paddingVertical: Spacing.sm, borderWidth: 1, borderRadius: Radii.md },
  viewAllText: { ...Typography.smallSemiBold },
  badgeList: { gap: Spacing.sm },
  badgeCard: { padding: Spacing.md, gap: Spacing.sm },
  badgeCardContent: { flex: 1, gap: Spacing.xxs },
  visibilityPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  visibilityText: { ...Typography.caption },
});
