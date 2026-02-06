/**
 * Dynamic Comparison Screen
 *
 * Displays comparison for specific coach IDs passed in the URL.
 * URL format: /compare/coach1,coach2,coach3
 */

import { useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ComparisonTable } from '@/components/compare/ComparisonTable';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CompareScreen');

export default function DynamicCompareScreen() {
  const { ids } = useLocalSearchParams<{ ids: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Parse coach IDs from comma-separated string
  const coachIds = useMemo(() => ids ? ids.split(',').filter(Boolean) : [], [ids]);

  const handleCoachRemoved = useCallback(
    (removedId: string) => {
      const remainingIds = coachIds.filter((id) => id !== removedId);
      if (remainingIds.length === 0) {
        router.back();
      } else {
        router.replace(Routes.compareCoaches(remainingIds.join(',')));
      }
    },
    [coachIds]
  );

  const handleShare = useCallback(async () => {
    logger.press('ShareComparison', { coachCount: coachIds.length });
    const shareUrl = `clubroom://compare/${coachIds.join(',')}`;
    try {
      await Share.share({
        message: `Compare these coaches on Clubroom: ${shareUrl}`,
        url: shareUrl,
        title: 'Coach Comparison',
      });
    } catch (error) {
      logger.error('Failed to share', error);
      Alert.alert('Share', `Share this link: ${shareUrl}`);
    }
  }, [coachIds]);

  if (coachIds.length === 0) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Compare Coaches',
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
          }}
        />
        <SafeAreaView
          style={[styles.container, { backgroundColor: palette.background }]}
          edges={['bottom']}
        >
          <View style={styles.errorState}>
            <View style={[styles.errorIcon, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="alert-circle" size={48} color={palette.error} />
            </View>
            <ThemedText type="subtitle" style={styles.errorTitle}>
              Invalid Comparison Link
            </ThemedText>
            <ThemedText style={[styles.errorText, { color: palette.muted }]}>
              No coach IDs were provided in the URL. Please use a valid comparison link.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.light.onPrimary} />
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  if (coachIds.length > 3) {
    return (
      <>
        <Stack.Screen
          options={{
            headerShown: true,
            title: 'Compare Coaches',
            headerStyle: { backgroundColor: palette.background },
            headerTintColor: palette.text,
          }}
        />
        <SafeAreaView
          style={[styles.container, { backgroundColor: palette.background }]}
          edges={['bottom']}
        >
          <View style={styles.errorState}>
            <View style={[styles.errorIcon, { backgroundColor: palette.surfaceSecondary }]}>
              <Ionicons name="warning" size={48} color={palette.warning} />
            </View>
            <ThemedText type="subtitle" style={styles.errorTitle}>
              Too Many Coaches
            </ThemedText>
            <ThemedText style={[styles.errorText, { color: palette.muted }]}>
              You can compare a maximum of 3 coaches at once. Please reduce your selection.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                {
                  backgroundColor: pressed ? palette.tintPressed : palette.tint,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={18} color={Colors.light.onPrimary} />
              <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Compare Coaches',
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.text,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share comparison"
              onPress={handleShare}
              style={styles.headerButton}
            >
              <Ionicons name="share-outline" size={22} color={palette.icon} />
            </Pressable>
          ),
        }}
      />

      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        {/* Status bar */}
        <View style={[styles.statusBar, { borderBottomColor: palette.border }]}>
          <View style={styles.statusInfo}>
            <Ionicons name="git-compare" size={18} color={palette.icon} />
            <ThemedText style={styles.statusText}>
              Comparing {coachIds.length} {coachIds.length === 1 ? 'coach' : 'coaches'}
            </ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <ThemedText style={[styles.badgeText, { color: palette.success }]}>
              Shared Comparison
            </ThemedText>
          </View>
        </View>

        {/* Comparison table with specific IDs */}
        <ComparisonTable coachIds={coachIds} onCoachRemoved={handleCoachRemoved} />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusText: {
    ...Typography.bodySmallSemiBold,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  badgeText: {
    ...Typography.caption,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  errorTitle: {
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.bodySmall,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    maxWidth: 280,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.button,
  },
  backButtonText: {
    color: Colors.light.onPrimary,
    ...Typography.bodySemiBold,
  },
});
