import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface WaitlistBannerProps {
  waitlistCount: number;
  onJoinWaitlist: () => void;
  loading?: boolean;
  userPosition?: number | null;
  alreadyJoined?: boolean;
}

export function WaitlistBanner({
  waitlistCount,
  onJoinWaitlist,
  loading,
  userPosition,
  alreadyJoined,
}: WaitlistBannerProps) {
  const { colors: palette } = useTheme();
  const [isJoining, setIsJoining] = useState(false);
  const isLoading = Boolean(loading) || isJoining;

  const handleJoin = useCallback(async () => {
    if (isLoading) return;
    setIsJoining(true);
    try {
      await Promise.resolve(onJoinWaitlist());
    } finally {
      setIsJoining(false);
    }
  }, [isLoading, onJoinWaitlist]);

  const positionMessage =
    userPosition && userPosition > 0
      ? userPosition === 1
        ? `You're next on the waitlist${waitlistCount > 1 ? ` (#1 of ${waitlistCount})` : ''}`
        : userPosition <= 3
          ? `You're #${userPosition} of ${waitlistCount} on the waitlist. Good chance of a spot.`
          : `You're #${userPosition} of ${waitlistCount} on the waitlist.`
      : null;

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="status"
      style={[
        styles.container,
        { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.warning },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="time-outline" size={24} color={palette.warning} />
      </View>

      <View style={styles.content}>
        <ThemedText type="defaultSemiBold" style={{ color: palette.warning }}>
          {alreadyJoined ? 'You’re on the Waitlist' : 'Session is Full'}
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          {positionMessage
            ? positionMessage
            : waitlistCount > 0
            ? `${waitlistCount} ${waitlistCount === 1 ? 'person is' : 'people are'} already on the waitlist`
            : 'Be the first on the waitlist and get notified if a spot opens up'}
        </ThemedText>
        {alreadyJoined && (
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            We’ll notify you if a spot opens up.
          </ThemedText>
        )}
      </View>

      {!alreadyJoined && (
        <Clickable
          onPress={() => {
            void handleJoin();
          }}
          disabled={isLoading}
          accessibilityLabel="Join waitlist"
          accessibilityRole="button"
          accessibilityState={{ disabled: isLoading }}
          style={[styles.button, { backgroundColor: palette.warning }]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={palette.onPrimary} />
          ) : (
            <>
              <Ionicons name="add" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>
                Join Waitlist
              </ThemedText>
            </>
          )}
        </Clickable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  iconContainer: {
    alignSelf: 'flex-start',
  },
  content: {
    gap: Spacing.xxs,
  },
  description: { ...Typography.small, lineHeight: Typography.caption.lineHeight },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    alignSelf: 'flex-start',
  },
  buttonText: { ...Typography.bodySmallSemiBold },
});
