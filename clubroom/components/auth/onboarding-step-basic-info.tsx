/**
 * StepBasicInfo — Basic information form step of onboarding.
 */

import { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives/DateTimeField';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { getPasswordStrength } from './onboarding-types';
import { Row, Column } from '@/components/primitives';

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
  const today = new Date();
  const [emailTouched, setEmailTouched] = useState(false);
  const emailRegex = /^(?!\.)(?!.*\.\.)([A-Za-z0-9._%+-]+)@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  const trimmedEmail = email.trim();
  const emailError =
    emailTouched && trimmedEmail.length > 0 && !emailRegex.test(trimmedEmail)
      ? 'Enter a valid email address'
      : null;

  const inputStyle = [styles.input, { borderColor: palette.border, backgroundColor: palette.card }];
  const checklist = [
    { key: 'first', label: 'First name', done: firstName.trim().length > 0 },
    { key: 'last', label: 'Last name', done: lastName.trim().length > 0 },
    { key: 'email', label: 'Valid email', done: emailRegex.test(trimmedEmail) },
    { key: 'password', label: 'Password length', done: password.length >= 6 },
    { key: 'confirm', label: 'Passwords match', done: password.length > 0 && password === confirmPassword },
  ];
  const completed = checklist.filter((item) => item.done).length;
  const total = checklist.length;
  const completionPercent = Math.round((completed / total) * 100);

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        Create your account
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Enter your details to get started.
      </ThemedText>

      <View
        style={[
          styles.completionCard,
          {
            backgroundColor: withAlpha(palette.tint, 0.05),
            borderColor: withAlpha(palette.tint, 0.16),
          },
        ]}
      >
        <Row style={styles.completionHeader}>
          <ThemedText style={styles.completionTitle}>Profile completion</ThemedText>
          <ThemedText style={[styles.completionPercent, { color: palette.tint }]}>
            {completionPercent}%
          </ThemedText>
        </Row>
        <View style={[styles.completionTrack, { backgroundColor: withAlpha(palette.tint, 0.14) }]}>
          <View
            style={[
              styles.completionFill,
              {
                width: `${completionPercent}%`,
                backgroundColor: palette.tint,
              },
            ]}
          />
        </View>
        <View style={styles.checklist}>
          {checklist.map((item) => (
            <Row key={item.key} style={styles.checklistItem}>
              <Ionicons
                name={item.done ? 'checkmark-circle' : 'ellipse-outline'}
                size={14}
                color={item.done ? palette.success : palette.muted}
              />
              <ThemedText style={[styles.checklistLabel, { color: palette.foreground }]}>
                {item.label}
              </ThemedText>
            </Row>
          ))}
        </View>
      </View>

      <Row style={styles.formRow}>
        <Column style={styles.fieldGroup} flex>
          <ThemedText style={styles.label}>First Name *</ThemedText>
          <TextInput
            value={firstName}
            onChangeText={(v) => onChangeField('firstName', v)}
            placeholder="First name"
            placeholderTextColor={palette.muted}
            accessibilityLabel="First name"
            style={inputStyle}
          />
        </Column>
        <Column style={styles.fieldGroup} flex>
          <ThemedText style={styles.label}>Last Name *</ThemedText>
          <TextInput
            value={lastName}
            onChangeText={(v) => onChangeField('lastName', v)}
            placeholder="Last name"
            placeholderTextColor={palette.muted}
            accessibilityLabel="Last name"
            style={inputStyle}
          />
        </Column>
      </Row>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Email *</ThemedText>
        <TextInput
          value={email}
          onChangeText={(v) => {
            onChangeField('email', v);
            if (emailTouched) setEmailTouched(true);
          }}
          onBlur={() => {
            setEmailTouched(true);
            onChangeField('email', email.trim());
          }}
          placeholder="you@example.com"
          placeholderTextColor={palette.muted}
          keyboardType="email-address"
          autoCapitalize="none"
          accessibilityLabel="Email address"
          style={[
            inputStyle,
            emailError ? { borderColor: palette.error } : null,
          ]}
        />
        {emailError ? (
          <ThemedText style={[Typography.caption, { color: palette.error }]}>{emailError}</ThemedText>
        ) : null}
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
            <ThemedText
              style={[
                styles.strengthLabel,
                { color: getPasswordStrength(password, palette).color },
              ]}
            >
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
        <DateTimeField
          mode="date"
          label="Date of Birth"
          value={dateOfBirth}
          onChange={(v) => onChangeField('dateOfBirth', v)}
          maximumDate={today}
        />
      )}
    </View>
  );
}

export const StepBasicInfo = StepBasicInfoInner;

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
  completionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  completionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionTitle: {
    ...Typography.bodySemiBold,
  },
  completionPercent: {
    ...Typography.caption,
    fontWeight: '700',
  },
  completionTrack: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  completionFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  checklist: {
    gap: Spacing.xxs,
  },
  checklistItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  checklistLabel: {
    ...Typography.small,
    flex: 1,
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
