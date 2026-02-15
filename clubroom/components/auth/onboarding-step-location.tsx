/**
 * StepLocation — Location form step of onboarding.
 */

import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AccountType } from '@/services/auth-service';
import { Row } from '@/components/primitives';

interface StepLocationProps {
  addressLine: string;
  city: string;
  postcode: string;
  country: string;
  accountType: AccountType | null;
  onChangeField: (field: string, value: string) => void;
}

function StepLocationInner({
  addressLine,
  city,
  postcode,
  country,
  accountType,
  onChangeField,
}: StepLocationProps) {
  const { colors: palette } = useTheme();
  const quickCountries = ['UK', 'US', 'Canada', 'Australia'];

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
        <ThemedText style={styles.label}>
          {accountType === 'COACH' ? 'Coaching Address' : 'Address'}
        </ThemedText>
        <TextInput
          value={addressLine}
          onChangeText={(v) => onChangeField('addressLine', v)}
          placeholder={accountType === 'COACH' ? '12 Training Ground Road' : '12 Example Street'}
          placeholderTextColor={palette.muted}
          accessibilityLabel="Address"
          style={inputStyle}
        />
      </View>

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
        <Row style={styles.quickCountryRow}>
          {quickCountries.map((option) => {
            const isSelected = country.trim().toLowerCase() === option.toLowerCase();
            return (
              <Clickable
                key={option}
                onPress={() => onChangeField('country', option)}
                style={[
                  styles.quickCountryChip,
                  {
                    backgroundColor: isSelected ? palette.tint : withAlpha(palette.text, 0.03),
                    borderColor: isSelected ? palette.tint : palette.border,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.quickCountryText,
                    { color: isSelected ? palette.onPrimary : palette.foreground },
                  ]}
                >
                  {option}
                </ThemedText>
              </Clickable>
            );
          })}
        </Row>
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
  quickCountryRow: {
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  quickCountryChip: {
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  quickCountryText: {
    ...Typography.caption,
  },
});
