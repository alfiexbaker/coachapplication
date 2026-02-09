import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface BrandingPreviewProps {
  colors: ThemeColors;
  academyName: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export const BrandingPreview = memo(function BrandingPreview({
  colors, academyName, logoUrl, bannerUrl, primaryColor, secondaryColor,
}: BrandingPreviewProps) {
  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.title}>Preview</ThemedText>
      <View style={[styles.card, { backgroundColor: primaryColor }]}>
        <View style={styles.banner}>
          {bannerUrl ? (
            <Image source={{ uri: bannerUrl }} style={styles.bannerImage} />
          ) : (
            <View style={[styles.bannerPlaceholder, { backgroundColor: primaryColor }]} />
          )}
        </View>
        <View style={styles.logoContainer}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={[styles.logo, { borderColor: colors.onPrimary }]} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: secondaryColor, borderColor: colors.onPrimary }]}>
              <ThemedText style={[styles.logoText, { color: colors.onPrimary }]}>
                {academyName.slice(0, 2).toUpperCase()}
              </ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={[styles.name, { color: colors.onPrimary }]}>{academyName}</ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.sm },
  title: { marginBottom: Spacing.sm },
  card: { borderRadius: Radii.lg, overflow: 'hidden', paddingBottom: Spacing.lg, alignItems: 'center' },
  banner: { width: '100%', height: 80 },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%' },
  logoContainer: { marginTop: -30 },
  logo: { width: 60, height: 60, borderRadius: Radii['2xl'], borderWidth: 3 },
  logoPlaceholder: { width: 60, height: 60, borderRadius: Radii['2xl'], borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  logoText: { ...Typography.heading },
  name: { ...Typography.subheading, marginTop: Spacing.xs },
});
