import React, { memo, useCallback } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography, Shadows } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { COLOR_OPTIONS } from '@/hooks/use-academy-branding';

interface BrandingColorPickerProps {
  colors: ThemeColors;
  scheme: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  canEdit: boolean;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
}

export const BrandingColorPicker = memo(function BrandingColorPicker({
  colors, scheme, primaryColor, secondaryColor, canEdit, onPrimaryChange, onSecondaryChange,
}: BrandingColorPickerProps) {
  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold" style={styles.title}>Brand Colors</ThemedText>
      <Column gap="md">
        <ColorRow
          label="Primary Color"
          selected={primaryColor}
          canEdit={canEdit}
          onSelect={onPrimaryChange}
          colors={colors}
          scheme={scheme}
        />
        <ColorRow
          label="Secondary Color"
          selected={secondaryColor}
          canEdit={canEdit}
          onSelect={onSecondaryChange}
          colors={colors}
          scheme={scheme}
        />
      </Column>
    </SurfaceCard>
  );
});

interface ColorRowProps {
  label: string;
  selected: string;
  canEdit: boolean;
  onSelect: (color: string) => void;
  colors: ThemeColors;
  scheme: 'light' | 'dark';
}

const ColorRow = memo(function ColorRow({ label, selected, canEdit, onSelect, colors, scheme }: ColorRowProps) {
  return (
    <View style={styles.colorSection}>
      <ThemedText style={styles.colorLabel}>{label}</ThemedText>
      <View style={styles.colorGrid}>
        {COLOR_OPTIONS.map((color) => (
          <Clickable
            key={color}
            onPress={() => canEdit && onSelect(color)}
            style={[
              styles.colorOption,
              { backgroundColor: color },
              selected === color && styles.colorSelected,
              selected === color && { borderColor: colors.onPrimary, ...Shadows[scheme].card },
            ].filter(Boolean) as ViewStyle[]}
          >
            {selected === color && <Ionicons name="checkmark" size={18} color={colors.onPrimary} />}
          </Clickable>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  title: { marginBottom: Spacing.sm },
  colorSection: { gap: Spacing.xs },
  colorLabel: { ...Typography.smallSemiBold },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  colorOption: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  colorSelected: { borderWidth: 3 },
});
