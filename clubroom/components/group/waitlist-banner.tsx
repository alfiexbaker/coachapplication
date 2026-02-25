import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface WaitlistBannerProps {
  waitlistCount: number;
  onJoinWaitlist: () => void;
  loading?: boolean;
}

export function WaitlistBanner({ waitlistCount, onJoinWaitlist, loading }: WaitlistBannerProps) {
  const { colors: palette } = useTheme();

  return (
    <View
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
          Session is Full
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          {waitlistCount > 0
            ? `${waitlistCount} ${waitlistCount === 1 ? 'person is' : 'people are'} already on the waitlist`
            : 'Be the first on the waitlist and get notified if a spot opens up'}
        </ThemedText>
      </View>

      <Clickable
        onPress={onJoinWaitlist}
        disabled={loading}
        style={[styles.button, { backgroundColor: palette.warning }]}
      >
        {loading ? (
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
