/**
 * StepBasicInfo — Basic information form step of onboarding.
 */

import { memo } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getPasswordStrength } from './onboarding-types';
import { Row } from '@/components/primitives';

interface StepBasicInfoProps {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: string;
  showDateOfBirth: boolean;
  onChangeField: (field: string, value: string) => void;
}

function StepBasicInfoInner({
  firstName,
  lastName,
  email,
  phone,
  password,
  confirmPassword,
  dateOfBirth,
  showDateOfBirth,
  onChangeField,
}: StepBasicInfoProps) {
  const { colors: palette } = useTheme();

  const inputStyle = [styles.input, { borderColor: palette.border, backgroundColor: palette.card }];

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Create your account
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Enter your details to get started.
      </ThemedText>

      <Row style={styles.formRow}>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <ThemedText style={styles.label}>First Name *</ThemedText>
          <TextInput
            value={firstName}
            onChangeText={(v) => onChangeField('firstName', v)}
            placeholder="John"
            placeholderTextColor={palette.muted}
            accessibilityLabel="First name"
            style={inputStyle}
          />
        </View>
        <View style={[styles.fieldGroup, { flex: 1 }]}>
          <ThemedText style={styles.label}>Last Name *</ThemedText>
          <TextInput
            value={lastName}
            onChangeText={(v) => onChangeField('lastName', v)}
            placeholder="Smith"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Last name"
            style={inputStyle}
          />
        </View>
      </Row>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Email *</ThemedText>
        <TextInput
          value={email}
          onChangeText={(v) => onChangeField('email', v)}
          placeholder="john@email.com"
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email address"
          style={inputStyle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Phone</ThemedText>
        <TextInput
          value={phone}
          onChangeText={(v) => onChangeField('phone', v)}
          placeholder="+44 7700 900000"
          placeholderTextColor={palette.muted}
          keyboardType="phone-pad"
          accessibilityLabel="Phone number"
          style={inputStyle}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Password *</ThemedText>
        <TextInput
          value={password}
          onChangeText={(v) => onChangeField('password', v)}
          placeholder="Min 6 characters"
          placeholderTextColor={palette.muted}
          secureTextEntry
          accessibilityLabel="Password"
          style={inputStyle}
        />
        {password.length > 0 && (
          <Row style={styles.strengthContainer}>
            <Row style={styles.strengthBars}>
              {[1, 2, 3, 4].map((level) => {
                const strength = getPasswordStrength(password, palette);
                const isActive = level <= strength.level;
                return (
                  <View
                    key={level}
                    style={[
                      styles.strengthBar,
                      { backgroundColor: isActive ? strength.color : palette.border },
                    ]}
                  />
                );
              })}
            </Row>
            <ThemedText style={[styles.strengthLabel, { color: getPasswordStrength(password, palette).color }]}>
              {getPasswordStrength(password, palette).label}
            </ThemedText>
          </Row>
        )}
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Confirm Password *</ThemedText>
        <TextInput
          value={confirmPassword}
          onChangeText={(v) => onChangeField('confirmPassword', v)}
          placeholder="Repeat password"
          placeholderTextColor={palette.muted}
          secureTextEntry
          accessibilityLabel="Confirm password"
          style={inputStyle}
        />
      </View>

      {showDateOfBirth && (
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Date of Birth</ThemedText>
          <TextInput
            value={dateOfBirth}
            onChangeText={(v) => onChangeField('dateOfBirth', v)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Date of birth"
            style={inputStyle}
          />
        </View>
      )}
    </View>
  );
}

export const StepBasicInfo = memo(StepBasicInfoInner);

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
  formRow: {
    gap: Spacing.sm,
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
  strengthContainer: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  strengthBars: {
    gap: Spacing.xxs,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: Radii.xs,
  },
  strengthLabel: {
    ...Typography.caption,
  },
});
