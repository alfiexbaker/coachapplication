/**
 * EditContactInfo — Email, phone, website fields for Edit Profile.
 * Phone auto-formats to UK mobile (07xxx xxx xxx) on blur.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

/** Strip to digits, prefix 0 if starts with 7, format as 0XXXX XXX XXX */
function formatUkPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return '';

  // If they typed 7... add leading 0
  if (digits.startsWith('7')) digits = '0' + digits;
  // If they typed +44 or 44, replace with 0
  if (digits.startsWith('44')) digits = '0' + digits.slice(2);

  // Cap at 11 digits (UK mobile)
  digits = digits.slice(0, 11);

  // Format: 0XXXX XXX XXX
  if (digits.length <= 5) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return `${digits.slice(0, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
}

interface EditContactInfoProps {
  colors: ThemeColors;
  userIsCoach: boolean;
  email: string;
  onChangeEmail: (text: string) => void;
  phone: string;
  onChangePhone: (text: string) => void;
  website: string;
  onChangeWebsite: (text: string) => void;
}

export const EditContactInfo = memo(function EditContactInfo({
  colors,
  userIsCoach,
  email,
  onChangeEmail,
  phone,
  onChangePhone,
  website,
  onChangeWebsite,
}: EditContactInfoProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  const handlePhoneBlur = useCallback(() => {
    if (phone.trim().length > 0) {
      onChangePhone(formatUkPhone(phone));
    }
  }, [phone, onChangePhone]);

  return (
    <SurfaceCard style={styles.section}>
      <ThemedText type="subtitle">Contact Information</ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Email</ThemedText>
        <TextInput
          value={email}
          onChangeText={onChangeEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder={userIsCoach ? 'coach@email.com' : 'your@email.com'}
          placeholderTextColor={colors.muted}
          style={inputStyle}
          accessibilityLabel="Email address"

            maxLength={100}
          />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Phone</ThemedText>
        <TextInput
          value={phone}
          onChangeText={onChangePhone}
          onBlur={handlePhoneBlur}
          keyboardType="phone-pad"
          placeholder="07856 123 456"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          accessibilityLabel="Phone number"

            maxLength={20}
          />
      </View>

      {userIsCoach && (
        <View style={styles.fieldGroup}>
          <ThemedText style={styles.label}>Website</ThemedText>
          <TextInput
            value={website}
            onChangeText={onChangeWebsite}
            keyboardType="url"
            autoCapitalize="none"
            placeholder="https://yourwebsite.com"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            accessibilityLabel="Website URL"

            maxLength={200}
          />
        </View>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
});
