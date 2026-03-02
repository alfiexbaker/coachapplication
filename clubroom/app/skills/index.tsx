import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { Routes } from '@/navigation/routes';

const SKILL_CATEGORIES = [
  { key: 'technical', label: 'Technical', icon: 'football-outline' },
  { key: 'tactical', label: 'Tactical', icon: 'analytics-outline' },
  { key: 'physical', label: 'Physical', icon: 'barbell-outline' },
  { key: 'mental', label: 'Mental', icon: 'bulb-outline' },
] as const;

export default function SkillsIndexScreen() {
  const { colors } = useScreen<null>({
    load: async () => ok(null),
    isEmpty: () => false,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <PageHeader title="Skills" subtitle="Track development pillars and coach feedback" />

      <View style={styles.content}>
        <SurfaceCard>
          <View style={styles.cardBody}>
            <ThemedText style={[Typography.bodySmall, { color: colors.muted }]}>
              Skill tracking lives in your progress views. Pick a category for focused entries, or open
              your full progress dashboard.
            </ThemedText>

            <Row style={styles.categoriesRow}>
              {SKILL_CATEGORIES.map((category) => (
                <Clickable
                  key={category.key}
                  accessibilityLabel={`Open ${category.label} skills`}
                  onPress={() => router.push(Routes.skillCategory(category.key))}
                  style={[
                    styles.categoryPill,
                    {
                      borderColor: colors.border,
                      backgroundColor: withAlpha(colors.tint, 0.08),
                    },
                  ]}
                >
                  <Ionicons
                    name={category.icon as keyof typeof Ionicons.glyphMap}
                    size={14}
                    color={colors.tint}
                  />
                  <ThemedText style={[styles.categoryText, { color: colors.tint }]}>
                    {category.label}
                  </ThemedText>
                </Clickable>
              ))}
            </Row>

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
  categoriesRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  categoryPill: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: Radii.pill,
    paddingHorizontal: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  categoryText: {
    ...Typography.smallSemiBold,
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

