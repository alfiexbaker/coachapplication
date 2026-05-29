import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AccountType } from '@/services/auth-service';

interface StepCompleteProps {
  accountType: AccountType | null;
}

function StepCompleteInner({ accountType }: StepCompleteProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.content}>
      <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
        <Ionicons name="checkmark-circle" size={64} color={palette.success} />
      </View>
      <ThemedText type="title" style={styles.title}>
        Welcome to Clubroom!
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Your account has been created successfully.
        {accountType === 'COACH' && ' Complete your profile to start accepting bookings.'}
        {accountType === 'PARENT' && ' Add your children to start booking sessions.'}
        {accountType === 'ATHLETE' && ' Start exploring coaches near you.'}
      </ThemedText>
    </View>
  );
}

export const StepComplete = StepCompleteInner;

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.xl,
    gap: Spacing.lg,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    ...Typography.body,
  },
});
