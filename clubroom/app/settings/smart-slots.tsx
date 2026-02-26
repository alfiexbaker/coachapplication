import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Button } from '@/components/primitives/button';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { DemoBanner, isDemoMode } from '@/utils/demo-mode';

const SMART_FEATURES = [
  {
    icon: 'analytics-outline' as const,
    title: 'Peak Time Detection',
    description: 'Identifies when parents most frequently book so you can prioritise those slots.',
  },
  {
    icon: 'time-outline' as const,
    title: 'Gap Filling',
    description: 'Suggests opening slots between existing bookings to reduce downtime.',
  },
  {
    icon: 'trending-up-outline' as const,
    title: 'Demand-Based Pricing',
    description: 'Recommends adjusting pricing for high-demand time slots.',
  },
];

export default function SmartSlotsScreen() {
  const { colors: palette } = useTheme();
  const demoMode = isDemoMode();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Smart Slots"
        showBack
        backIcon="arrow-back"
        onBackPress={() => router.back()}
        centerTitle
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.description, { color: palette.muted }]}>
          Smart slot suggestions use your booking history to recommend the best times to offer
          coaching sessions.
        </ThemedText>
        {demoMode ? (
          <DemoBanner message="Smart Slots is currently running in demo mode in this environment." />
        ) : null}

        {SMART_FEATURES.map((feature) => (
          <SurfaceCard key={feature.title} style={styles.card}>
            <Row gap="sm" align="flex-start">
              <Ionicons name={feature.icon} size={24} color={palette.tint} />
              <View style={styles.featureText}>
                <ThemedText type="defaultSemiBold">{feature.title}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{feature.description}</ThemedText>
              </View>
            </Row>
          </SurfaceCard>
        ))}

        <SurfaceCard style={styles.card}>
          <Row gap="sm" align="flex-start">
            <Ionicons name="sparkles" size={20} color={palette.warning} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Smart suggestions will become more accurate as you complete more sessions. Keep coaching
              and the algorithm will learn your best times.
            </ThemedText>
          </Row>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <Column gap="sm">
            <ThemedText type="defaultSemiBold">Turn suggestions into action</ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              Smart Slots insights are informational right now. Apply them by updating your
              availability or reviewing your schedule.
            </ThemedText>
            <Button onPress={() => router.push(Routes.AVAILABILITY)}>Open Availability</Button>
            <Button variant="secondary" onPress={() => router.push(Routes.SCHEDULE)}>
              Review Schedule
            </Button>
          </Column>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  description: { ...Typography.body },
  card: { gap: Spacing.sm },
  featureText: { flex: 1, gap: Spacing.micro },
  infoText: { flex: 1, ...Typography.small },
});
