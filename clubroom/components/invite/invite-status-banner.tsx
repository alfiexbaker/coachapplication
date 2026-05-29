/**
 * InviteStatusBanner — Displays the current status of a session invite.
 *
 * Shows a colored banner with an icon and text describing the invite status
 * (Pending, Accepted, Declined, Expired, Maybe).
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

type InviteStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'MAYBE';

interface InviteStatusBannerProps {
  status: InviteStatus;
  colors: ThemeColors;
}

const STATUS_CONFIG: Record<InviteStatus, { label: string; icon: string }> = {
  PENDING: { label: 'Awaiting Response', icon: 'hourglass' },
  ACCEPTED: { label: 'Session Confirmed', icon: 'checkmark-circle' },
  DECLINED: { label: 'Invite Declined', icon: 'close-circle' },
  EXPIRED: { label: 'Invite Expired', icon: 'time' },
  MAYBE: { label: 'Maybe Attending', icon: 'help-circle' },
};

function getStatusColors(status: InviteStatus, colors: ThemeColors) {
  switch (status) {
    case 'ACCEPTED':
      return { bg: withAlpha(colors.success, 0.12), text: colors.success };
    case 'DECLINED':
      return { bg: withAlpha(colors.error, 0.12), text: colors.error };
    case 'EXPIRED':
      return { bg: colors.background, text: colors.muted };
    case 'MAYBE':
    case 'PENDING':
    default:
      return { bg: withAlpha(colors.warning, 0.12), text: colors.warning };
  }
}

export const InviteStatusBanner = function InviteStatusBanner({
  status,
  colors,
}: InviteStatusBannerProps) {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const statusColors = getStatusColors(status, colors);

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <Row
        gap="sm"
        align="center"
        justify="center"
        style={[styles.banner, { backgroundColor: statusColors.bg }]}
      >
        <Ionicons
          name={statusConfig.icon as keyof typeof Ionicons.glyphMap}
          size={20}
          color={statusColors.text}
        />
        <ThemedText style={[styles.text, { color: statusColors.text }]}>
          {statusConfig.label}
        </ThemedText>
      </Row>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  text: {
    ...Typography.bodySemiBold,
  },
});
