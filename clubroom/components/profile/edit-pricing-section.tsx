/**
 * EditPricingSection — Session pricing fields for coach profiles.
 */

import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditPricingSectionProps {
  colors: ThemeColors;
  priceMin: string;
  onChangeMin: (text: string) => void;
  priceMax: string;
  onChangeMax: (text: string) => void;
  priceError?: string | null;
}

export const EditPricingSection = function EditPricingSection({
  colors,
  priceMin,
  onChangeMin,
  priceMax,
  onChangeMax,
  priceError,
}: EditPricingSectionProps) {
  const inputStyle = [
    styles.input,
    { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground },
  ];

  return (
    <SurfaceCard style={styles.section}>
      <ThemedText type="subtitle">Pricing</ThemedText>
      <Row gap="md">
        <View style={[styles.fieldGroup, styles.priceField]}>
          <ThemedText style={styles.label}>Minimum (£)</ThemedText>
          <TextInput
            value={priceMin}
            onChangeText={onChangeMin}
            keyboardType="number-pad"
            placeholder="90"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            accessibilityLabel="Minimum price"
            maxLength={3}
          />
        </View>
        <View style={[styles.fieldGroup, styles.priceField]}>
          <ThemedText style={styles.label}>Maximum (£)</ThemedText>
          <TextInput
            value={priceMax}
            onChangeText={onChangeMax}
            keyboardType="number-pad"
            placeholder="140"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            accessibilityLabel="Maximum price"
            maxLength={3}
          />
        </View>
      </Row>
      {priceError ? (
        <ThemedText style={[Typography.caption, { color: colors.error }]}>{priceError}</ThemedText>
      ) : (
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
          £10–£200, whole pounds
        </ThemedText>
      )}
    </SurfaceCard>
  );
};

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  priceField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
});
