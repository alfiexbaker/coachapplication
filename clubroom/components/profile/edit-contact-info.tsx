/**
 * EditContactInfo — Email, phone, website fields for Edit Profile.
 */

import React, { memo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

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
  colors, userIsCoach, email, onChangeEmail, phone, onChangePhone, website, onChangeWebsite,
}: EditContactInfoProps) {
  const inputStyle = [styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }];

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
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Phone</ThemedText>
        <TextInput
          value={phone}
          onChangeText={onChangePhone}
          keyboardType="phone-pad"
          placeholder="+1 (555) 123-4567"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          accessibilityLabel="Phone number"
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
    borderWidth: 1, borderRadius: Radii.md,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
});
