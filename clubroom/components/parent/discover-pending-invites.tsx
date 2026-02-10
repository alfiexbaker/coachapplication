/**
 * DiscoverPendingInvites — Pending session invite cards section.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import type { SessionInvite } from '@/constants/types';

interface DiscoverPendingInvitesProps {
  invites: SessionInvite[];
}

function DiscoverPendingInvitesInner({ invites }: DiscoverPendingInvitesProps) {
  const { colors: palette } = useTheme();

  if (invites.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.section}>
      <Row justify="space-between" align="center" style={styles.sectionHeader}>
        <Row align="center" gap="xs">
          <Ionicons name="mail" size={18} color={palette.warning} />
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Pending Invites ({invites.length})
          </ThemedText>
        </Row>
        <Clickable onPress={() => router.push(Routes.SESSION_INVITES)}>
          <ThemedText style={[styles.viewAllLink, { color: palette.tint }]}>View All</ThemedText>
        </Clickable>
      </Row>

      {invites.map((invite, index) => {
        const coachFirstName = invite.coachName.split(' ')[0];
        const athleteDisplay = invite.athleteNames.length === 1
          ? invite.athleteNames[0]
          : `${invite.athleteNames.length} athletes`;
        const message = invite.clubName
          ? `Coach ${coachFirstName} invited ${athleteDisplay} to ${invite.clubName}`
          : `Coach ${coachFirstName} invited ${athleteDisplay} to ${invite.sessionType.toLowerCase()}`;

        return (
          <Clickable
            key={invite.id}
            onPress={() => router.push(Routes.sessionInvite(invite.id))}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
              <SurfaceCard style={[styles.inviteCard, { borderLeftColor: palette.warning }]}>
                <Row align="center" gap="md">
                  <Row align="center" justify="center" style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                    <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
                      {invite.coachName.split(' ').map((n) => n[0]).join('')}
                    </ThemedText>
                  </Row>
                  <View style={styles.inviteInfo}>
                    <ThemedText type="defaultSemiBold" numberOfLines={2} style={styles.inviteMessage}>
                      {message}
                    </ThemedText>
                    <Row align="center" gap="md">
                      <Row align="center" gap={4}>
                        <Ionicons name="calendar-outline" size={12} color={palette.muted} />
                        <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                          {invite.proposedSlots[0]
                            ? new Date(invite.proposedSlots[0].date).toLocaleDateString('en-GB', {
                                weekday: 'short', day: 'numeric', month: 'short',
                              })
                            : 'View times'}
                        </ThemedText>
                      </Row>
                      <Row align="center" gap={4} style={[styles.expiryBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}>
                        <Ionicons name="time-outline" size={10} color={palette.warning} />
                        <ThemedText style={[styles.expiryText, { color: palette.warning }]}>Respond soon</ThemedText>
                      </Row>
                    </Row>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.muted} />
                </Row>
              </SurfaceCard>
            </Animated.View>
          </Clickable>
        );
      })}
    </Animated.View>
  );
}

export const DiscoverPendingInvites = memo(DiscoverPendingInvitesInner);

const styles = StyleSheet.create({
  section: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: { ...Typography.body },
  viewAllLink: { ...Typography.smallSemiBold },
  inviteCard: { padding: Spacing.md, borderLeftWidth: 3 },
  avatar: { width: 40, height: 40, borderRadius: Radii.xl },
  avatarText: { ...Typography.bodySmallSemiBold },
  inviteInfo: { flex: 1, gap: Spacing.xs / 2 },
  inviteMessage: { ...Typography.bodySmall, lineHeight: 18 },
  metaText: { ...Typography.caption },
  expiryBadge: {
    paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.sm,
  },
  expiryText: { ...Typography.micro },
});
