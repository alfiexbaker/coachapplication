/**
 * EditPricingSection — Session pricing fields for coach profiles.
 */

import React, { memo } from 'react';
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

export const EditPricingSection = memo(function EditPricingSection({
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
      <ThemedText type="subtitle">Session Pricing</ThemedText>
      <Row gap="md">
        <View style={[styles.fieldGroup, styles.priceField]}>
          <ThemedText style={styles.label}>Min Price (£)</ThemedText>
          <TextInput
            value={priceMin}
            onChangeText={onChangeMin}
            keyboardType="number-pad"
            placeholder="90"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            accessibilityLabel="Minimum price"

            maxLength={10}
          />
        </View>
        <View style={[styles.fieldGroup, styles.priceField]}>
          <ThemedText style={styles.label}>Max Price (£)</ThemedText>
          <TextInput
            value={priceMax}
            onChangeText={onChangeMax}
            keyboardType="number-pad"
            placeholder="140"
            placeholderTextColor={colors.muted}
            style={inputStyle}
            accessibilityLabel="Maximum price"

            maxLength={10}
          />
        </View>
      </Row>
      {priceError ? (
        <ThemedText style={[Typography.caption, { color: colors.error }]}>{priceError}</ThemedText>
      ) : (
        <ThemedText style={[Typography.caption, { color: colors.muted }]}>
          Enter whole pounds only (£10-£200)
        </ThemedText>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  fieldGroup: { gap: Spacing.xs },
  label: { fontWeight: '600' },
  priceField: { flex: 1 },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
});
