import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

import { PageHeader } from '@/components/primitives/page-header';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { Routes } from '@/navigation/routes';

function toTitleCase(value: string): string {
  if (!value) return 'Skills';
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

export default function SkillCategoryScreen() {
  const { colors } = useScreen<null>({
    load: async () => ok(null),
    isEmpty: () => false,
  });
  const { category } = useLocalSearchParams<{ category?: string }>();

  const title = useMemo(() => toTitleCase(category ?? 'skills'), [category]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <PageHeader
        title={`${title} Skills`}
        subtitle="Development data is captured in progress and session reviews"
      />

      <View style={styles.content}>
        <SurfaceCard>
          <View style={styles.cardBody}>
            <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
              This category view is linked and available. Use the progress dashboard for full skill trend
              history, coach notes, and session-level changes.
            </ThemedText>

            <Clickable
              accessibilityLabel="Open progress dashboard"
              onPress={() => router.push(Routes.DEVELOPMENT_MY_PROGRESS)}
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            >
              <ThemedText style={[styles.primaryButtonText, { color: colors.onPrimary }]}>
                Open My Progress
              </ThemedText>
            </Clickable>
          </View>
        </SurfaceCard>
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
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  cardBody: {
    gap: Spacing.md,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...Typography.bodySmallSemiBold,
  },
});

