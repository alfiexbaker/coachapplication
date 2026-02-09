/**
 * InvitePersonCard — Shows the coach or athlete info on an invite detail.
 *
 * For coaches viewing: shows athlete names and parent info.
 * For parents viewing: shows coach name and optional club name.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInvite } from '@/constants/types';

interface InvitePersonCardProps {
  invite: SessionInvite;
  isCoach: boolean;
  colors: ThemeColors;
  delay?: number;
}

export const InvitePersonCard = memo(function InvitePersonCard({
  invite,
  isCoach,
  colors,
  delay = 100,
}: InvitePersonCardProps) {
  const initials = isCoach
    ? invite.athleteNames[0]?.charAt(0) || 'A'
    : invite.coachName
        .split(' ')
        .map((n) => n[0])
        .join('');

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <Row gap="md" align="center">
          <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
            <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
              {initials}
            </ThemedText>
          </View>
          <Column gap="micro" style={styles.info}>
            <ThemedText style={[styles.roleLabel, { color: colors.muted }]}>
              {isCoach ? 'Athletes' : 'Coach'}
            </ThemedText>
            <ThemedText type="subtitle">
              {isCoach ? invite.athleteNames.join(', ') : `Coach ${invite.coachName}`}
            </ThemedText>
            {invite.clubName && !isCoach && (
              <ThemedText style={[styles.clubName, { color: colors.tint }]}>
                {invite.clubName}
              </ThemedText>
            )}
            {isCoach && (
              <ThemedText style={[styles.roleLabel, { color: colors.muted }]}>
                Parent: {invite.parentName}
              </ThemedText>
            )}
          </Column>
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.title,
  },
  info: {
    flex: 1,
  },
  roleLabel: {
    ...Typography.caption,
  },
  clubName: {
    ...Typography.bodySmallSemiBold,
    marginTop: Spacing.micro,
  },
});
