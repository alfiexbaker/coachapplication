import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Social feed redirect component.
 * This component redirects users to the Feed tab for aggregated social content.
 */
export function SocialFeed() {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <SurfaceCard style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
          <Ionicons name="newspaper" size={32} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          Your Club Feed
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          See updates from all your clubs in one place. Announcements, photos, and events from every
          club you are part of.
        </ThemedText>
        <Clickable
          style={[styles.button, { backgroundColor: palette.tint }]}
          onPress={() => router.push(Routes.FEED)}
        >
          <ThemedText style={[styles.buttonText, { color: palette.onPrimary }]}>
            Go to Feed
          </ThemedText>
          <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
        </Clickable>
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  card: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Spacing.md,
    marginTop: Spacing.sm,
  },
  buttonText: {
    fontWeight: '600',
  },
});
