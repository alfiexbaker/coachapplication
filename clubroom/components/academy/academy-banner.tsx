/**
 * AcademyBanner — Banner + logo + name/location/rating for academy detail.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { Academy } from '@/constants/types';
import { Row } from '@/components/primitives';

interface AcademyBannerProps {
  academy: Academy;
  colors: ThemeColors;
  primaryColor: string;
  canManage: boolean;
}

export const AcademyBanner = memo(function AcademyBanner({
  academy,
  colors,
  primaryColor,
  canManage,
}: AcademyBannerProps) {
  return (
    <>
      {/* Banner */}
      <View style={styles.bannerContainer}>
        {academy.bannerUrl ? (
          <Image source={{ uri: academy.bannerUrl }} style={styles.banner} />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: primaryColor }]} />
        )}
        <View style={[styles.bannerOverlay, { backgroundColor: withAlpha(colors.text, 0.2) }]} />
        <Clickable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: withAlpha(colors.text, 0.4) }]}
        >
          <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
        </Clickable>
        {canManage && (
          <Clickable
            accessibilityLabel="Academy settings"
            onPress={() => router.push(Routes.academySettings(academy.id))}
            style={[styles.settingsButton, { backgroundColor: withAlpha(colors.text, 0.4) }]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.onPrimary} />
          </Clickable>
        )}
      </View>

      {/* Logo & Name */}
      <View style={styles.logoSection}>
        {academy.logoUrl ? (
          <Image source={{ uri: academy.logoUrl }} style={[styles.logo, { borderColor: colors.onPrimary }]} />
        ) : (
          <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor, borderColor: colors.onPrimary }]}>
            <ThemedText style={[styles.logoText, { color: colors.onPrimary }]}>
              {academy.name.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
        )}
        <ThemedText type="title" style={styles.academyName}>
          {academy.name}
        </ThemedText>
        <Row style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color={colors.muted} />
          <ThemedText style={[styles.location, { color: colors.muted }]}>
            {academy.city}
          </ThemedText>
        </Row>
        {academy.rating && (
          <Row style={styles.ratingRow}>
            <Ionicons name="star" size={14} color={colors.warning} />
            <ThemedText style={styles.ratingText}>
              {academy.rating.average.toFixed(1)}
            </ThemedText>
            <ThemedText style={[styles.reviewCount, { color: colors.muted }]}>
              ({academy.rating.reviewCount} reviews)
            </ThemedText>
          </Row>
        )}
      </View>
    </>
  );
});

const styles = StyleSheet.create({
  bannerContainer: { position: 'relative', height: 180 },
  banner: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%' },
  bannerOverlay: { ...StyleSheet.absoluteFillObject },
  backButton: {
    position: 'absolute', top: Spacing.md, left: Spacing.md,
    width: 40, height: 40, borderRadius: Radii.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute', top: Spacing.md, right: Spacing.md,
    width: 40, height: 40, borderRadius: Radii.xl,
    alignItems: 'center', justifyContent: 'center',
  },
  logoSection: { alignItems: 'center', marginTop: -50, paddingHorizontal: Spacing.lg },
  logo: { width: 100, height: 100, borderRadius: Radii.pill, borderWidth: 4 },
  logoPlaceholder: {
    width: 100, height: 100, borderRadius: Radii.pill, borderWidth: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { ...Typography.display },
  academyName: { marginTop: Spacing.sm, textAlign: 'center' },
  locationRow: { alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.xxs },
  location: { ...Typography.small },
  ratingRow: { alignItems: 'center', gap: Spacing.xxs, marginTop: Spacing.xs },
  ratingText: { ...Typography.bodySmallSemiBold },
  reviewCount: { ...Typography.small },
});
