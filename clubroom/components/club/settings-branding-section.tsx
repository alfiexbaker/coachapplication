import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BrandingEditor } from '@/components/club/branding-editor';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubBranding } from '@/services/club-service';

interface SettingsBrandingSectionProps {
  branding: ClubBranding;
  colors: ThemeColors;
  canManageClub: boolean;
  isSaving: boolean;
  onChange: (updates: Partial<ClubBranding>) => void;
  onSave: () => void;
}

export const SettingsBrandingSection = function SettingsBrandingSection({
  branding,
  colors,
  canManageClub,
  isSaving,
  onChange,
  onSave,
}: SettingsBrandingSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={Typography.heading}>
          Club Branding
        </ThemedText>
        <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
          Keep brand updates here so settings and branding stay in one admin flow.
        </ThemedText>

        <BrandingEditor branding={branding} onChange={onChange} />

        <Clickable
          onPress={onSave}
          disabled={isSaving || !canManageClub}
          style={[
            styles.saveButton,
            { backgroundColor: canManageClub ? colors.tint : colors.border },
          ]}
          accessibilityLabel="Save branding"
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <ThemedText style={{ color: colors.onPrimary, ...Typography.smallSemiBold }}>
              Save Branding
            </ThemedText>
          )}
        </Clickable>
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  saveButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
});
