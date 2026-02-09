/**
 * MutedCoachesList Component
 *
 * Displays a list of coaches that the user has muted and allows
 * unmuting them. Also provides the ability to mute new coaches.
 *
 * Features:
 * - List of muted coaches with avatars
 * - Unmute functionality
 * - Empty state when no coaches are muted
 * - Loading states
 */

import React from 'react';
import { View, StyleSheet, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { MutedCoach } from '@/constants/types';

export interface MutedCoachesListProps {
  /** List of muted coaches */
  mutedCoaches: MutedCoach[];
  /** Callback when a coach is unmuted */
  onUnmute: (coachId: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Loading state */
  loading?: boolean;
}

/**
 * Format a date string for display
 */
function formatMutedDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  }
}

interface MutedCoachRowProps {
  coach: MutedCoach;
  onUnmute: (coachId: string) => void;
  disabled?: boolean;
  loading?: boolean;
  isLast: boolean;
}

function MutedCoachRow({
  coach,
  onUnmute,
  disabled = false,
  loading = false,
  isLast,
}: MutedCoachRowProps) {
  const { colors: palette } = useTheme();

  const handleUnmute = () => {
    Alert.alert(
      'Unmute Coach',
      `Are you sure you want to unmute ${coach.coachName}? You will start receiving notifications from them again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unmute',
          onPress: () => onUnmute(coach.coachId),
        },
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
}

export function MutedCoachesList({
  mutedCoaches,
  onUnmute,
  disabled = false,
  loading = false,
}: MutedCoachesListProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.muted, 0.09) }]}>
          <Ionicons name="volume-mute" size={22} color={palette.muted} />
        </View>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Muted Coaches
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            You won&apos;t receive notifications from these coaches
          </ThemedText>
        </View>
        {mutedCoaches.length > 0 && (
          <View style={[styles.badge, { backgroundColor: palette.muted }]}>
            <ThemedText style={[styles.badgeText, { color: palette.onPrimary }]}>{mutedCoaches.length}</ThemedText>
          </View>
        )}
      </View>

      {/* Muted Coaches List or Empty State */}
      {mutedCoaches.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle" size={40} color={palette.success} />
          <ThemedText style={[styles.emptyTitle, { color: palette.text }]}>
            No Muted Coaches
          </ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: palette.muted }]}>
            You&apos;re receiving notifications from all your coaches
          </ThemedText>
        </View>
      ) : (
        <View style={[styles.list, { borderTopColor: palette.border }]}>
          {mutedCoaches.map((coach, index) => (
            <MutedCoachRow
              key={coach.coachId}
              coach={coach}
              onUnmute={onUnmute}
              disabled={disabled}
              loading={loading}
              isLast={index === mutedCoaches.length - 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.lg,
    borderWidth: 0.75,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: { ...Typography.subheading },
  subtitle: { ...Typography.small, lineHeight: 18 },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: { ...Typography.caption, /* color set inline for dynamic theming */ },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.subheading, marginTop: Spacing.xs },
  emptySubtitle: { ...Typography.small, textAlign: 'center',
    lineHeight: 18 },
});

export default MutedCoachesList;
