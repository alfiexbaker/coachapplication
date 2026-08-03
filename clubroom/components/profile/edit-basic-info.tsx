/**
 * EditBasicInfo — Name + bio fields for Edit Profile.
 */

import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditBasicInfoProps {
  colors: ThemeColors;
  userIsCoach: boolean;
  fullName: string;
  onChangeName: (text: string) => void;
  bio: string;
  onChangeBio: (text: string) => void;
}

export const EditBasicInfo = function EditBasicInfo({
  colors,
  userIsCoach,
  fullName,
  onChangeName,
  bio,
  onChangeBio,
}: EditBasicInfoProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  return (
    <SurfaceCard style={styles.section}>
      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Name</ThemedText>
        <TextInput
          value={fullName}
          onChangeText={onChangeName}
          placeholder="Your full name"
          placeholderTextColor={colors.muted}
          style={inputStyle}
          accessibilityLabel="Full name"
          maxLength={50}
        />
      </View>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Bio</ThemedText>
        <TextInput
          value={bio}
          onChangeText={onChangeBio}
          placeholder={userIsCoach ? 'Coaching approach and experience' : 'About you'}
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[...inputStyle, styles.textArea]}
          accessibilityLabel="Bio"
          maxLength={500}
        />
        {userIsCoach && <ThemedText style={styles.helper}>{bio.length}/500</ThemedText>}
      </View>
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  helper: { ...Typography.caption, opacity: 0.6 },
});
