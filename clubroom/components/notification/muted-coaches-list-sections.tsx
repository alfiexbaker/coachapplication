import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { MutedCoach } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';
import { formatMutedDate } from './muted-coaches-list-helpers';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── MutedCoachRow ──────────────────────────────────────────────

export interface MutedCoachRowProps {
  coach: MutedCoach;
  onUnmute: (coachId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  isLast: boolean;
  palette: ThemeColors;
}

export const MutedCoachRow = function MutedCoachRow({
  coach,
  onUnmute,
  disabled = false,
  loading = false,
  isLast,
  palette,
}: MutedCoachRowProps) {
  return (
    <Row
      align="center"
      gap="sm"
      style={[
        styles.row,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: palette.border,
        },
      ]}
    >
      {coach.coachAvatar ? (
        <Image source={{ uri: coach.coachAvatar }} style={styles.avatar} />
      ) : (
        <View
          style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(palette.accent, 0.12) }]}
        >
          <ThemedText type="defaultSemiBold" style={{ color: palette.accent }}>
            {(coach.coachName ?? 'C').charAt(0).toUpperCase()}
          </ThemedText>
        </View>
      )}
      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={styles.coachName}>
          {coach.coachName}
        </ThemedText>
        <ThemedText style={[styles.mutedDate, { color: palette.muted }]}>
          Muted {formatMutedDate(coach.mutedAt)}
        </ThemedText>
        <ThemedText style={[styles.context, { color: palette.muted }]}>
          Messages, reminders, and updates from this coach are hidden until you unmute.
        </ThemedText>
        {coach.reason && (
          <ThemedText style={[styles.reason, { color: palette.muted }]}>{coach.reason}</ThemedText>
        )}
      </View>
      <Clickable
        onPress={() => onUnmute(coach.coachId)}
        disabled={disabled || loading}
        style={[styles.unmuteButton, { backgroundColor: withAlpha(palette.error, 0.09) }]}
      >
        <Ionicons name="volume-high" size={18} color={palette.error} />
      </Clickable>
    </Row>
  );
};

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    padding: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: Spacing.micro,
  },
  coachName: { ...Typography.body },
  mutedDate: { ...Typography.caption },
  context: { ...Typography.caption, lineHeight: Typography.micro.lineHeight },
  reason: { ...Typography.caption, fontStyle: 'italic' },
  unmuteButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
