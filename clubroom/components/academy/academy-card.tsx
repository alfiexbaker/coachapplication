import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { Academy } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { CompactAcademyCard } from './academy-card-sections';
export type { CompactAcademyCardProps } from './academy-card-sections';

import { CompactAcademyCard } from './academy-card-sections';

interface AcademyCardProps {
  academy: Academy;
  onPress?: () => void;
  compact?: boolean;
}

export function AcademyCard({ academy, onPress, compact = false }: AcademyCardProps) {
  const { colors: palette } = useTheme();
  const primaryColor = academy.primaryColor || palette.tint;

  if (compact) {
    return <CompactAcademyCard academy={academy} primaryColor={primaryColor} palette={palette} onPress={onPress} />;
  }

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.bannerContainer}>
        {academy.bannerUrl ? (
          <Image source={{ uri: academy.bannerUrl }} style={styles.banner} />
        ) : (
          <View style={[styles.bannerPlaceholder, { backgroundColor: primaryColor }]} />
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.logoRow}>
          {academy.logoUrl ? (
            <Image source={{ uri: academy.logoUrl }} style={[styles.logo, { borderColor: palette.surface }]} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: primaryColor, borderColor: palette.surface }]}>
              <ThemedText style={[styles.logoText, { color: palette.onPrimary }]}>{academy.name.slice(0, 2).toUpperCase()}</ThemedText>
            </View>
          )}
          <View style={styles.titleSection}>
            <ThemedText type="defaultSemiBold" numberOfLines={1}>{academy.name}</ThemedText>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={palette.muted} />
              <ThemedText style={[styles.location, { color: palette.muted }]}>{academy.city}</ThemedText>
            </View>
          </View>
        </View>

        {academy.description && (
          <ThemedText style={[styles.description, { color: palette.muted }]} numberOfLines={2}>{academy.description}</ThemedText>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Ionicons name="people" size={14} color={primaryColor} />
            <ThemedText style={[styles.statText, { color: palette.muted }]}>{academy.coachCount} coaches</ThemedText>
          </View>
          <View style={styles.stat}>
            <Ionicons name="person" size={14} color={primaryColor} />
            <ThemedText style={[styles.statText, { color: palette.muted }]}>{academy.athleteCount} athletes</ThemedText>
          </View>
          {academy.rating && (
            <View style={styles.stat}>
              <Ionicons name="star" size={14} color={palette.rating} />
              <ThemedText style={[styles.statText, { color: palette.muted }]}>{academy.rating.average.toFixed(1)}</ThemedText>
            </View>
          )}
        </View>

        {academy.specialties && academy.specialties.length > 0 && (
          <View style={styles.tagsRow}>
            {academy.specialties.slice(0, 3).map((specialty) => (
              <View key={specialty} style={[styles.tag, { backgroundColor: withAlpha(primaryColor, 0.09) }]}>
                <ThemedText style={[styles.tagText, { color: primaryColor }]}>{specialty}</ThemedText>
              </View>
            ))}
            {academy.specialties.length > 3 && (
              <View style={[styles.tag, { backgroundColor: palette.surfaceSecondary }]}>
                <ThemedText style={[styles.tagText, { color: palette.muted }]}>+{academy.specialties.length - 3}</ThemedText>
              </View>
            )}
          </View>
        )}
      </View>
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  bannerContainer: { height: 100 },
  banner: { width: '100%', height: '100%' },
  bannerPlaceholder: { width: '100%', height: '100%' },
  content: { padding: Spacing.md, gap: Spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: -32 },
  logo: { width: 56, height: 56, borderRadius: Radii['2xl'], borderWidth: 3 },
  logoPlaceholder: { width: 56, height: 56, borderRadius: Radii['2xl'], borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  logoText: { ...Typography.heading },
  titleSection: { flex: 1, marginTop: 24 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.micro, marginTop: Spacing.micro },
  location: { ...Typography.caption },
  description: { ...Typography.small, lineHeight: 18 },
  statsRow: { flexDirection: 'row', gap: Spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs },
  statText: { ...Typography.caption },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { paddingHorizontal: 8, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  tagText: { ...Typography.caption },
});
