import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Button } from '@/components/primitives/button';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { withRoleGuard } from '@/components/auth/with-role-guard';

function AthleteGoalsScreen() {
  const { athleteId } = useLocalSearchParams<{ athleteId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={{ flex: 1 }}>
          Athlete Goals
        </ThemedText>
      </View>

      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="flag-outline" size={48} color={palette.tint} />
        </View>

        <ThemedText type="subtitle" style={styles.title}>
          Goal Tracking
        </ThemedText>

        <SurfaceCard style={styles.card}>
          <ThemedText style={[styles.description, { color: palette.muted }]}>
            This feature is coming soon. You will be able to set and track development goals
            for your athletes.
          </ThemedText>

          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              <ThemedText>Set skill-based goals</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              <ThemedText>Track progress over time</ThemedText>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              <ThemedText>Share achievements with parents</ThemedText>
            </View>
          </View>
        </SurfaceCard>

        <Button onPress={() => router.back()}>
          Go Back
        </Button>
      </View>
    </SafeAreaView>
  );
}

export default withRoleGuard(AthleteGoalsScreen, ['COACH', 'ADMIN']);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
  },
  card: {
    width: '100%',
    gap: Spacing.md,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
