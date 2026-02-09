/**
 * StepLocation — Location form step of onboarding.
 */

import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AccountType } from '@/services/auth-service';

interface StepLocationProps {
  city: string;
  postcode: string;
  country: string;
  accountType: AccountType | null;
  onChangeField: (field: string, value: string) => void;
}

function StepLocationInner({
  city,
  postcode,
  country,
  accountType,
  onChangeField,
}: StepLocationProps) {
  const { colors: palette } = useTheme();

  const inputStyle = [styles.input, { borderColor: palette.border, backgroundColor: palette.card }];

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Where are you based?
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        This helps us find {accountType === 'COACH' ? 'athletes' : 'coaches'} near you.
      </ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>City</ThemedText>
        <TextInput
          value={city}
          onChangeText={(v) => onChangeField('city', v)}
          placeholder="London"
          placeholderTextColor={palette.muted}
          accessibilityLabel="City"
          style={inputStyle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Postcode</ThemedText>
        <TextInput
          value={postcode}
          onChangeText={(v) => onChangeField('postcode', v)}
          placeholder="SW1A 1AA"
          placeholderTextColor={palette.muted}
          autoCapitalize="characters"
          accessibilityLabel="Postcode"
          style={inputStyle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Country</ThemedText>
        <TextInput
          value={country}
          onChangeText={(v) => onChangeField('country', v)}
          placeholder="UK"
          placeholderTextColor={palette.muted}
          accessibilityLabel="Country"
          style={inputStyle}
        />
      </View>
    </View>
  );
}

export const StepLocation = memo(StepLocationInner);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
    marginTop: -Spacing.xs,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
});
