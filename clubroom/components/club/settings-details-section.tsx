import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface SettingsDetailsSectionProps {
  editName: string;
  editTagline: string;
  editCity: string;
  canEdit: boolean;
  colors: ThemeColors;
  onNameChange: (text: string) => void;
  onTaglineChange: (text: string) => void;
  onCityChange: (text: string) => void;
  onSave: () => void;
}

export const SettingsDetailsSection = function SettingsDetailsSection({
  editName,
  editTagline,
  editCity,
  canEdit,
  colors,
  onNameChange,
  onTaglineChange,
  onCityChange,
  onSave,
}: SettingsDetailsSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={Typography.heading}>
          Club details
        </ThemedText>
        {[
          { label: 'Club Name', value: editName, onChange: onNameChange },
          {
            label: 'Tagline',
            value: editTagline,
            onChange: onTaglineChange,
            placeholder: 'Add a tagline...',
          },
          { label: 'City', value: editCity, onChange: onCityChange },
        ].map(({ label, value, onChange, placeholder }) => (
          <View key={label} style={styles.inputGroup}>
            <ThemedText style={[Typography.smallSemiBold, { color: colors.muted }]}>
              {label}
            </ThemedText>
            {canEdit ? (
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={value}
                onChangeText={onChange}
                placeholder={placeholder}
                placeholderTextColor={colors.muted}
                accessibilityLabel={label}
                maxLength={100}
              />
            ) : (
              <ThemedText style={[Typography.body, { color: colors.text }]}>
                {value.trim() || 'Not set'}
              </ThemedText>
            )}
          </View>
        ))}
        {canEdit ? (
          <Clickable style={[styles.saveBtn, { backgroundColor: colors.tint }]} onPress={onSave}>
            <ThemedText style={{ color: colors.onPrimary, fontWeight: '600' }}>
              Save changes
            </ThemedText>
          </Clickable>
        ) : null}
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  inputGroup: { gap: Spacing.xs },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  saveBtn: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
});
