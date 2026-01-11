import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Social feed redirect component.
 * This component redirects users to the Feed tab for aggregated social content.
 */
export function SocialFeed() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      <SurfaceCard style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: `${palette.tint}10` }]}>
          <Ionicons name="newspaper" size={32} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          Your Club Feed
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          See updates from all your clubs in one place. Announcements, photos, and events from every club you are part of.
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.tint }]}
          onPress={() => router.push('/(tabs)/feed')}
        >
          <ThemedText style={styles.buttonText}>Go to Feed</ThemedText>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
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
    borderRadius: 32,
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
    color: '#fff',
    fontWeight: '600',
  },
});
