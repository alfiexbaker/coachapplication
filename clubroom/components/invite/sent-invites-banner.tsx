/**
 * SentInvitesBanner — Shows the most recent sent invites on the athlete step.
 *
 * Displays up to 5 invites with status badges and links to view details.
 */

import React, { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Routes } from '@/navigation/routes';
import { Row, Column } from '@/components/primitives';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInvite } from '@/constants/types';

export interface SentInvitesBannerProps {
  invites: SessionInvite[];
  colors: ThemeColors;
}

const STATUS_COLORS_MAP: Record<string, (c: ThemeColors) => { bg: string; text: string }> = {
  PENDING: (c) => ({ bg: withAlpha(c.warning, 0.12), text: c.warning }),
  ACCEPTED: (c) => ({ bg: withAlpha(c.success, 0.12), text: c.success }),
  DECLINED: (c) => ({ bg: withAlpha(c.error, 0.12), text: c.error }),
  EXPIRED: (c) => ({ bg: c.border, text: c.muted }),
  COUNTERED: (c) => ({ bg: withAlpha(c.tint, 0.12), text: c.tint }),
  MAYBE: (c) => ({ bg: withAlpha(c.warning, 0.12), text: c.warning }),
};

// ============================================================================
// SENT INVITE ROW
// ============================================================================

interface SentInviteRowProps {
  invite: SessionInvite;
  statusConfig: { bg: string; text: string };
  colors: ThemeColors;
}

const SentInviteRow = memo(function SentInviteRow({ invite, statusConfig, colors }: SentInviteRowProps) {
  const handlePress = useCallback(() => {
    router.push(Routes.sessionInvite(invite.id));
  }, [invite.id]);

  return (
    <Clickable
      onPress={handlePress}
      style={[styles.sentItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityLabel={`Invite to ${invite.athleteNames.join(', ')}, status ${invite.status}`}
    >
      <Column gap="micro" style={styles.sentInfo}>
        <ThemedText type="defaultSemiBold" numberOfLines={1}>
          {invite.athleteNames.join(', ')}
        </ThemedText>
        <ThemedText style={[styles.sentMeta, { color: colors.muted }]}>
          {invite.sessionType} - {invite.focus}
        </ThemedText>
      </Column>
      <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
        <ThemedText style={[styles.statusText, { color: statusConfig.text }]}>
          {invite.status}
        </ThemedText>
      </View>
    </Clickable>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SentInvitesBanner = memo(function SentInvitesBanner({ invites, colors }: SentInvitesBannerProps) {
  if (invites.length === 0) return null;

  const handleViewAll = useCallback(() => {
    router.push(Routes.SESSION_INVITES);
  }, []);

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.sentSection}>
      <Row justify="between" align="center" style={styles.sentHeader}>
        <ThemedText type="defaultSemiBold" style={styles.sentTitle}>
          Recent Sent Invites
        </ThemedText>
        <Clickable
          onPress={handleViewAll}
          accessibilityLabel="View all sent invites"
        >
          <ThemedText style={{ color: colors.tint, ...Typography.small }}>View All</ThemedText>
        </Clickable>
      </Row>
      {invites.map((invite) => {
        const getColors = STATUS_COLORS_MAP[invite.status] || STATUS_COLORS_MAP.PENDING;
        const statusConfig = getColors(colors);
        return (
          <SentInviteRow key={invite.id} invite={invite} statusConfig={statusConfig} colors={colors} />
        );
      })}
    </Animated.View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  sentSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sentHeader: {
    marginBottom: Spacing.xs,
  },
  sentTitle: {
    ...Typography.bodySmall,
  },
  sentItem: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.md,
    minHeight: 44,
  },
  sentInfo: {
    flex: 1,
  },
  sentMeta: {
    ...Typography.caption,
    marginTop: Spacing.micro,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: {
    ...Typography.micro,
    textTransform: 'uppercase',
  },
});
