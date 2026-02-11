/**
 * AcademyCard — Extracted sections
 *
 * Compact variant of the academy card.
 */

import { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { Academy } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

type ThemeColors = ReturnType<typeof useTheme>['colors'];

// ---------------------------------------------------------------------------
// CompactAcademyCard
// ---------------------------------------------------------------------------

export interface CompactAcademyCardProps {
  academy: Academy;
  primaryColor: string;
  palette: ThemeColors;
  onPress?: () => void;
}

export const CompactAcademyCard = memo(function CompactAcademyCard({
  academy,
  primaryColor,
  palette,
  onPress,
}: CompactAcademyCardProps) {
  return (
    <SurfaceCard style={styles.compactCard} onPress={onPress}>
      <Row style={styles.compactMain}>
        {academy.logoUrl ? (
          <Image source={{ uri: academy.logoUrl }} style={styles.compactLogo} />
        ) : (
          <View style={[styles.compactLogoPlaceholder, { backgroundColor: primaryColor }]}>
            <ThemedText style={[styles.compactLogoText, { color: palette.onPrimary }]}>
              {academy.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <View style={styles.compactInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {academy.name}
          </ThemedText>
          <Row style={styles.compactMeta}>
            <Ionicons name="location-outline" size={12} color={palette.muted} />
            <ThemedText style={[styles.compactLocation, { color: palette.muted }]}>
              {academy.city}
            </ThemedText>
          </Row>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  compactCard: { padding: Spacing.md },
  compactMain: { alignItems: 'center', gap: Spacing.md },
  compactLogo: { width: 44, height: 44, borderRadius: Radii.xl },
  compactLogoPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactLogoText: { ...Typography.bodySmallSemiBold },
  compactInfo: { flex: 1 },
  compactMeta: { alignItems: 'center', gap: Spacing.micro, marginTop: Spacing.micro },
  compactLocation: { ...Typography.caption },
});
