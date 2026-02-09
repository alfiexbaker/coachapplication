import React, { memo } from 'react';
import { StyleSheet, View, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { MutedCoach } from '@/constants/types';
import type { useTheme } from '@/hooks/useTheme';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ─── Helpers ────────────────────────────────────────────────────

export function formatMutedDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ─── MutedCoachRow ──────────────────────────────────────────────

export interface MutedCoachRowProps {
  coach: MutedCoach;
  onUnmute: (coachId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  isLast: boolean;
  palette: ThemeColors;
}

export const MutedCoachRow = memo(function MutedCoachRow({
  coach,
  onUnmute,
  disabled = false,
  loading = false,
  isLast,
  palette,
}: MutedCoachRowProps) {
  const handleUnmute = () => {
    Alert.alert(
      'Unmute Coach',
      `Are you sure you want to unmute ${coach.coachName}? You will start receiving notifications from them again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unmute', onPress: () => onUnmute(coach.coachId) },
      ]
    );
  };

  return (
    <View
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
        <View style={[styles.avatarPlaceholder, { backgroundColor: withAlpha(palette.accent, 0.12) }]}>
          <ThemedText type="defaultSemiBold" style={{ color: palette.accent }}>
            {coach.coachName.charAt(0).toUpperCase()}
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
        {coach.reason && (
          <ThemedText style={[styles.reason, { color: palette.muted }]}>
            {coach.reason}
          </ThemedText>
        )}
      </View>
      <Clickable
        onPress={handleUnmute}
        disabled={disabled || loading}
        style={[styles.unmuteButton, { backgroundColor: withAlpha(palette.error, 0.09) }]}
      >
        <Ionicons name="volume-high" size={18} color={palette.error} />
      </Clickable>
    </View>
  );
});

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
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
  reason: { ...Typography.caption, fontStyle: 'italic' },
  unmuteButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
