/**
 * PendingInvitesSection — Action required section showing pending session invites.
 *
 * Displays up to 3 invite cards with accept/decline actions,
 * and a "View all" link when there are more than 3.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { SessionInviteCard } from '@/components/parent/session-invite-card';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionInvite } from '@/constants/types';

interface PendingInvitesSectionProps {
  invites: SessionInvite[];
  onAccept: (invite: SessionInvite, selectedSlot?: SessionInvite['proposedSlots'][0]) => Promise<void>;
  onDecline: (invite: SessionInvite) => void;
}

export const PendingInvitesSection = memo(function PendingInvitesSection({
  invites,
  onAccept,
  onDecline,
}: PendingInvitesSectionProps) {
  const { colors: palette } = useTheme();

  const handleViewAll = useCallback(() => {
    router.push(Routes.SESSION_INVITES);
  }, []);

  if (invites.length === 0) return null;

  return (
    <Column gap="sm" style={styles.container}>
      <Row gap="sm" align="center">
        <ThemedText type="defaultSemiBold" style={styles.title}>
          Action Required
        </ThemedText>
        <View style={[styles.badge, { backgroundColor: palette.error }]}>
          <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>
            {invites.length}
          </ThemedText>
        </View>
      </Row>

      {invites.slice(0, 3).map(invite => (
        <SessionInviteCard
          key={invite.id}
          invite={invite}
          onPress={() => router.push(Routes.sessionInvite(invite.id))}
          onAccept={(slot) => onAccept(invite, slot)}
          onDecline={() => onDecline(invite)}
          compact
        />
      ))}

      {invites.length > 3 && (
        <Clickable
          onPress={handleViewAll}
          accessibilityLabel={`View all ${invites.length} invites`}
          style={styles.viewAll}
        >
          <ThemedText style={[styles.viewAllText, { color: palette.tint }]}>
            View all {invites.length} invites
          </ThemedText>
          <Ionicons name="chevron-forward" size={16} color={palette.tint} />
        </Clickable>
      )}
    </Column>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  badgeText: {
    ...Typography.micro,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
  },
  viewAllText: {
    ...Typography.smallSemiBold,
  },
});
