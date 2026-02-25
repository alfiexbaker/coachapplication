import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

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
