/**
 * EditBasicInfo — Name + bio fields for Edit Profile.
 */

import React, { memo } from 'react';
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

export const EditBasicInfo = memo(function EditBasicInfo({
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
      <ThemedText type="subtitle">Basic Information</ThemedText>

      <View style={styles.fieldGroup}>
        <ThemedText style={styles.label}>Full Name</ThemedText>
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
          placeholder={
            userIsCoach
              ? 'Tell parents about your coaching philosophy...'
              : 'A bit about yourself...'
          }
          placeholderTextColor={colors.muted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={[...inputStyle, styles.textArea]}
          accessibilityLabel="Bio"

            maxLength={20}
          />
        {userIsCoach && (
          <ThemedText style={styles.helper}>{bio.length} / 500 characters</ThemedText>
        )}
      </View>
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
  textArea: { minHeight: 100, paddingTop: Spacing.sm },
  helper: { ...Typography.caption, opacity: 0.6 },
});
