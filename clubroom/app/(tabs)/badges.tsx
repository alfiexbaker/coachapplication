import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward } from '@/constants/types';
import { formatDate } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

const logger = createLogger('UserBadgesScreen');

export default function UserBadgesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [awards, setAwards] = useState<BadgeAward[]>([]);
  const [isSharing, setIsSharing] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    badgeService.listAwardsForAthlete(currentUser.id).then(setAwards);
  }, [currentUser]);

  const supporterFacingAwards = useMemo(
    () => awards.filter((award) => award.visibility !== 'coach_only'),
    [awards]
  );

  const lastAward = awards[0];
  const sharedCount = supporterFacingAwards.filter((award) => award.shared).length;
  const shareable = supporterFacingAwards.filter((award) => !award.shared);

  const handleShare = async (awardId: string) => {
    setIsSharing(awardId);
    try {
      const updated = await badgeService.markShared(awardId);
      if (updated) {
        setAwards((prev) => prev.map((award) => (award.id === awardId ? updated : award)));
        logger.info('badge_shared_by_athlete', { awardId });
      }
    } finally {
      setIsSharing(null);
    }
  };

  if (!currentUser) return null;

  return (
    <PageContainer
      header={
        <PageHeader
          title="Badges"
          subtitle="See recognition tied to your sessions and plan the next step"
        />
      }
      gap={Spacing.md}
    >
      <SurfaceCard style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              {awards.length}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Total badges</ThemedText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <ThemedText type="defaultSemiBold" style={styles.summaryValue}>
              {sharedCount}
            </ThemedText>
            <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Shared with family</ThemedText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <View style={[styles.toneBadge, { backgroundColor: `${palette.tint}12` }]}>
              <Ionicons name="sparkles" size={16} color={palette.tint} />
            </View>
            <ThemedText style={[styles.summaryLabel, { color: palette.muted }]}>Last badge</ThemedText>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>
              {lastAward ? formatDate(lastAward.awardedAt) : 'Not yet'}
            </ThemedText>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <ThemedText type="defaultSemiBold">Ready for progression?</ThemedText>
          <ThemedText style={[styles.progressHint, { color: palette.muted }]}>Line up your next session to keep momentum</ThemedText>
        </View>
        <View style={styles.progressActions}>
          <Clickable
            onPress={() => router.push('/(tabs)/bookings')}
            style={[styles.primaryButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={styles.primaryButtonText}>View bookings</ThemedText>
          </Clickable>
          <Clickable
            onPress={() => router.push('/book-coach')}
            style={[styles.secondaryButton, { borderColor: palette.border }]}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: palette.foreground }]}>Find a coach</ThemedText>
          </Clickable>
        </View>
      </SurfaceCard>

      {supporterFacingAwards.length > 0 ? (
        <SurfaceCard style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Share updates</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Send badges to supporters</ThemedText>
          </View>

          <View style={{ gap: Spacing.xs }}>
            {shareable.map((award) => (
              <SurfaceCard key={award.id} style={styles.shareRow}>
                <View style={styles.shareLeft}>
                  <View style={[styles.badgeIcon, { backgroundColor: `${palette.tint}12` }]}>
                    <Ionicons name="ribbon" size={16} color={palette.tint} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                    <ThemedText style={[styles.sectionHint, { color: palette.muted }]} numberOfLines={1}>
                      {award.reason}
                    </ThemedText>
                  </View>
                </View>
                <Clickable
                  disabled={isSharing === award.id}
                  onPress={() => handleShare(award.id)}
                  style={[styles.pillButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
                >
                  <ThemedText style={[styles.pillButtonText, { color: palette.tint }]}>
                    {isSharing === award.id ? 'Sending…' : 'Share'}
                  </ThemedText>
                </Clickable>
              </SurfaceCard>
            ))}

            {shareable.length === 0 ? (
              <View style={styles.emptyRow}>
                <Ionicons name="checkmark-circle" size={18} color={palette.tint} />
                <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>All supporter badges already shared</ThemedText>
              </View>
            ) : null}
          </View>
        </SurfaceCard>
      ) : null}

      <SurfaceCard style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <ThemedText type="defaultSemiBold">Badge timeline</ThemedText>
          <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>Linked to your sessions</ThemedText>
        </View>

        {awards.length === 0 ? (
          <View style={styles.emptyTimeline}>
            <Ionicons name="ribbon-outline" size={24} color={palette.icon} />
            <ThemedText type="defaultSemiBold">No badges yet</ThemedText>
            <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>They'll show here once coaches award them</ThemedText>
          </View>
        ) : (
          <View style={{ gap: Spacing.xs }}>
            {awards.map((award) => (
              <SurfaceCard key={award.id} style={styles.timelineItem}>
                <View style={styles.timelineHeader}>
                  <View style={styles.timelineTitleRow}>
                    <Ionicons name="ribbon" size={16} color={palette.tint} />
                    <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                  </View>
                  <ThemedText style={[styles.sectionHint, { color: palette.muted }]}>
                    {formatDate(award.awardedAt)}
                  </ThemedText>
                </View>

                <ThemedText style={{ color: palette.foreground }}>{award.reason}</ThemedText>
                {award.note ? (
                  <ThemedText style={[styles.sectionHint, { color: palette.muted }]} numberOfLines={2}>
                    {award.note}
                  </ThemedText>
                ) : null}

                <View style={styles.timelineMetaRow}>
                  <View style={[styles.metaPill, { backgroundColor: `${palette.tint}12` }]}>
                    <Ionicons name="person" size={12} color={palette.tint} />
                    <ThemedText style={[styles.metaText, { color: palette.tint }]}>Coach: {award.coachName}</ThemedText>
                  </View>
                  {award.sessionId ? (
                    <View style={[styles.metaPill, { backgroundColor: `${palette.icon}10` }]}>
                      <Ionicons name="link" size={12} color={palette.icon} />
                      <ThemedText style={[styles.metaText, { color: palette.icon }]}>Session linked</ThemedText>
                    </View>
                  ) : null}
                  {award.shared ? (
                    <View style={[styles.metaPill, { backgroundColor: `${palette.success}12` }]}>
                      <Ionicons name="send" size={12} color={palette.success} />
                      <ThemedText style={[styles.metaText, { color: palette.success }]}>Shared</ThemedText>
                    </View>
                  ) : null}
                </View>
              </SurfaceCard>
            ))}
          </View>
        )}
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  summaryCard: {
    padding: Spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  summaryItem: {
    flex: 1,
    gap: 4,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 22,
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: '#00000010',
  },
  toneBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  progressHeader: {
    gap: 4,
  },
  progressHint: {
    fontSize: 13,
  },
  progressActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  primaryButton: {
    flex: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: Radii.md,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontWeight: '700',
  },
  sectionCard: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHint: {
    fontSize: 12,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  shareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  pillButtonText: {
    fontWeight: '700',
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  emptyTimeline: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  timelineItem: {
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  timelineMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
