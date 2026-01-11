import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';

const logger = createLogger('NotFound');

/**
 * 404 Catch-all route - handles navigation to non-existent routes
 */
export default function NotFoundScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const pathname = usePathname();

  // Log the 404 attempt
  React.useEffect(() => {
    logger.warn('Page not found', { pathname });
  }, [pathname]);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: `${palette.muted}15` }]}>
          <Ionicons name="help-circle-outline" size={64} color={palette.muted} />
        </View>

        {/* Title */}
        <ThemedText type="title" style={styles.title}>
          Page Not Found
        </ThemedText>

        {/* Description */}
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          The page you're looking for doesn't exist or has been moved.
        </ThemedText>

        {/* Path Card */}
        <SurfaceCard style={styles.pathCard}>
          <View style={styles.pathHeader}>
            <Ionicons name="link-outline" size={18} color={palette.muted} />
            <ThemedText style={[styles.pathLabel, { color: palette.muted }]}>
              Requested path
            </ThemedText>
          </View>
          <ThemedText
            type="defaultSemiBold"
            style={[styles.pathText, { backgroundColor: palette.surface }]}
            numberOfLines={2}
          >
            {pathname}
          </ThemedText>
        </SurfaceCard>

        {/* Suggestions */}
        <SurfaceCard style={styles.suggestionsCard}>
          <ThemedText type="defaultSemiBold" style={styles.suggestionsTitle}>
            What you can do:
          </ThemedText>
          <View style={styles.suggestionsList}>
            <View style={styles.suggestionItem}>
              <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
              <ThemedText style={{ flex: 1 }}>Check the URL for typos</ThemedText>
            </View>
            <View style={styles.suggestionItem}>
              <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
              <ThemedText style={{ flex: 1 }}>Use the navigation menu to find what you need</ThemedText>
            </View>
            <View style={styles.suggestionItem}>
              <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
              <ThemedText style={{ flex: 1 }}>Go back to the home screen</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        {/* Actions */}
        <View style={styles.actions}>
          <Button onPress={handleGoBack} variant="outline" style={styles.button}>
            Go Back
          </Button>
          <Button onPress={handleGoHome} style={styles.button}>
            Go Home
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  pathCard: {
    width: '100%',
    gap: Spacing.sm,
  },
  pathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  pathLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  pathText: {
    fontSize: 13,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    fontFamily: 'monospace',
  },
  suggestionsCard: {
    width: '100%',
    gap: Spacing.sm,
  },
  suggestionsTitle: {
    marginBottom: Spacing.xs,
  },
  suggestionsList: {
    gap: Spacing.sm,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  button: {
    flex: 1,
    minWidth: 120,
  },
});
