import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { formatDate } from '@/constants/mock-data';
import { BADGE_TABS, type BadgeItem, type BadgeCategory } from '@/hooks/use-dev-badges';
import type { Session } from '@/constants/app-types';

interface BadgeListSectionProps {
  activeTab: BadgeCategory;
  visibleBadges: BadgeItem[];
  selectedSession: Session | null;
  linkedAthlete: string;
  onAward: (badge: BadgeItem) => void;
}

export const BadgeListSection = memo(function BadgeListSection({
  activeTab, visibleBadges, selectedSession, linkedAthlete, onAward,
}: BadgeListSectionProps) {
  const { colors } = useTheme();

  const tabConfig = BADGE_TABS.find((t) => t.key === activeTab);
  const subtitle = activeTab === 'toAward' ? 'Queue awards and attach a session'
    : activeTab === 'recent' ? 'Latest recognition'
    : 'Badges you have already shared';

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.sectionHeader}>
        <ThemedText type="defaultSemiBold">{tabConfig?.label}</ThemedText>
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>{subtitle}</ThemedText>
      </Row>

      {visibleBadges.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="ribbon-outline" size={28} color={colors.icon} />
          <ThemedText type="defaultSemiBold">Nothing here yet</ThemedText>
          <ThemedText style={[Typography.caption, { color: colors.muted }]}>Create a badge or log a session</ThemedText>
        </View>
      ) : (
        <View style={{ gap: Spacing.xs }}>
          {visibleBadges.map((badge) => (
            <SurfaceCard key={badge.id} style={styles.badgeCard}>
              <Row gap="sm" align="center">
                <View style={[styles.badgeIcon, { backgroundColor: withAlpha(colors.tint, 0.09) }]}>
                  <Ionicons name="ribbon" size={18} color={colors.tint} />
                </View>
                <View style={styles.badgeTitleGroup}>
                  <ThemedText type="defaultSemiBold">{badge.title}</ThemedText>
                  <ThemedText style={{ color: colors.muted }}>{badge.athlete}</ThemedText>
                </View>
                {badge.awardedAt && (
                  <ThemedText style={[Typography.caption, { color: colors.muted }]}>{formatDate(badge.awardedAt)}</ThemedText>
                )}
              </Row>

              <ThemedText style={{ lineHeight: 20, color: colors.foreground }}>{badge.detail}</ThemedText>

              {badge.sharedWith && (
                <Row style={[styles.infoPill, { backgroundColor: withAlpha(colors.icon, 0.06) }]}>
                  <Ionicons name="share-social" size={14} color={colors.icon} />
                  <ThemedText style={[Typography.caption, { color: colors.icon }]}>{badge.sharedWith}</ThemedText>
                </Row>
              )}

              {activeTab === 'toAward' && (
                <Row gap="sm" align="center" justify="space-between">
                  <Row gap="xs" align="center" style={{ flex: 1 }}>
                    <Ionicons name="link" size={14} color={colors.icon} />
                    <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                      {selectedSession ? `Will link to ${linkedAthlete} · ${formatDate(selectedSession.completedAt)}` : 'No session linked'}
                    </ThemedText>
                  </Row>
                  <Clickable style={[styles.awardButton, { backgroundColor: colors.tint }]} onPress={() => onAward(badge)}>
                    <ThemedText style={{ color: colors.onPrimary, fontWeight: '700' }}>Award badge</ThemedText>
                  </Clickable>
                </Row>
              )}
            </SurfaceCard>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, padding: Spacing.sm },
  sectionHeader: { alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  emptyState: { alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.lg },
  badgeCard: { gap: Spacing.sm, padding: Spacing.sm },
  badgeIcon: { width: Components.avatar.sm, height: Components.avatar.sm, borderRadius: Components.avatar.sm / 2, alignItems: 'center', justifyContent: 'center' },
  badgeTitleGroup: { flex: 1, gap: Spacing.micro },
  infoPill: { alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  awardButton: { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radii.pill },
});
