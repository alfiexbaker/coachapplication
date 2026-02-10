import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/constants/mock-data';
import { badgeService } from '@/services/badge-service';
import { TierNames, CategoryInfo } from '@/constants/progression';
import { getTierColor, getCategoryIcon, isRecent } from '@/hooks/use-child-badges';
import type { BadgeAward } from '@/constants/types';

interface ChildBadgeCardProps {
  award: BadgeAward;
  highlighted: boolean;
  onRefresh: () => void;
}

export const ChildBadgeCard = memo(function ChildBadgeCard({ award, highlighted, onRefresh }: ChildBadgeCardProps) {
  const { colors } = useTheme();
  const tierColor = getTierColor(award.badgeTier);
  const recent = isRecent(award.awardedAt);

  const handleShare = useCallback(async () => {
    await badgeService.markShared(award.id);
    onRefresh();
  }, [award.id, onRefresh]);

  return (
    <SurfaceCard
      style={[
        styles.card,
        highlighted ? { borderColor: colors.warning, borderWidth: 2 } : undefined,
        recent && !award.seenByParent ? { backgroundColor: withAlpha(colors.warning, 0.03) } : undefined,
      ]}
    >
      {/* Header */}
      <Row gap="md" align="flex-start">
        <View style={[styles.badgeIcon, { backgroundColor: withAlpha(tierColor, 0.12) }]}>
          <Ionicons name="ribbon" size={24} color={tierColor} />
        </View>
        <View style={styles.badgeInfo}>
          <Row gap="xs" align="center" wrap>
            <ThemedText type="defaultSemiBold" style={Typography.subheading}>{award.badgeLabel}</ThemedText>
            {recent && (
              <View style={[styles.recentPill, { backgroundColor: colors.warning }]}>
                <ThemedText style={[Typography.micro, { color: colors.onPrimary }]}>Recent</ThemedText>
              </View>
            )}
          </Row>
          <Row gap="xs" align="center" wrap>
            {award.badgeTier && (
              <Row style={[styles.metaPill, { backgroundColor: withAlpha(tierColor, 0.12) }]}>
                <ThemedText style={[Typography.micro, { color: tierColor }]}>{TierNames[award.badgeTier]}</ThemedText>
              </Row>
            )}
            {award.badgeCategory && (
              <Row style={[styles.metaPill, { backgroundColor: withAlpha(colors.tint, 0.07) }]}>
                <Ionicons name={getCategoryIcon(award.badgeCategory)} size={12} color={colors.tint} />
                <ThemedText style={[Typography.micro, { color: colors.tint }]}>{CategoryInfo[award.badgeCategory].label}</ThemedText>
              </Row>
            )}
            <ThemedText style={[Typography.caption, { color: colors.tint }]}>+{award.badgePointValue ?? 0} pts</ThemedText>
          </Row>
        </View>
      </Row>

      {/* Reason */}
      <View style={{ gap: Spacing.xxs }}>
        <ThemedText type="defaultSemiBold" style={[Typography.caption, { textTransform: 'uppercase', letterSpacing: 0.5 }]}>Reason</ThemedText>
        <ThemedText>{award.reason}</ThemedText>
      </View>

      {/* Coach Note */}
      {award.note && (
        <View style={[styles.noteSection, { backgroundColor: withAlpha(colors.tint, 0.03), borderColor: withAlpha(colors.tint, 0.12) }]}>
          <Row gap="xs" align="center">
            <Ionicons name="chatbubble" size={14} color={colors.tint} />
            <ThemedText type="defaultSemiBold" style={[Typography.caption, { color: colors.tint }]}>Coach&apos;s Note</ThemedText>
          </Row>
          <ThemedText style={[Typography.bodySmall, { fontStyle: 'italic' }]}>&quot;{award.note}&quot;</ThemedText>
        </View>
      )}

      {/* Footer */}
      <Row align="center" justify="space-between" style={[styles.footer, { borderTopColor: colors.border }]}>
        <Row gap="xs" align="center">
          <Ionicons name="person" size={14} color={colors.icon} />
          <ThemedText style={[Typography.small, { color: colors.muted }]}>Awarded by Coach {award.coachName}</ThemedText>
        </Row>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>{formatDate(award.awardedAt)}</ThemedText>
      </Row>

      {/* Share */}
      {!award.shared ? (
        <Clickable onPress={handleShare} style={[styles.shareButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="share-social" size={16} color={colors.onPrimary} />
          <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.onPrimary }]}>Share to Feed</ThemedText>
        </Clickable>
      ) : (
        <Row style={[styles.sharedIndicator, { backgroundColor: withAlpha(colors.success, 0.09) }]}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <ThemedText style={[Typography.smallSemiBold, { color: colors.success }]}>Shared to feed</ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.md },
  badgeIcon: { width: 48, height: 48, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  badgeInfo: { flex: 1, gap: Spacing.xs },
  recentPill: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  metaPill: { alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  noteSection: { padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.xs },
  footer: { paddingTop: Spacing.sm, borderTopWidth: 1 },
  shareButton: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radii.md },
  sharedIndicator: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radii.md },
});
