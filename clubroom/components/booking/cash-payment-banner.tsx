/**
 * Cash Payment Banner
 *
 * Non-dismissible amber banner shown for bookings with cash payment.
 * Displays the amount due and a reminder about exact change.
 */

import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CashPaymentBannerProps {
  amount: number;
  coachName: string;
  sessionDate: string;
}

export function CashPaymentBanner({ amount, coachName, sessionDate }: CashPaymentBannerProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={[styles.banner, { backgroundColor: withAlpha(palette.warning, 0.06) }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="cash-outline" size={22} color={palette.warning} />
      </View>
      <View style={styles.content}>
        <ThemedText style={[styles.title, { color: palette.warning }]}>
          Cash payment due
        </ThemedText>
        <ThemedText style={[styles.amount, { color: palette.text }]}>
          {'\u00A3'}{amount.toFixed(2)} to {coachName}
        </ThemedText>
        <ThemedText style={[styles.date, { color: palette.muted }]}>
          On {sessionDate}
        </ThemedText>
        <ThemedText style={[styles.footnote, { color: palette.muted }]}>
          Please bring exact change
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: Radii.md,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginTop: Spacing.micro,
  },
  content: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: {
    ...Typography.bodySmallSemiBold,
  },
  amount: {
    ...Typography.bodySemiBold,
  },
  date: {
    ...Typography.bodySmall,
  },
  footnote: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
});
