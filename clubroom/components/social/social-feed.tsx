import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/**
 * Social feed has been moved to club-centric design.
 * This component now redirects users to the Club tab for social features.
 */
export function SocialFeed() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={styles.container}>
      <SurfaceCard style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: `${palette.tint}10` }]}>
          <Ionicons name="people" size={32} color={palette.tint} />
        </View>
        <ThemedText type="subtitle" style={styles.title}>
          Social lives in your Club
        </ThemedText>
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          Stay connected with your club community. All social features, posts, and updates are now part of your club experience.
        </ThemedText>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: palette.tint }]}
          onPress={() => router.push('/(tabs)/club-hub')}
        >
          <ThemedText style={styles.buttonText}>Go to Club</ThemedText>
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
