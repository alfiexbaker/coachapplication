/**
 * Extracted sub-components for CoachSignupScreen.
 *
 * INVITE_CODES — mock invite code data.
 * InviteCodeSection — invite code input + verify button.
 * CoachFormFields — 5 form fields for coach details.
 * SignupSubmitButton — submit button with disabled state.
 */

import React, { memo } from 'react';
import { StyleSheet, View, TextInput, Platform } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Constants ────────────────────────────────────────────────────────────────

export const INVITE_CODES = [
  {
    code: 'clubroom-coach',
    status: 'active' as const,
    schoolId: 'school-1',
    schoolName: 'Southgate Academy',
    currentUses: 0,
    maxUses: 10,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── InviteCodeSection ────────────────────────────────────────────────────────

interface InviteCodeSectionProps {
  inviteCode: string;
  onChangeCode: (text: string) => void;
  onValidate: () => void;
  inviteValidated: boolean;
  inviteError: string;
  validatedSchoolName?: string;
  palette: ThemeColors;
}

export const InviteCodeSection = memo(function InviteCodeSection({
  inviteCode,
  onChangeCode,
  onValidate,
  inviteValidated,
  inviteError,
  validatedSchoolName,
  palette,
}: InviteCodeSectionProps) {
  return (
    <View style={styles.inviteSection}>
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>School Invite Code</ThemedText>
        <Row style={styles.inviteRow}>
          <TextInput
            value={inviteCode}
            onChangeText={onChangeCode}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="HIGHPRESS2024"
            placeholderTextColor={palette.muted}
            style={[
              styles.input,
              styles.inviteInput,
              {
                borderColor: inviteValidated ? palette.success : palette.border,
                backgroundColor: palette.card,
              },
            ]}
            returnKeyType="go"
            onSubmitEditing={onValidate}
            editable={!inviteValidated}
          />
          <Clickable
            style={({ pressed }) => [
              styles.validateButton,
              {
                backgroundColor: inviteValidated
                  ? palette.success
                  : pressed
                    ? palette.tintPressed
                    : palette.tint,
                opacity: pressed || !inviteCode ? 0.7 : 1,
              },
            ]}
            disabled={!inviteCode || inviteValidated}
            onPress={onValidate}
          >
            <ThemedText style={[styles.validateButtonText, { color: palette.onPrimary }]}>
              {inviteValidated ? 'Verified' : 'Verify'}
            </ThemedText>
          </Clickable>
        </Row>
        {inviteError ? (
          <ThemedText style={[styles.helper, { color: palette.error }]}>{inviteError}</ThemedText>
        ) : inviteValidated && validatedSchoolName ? (
          <ThemedText style={[styles.helper, { color: palette.success }]}>
            Verified for {validatedSchoolName}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
});

// ─── CoachFormFields ──────────────────────────────────────────────────────────

interface CoachFormFieldsProps {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  onChangeFullName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePhone: (v: string) => void;
  onChangePassword: (v: string) => void;
  onChangeConfirmPassword: (v: string) => void;
  onSubmit: () => void;
  palette: ThemeColors;
}

export const CoachFormFields = memo(function CoachFormFields({
  fullName,
  email,
  phone,
  password,
  confirmPassword,
  onChangeFullName,
  onChangeEmail,
  onChangePhone,
  onChangePassword,
  onChangeConfirmPassword,
  onSubmit,
  palette,
}: CoachFormFieldsProps) {
  const inputStyle = [styles.input, { borderColor: palette.border, backgroundColor: palette.card }];

  return (
    <>
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Full Name</ThemedText>
        <TextInput
          value={fullName}
          onChangeText={onChangeFullName}
          placeholder="Full name"
          placeholderTextColor={palette.muted}
          style={inputStyle}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Email</ThemedText>
        <TextInput
          value={email}
          onChangeText={onChangeEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="coach@email.com"
          placeholderTextColor={palette.muted}
          style={inputStyle}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Phone</ThemedText>
        <TextInput
          value={phone}
          onChangeText={onChangePhone}
          keyboardType="phone-pad"
          placeholder="07856 123 456"
          placeholderTextColor={palette.muted}
          style={inputStyle}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Password</ThemedText>
        <TextInput
          value={password}
          onChangeText={onChangePassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={palette.muted}
          style={inputStyle}
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Confirm Password</ThemedText>
        <TextInput
          value={confirmPassword}
          onChangeText={onChangeConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={palette.muted}
          style={inputStyle}
          returnKeyType="go"
          onSubmitEditing={onSubmit}
        />
      </View>
    </>
  );
});

// ─── SignupSubmitButton ───────────────────────────────────────────────────────

interface SignupSubmitButtonProps {
  isValid: boolean;
  onPress: () => void;
  palette: ThemeColors;
}

export const SignupSubmitButton = memo(function SignupSubmitButton({
  isValid,
  onPress,
  palette,
}: SignupSubmitButtonProps) {
  return (
    <Clickable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: !isValid ? palette.border : pressed ? palette.tintPressed : palette.tint,
          opacity: pressed || !isValid ? 0.9 : 1,
        },
      ]}
      disabled={!isValid}
      onPress={onPress}
    >
      <ThemedText style={[styles.buttonLabel, { color: palette.onPrimary }]}>
        Create Coach Account
      </ThemedText>
    </Clickable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  inviteSection: { paddingTop: Spacing.xs },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: {
    ...Typography.subheading,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inviteRow: { gap: Spacing.xs },
  inviteInput: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  validateButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  validateButtonText: { ...Typography.bodySmallSemiBold },
  helper: { ...Typography.bodySmall, opacity: 0.9 },
  button: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  buttonLabel: { ...Typography.subheading },
});
