import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';
import { useSmartSlotSuggestions } from '@/hooks/use-smart-slot-suggestions';

export default function SmartSlotsScreen() {
  const { colors: palette } = useTheme();
  const { suggestions, loading, error, refreshing, onRefresh } = useSmartSlotSuggestions();

  return (
    <SettingsFormScreen
      title="Smart Slots"
      infoText={error ?? 'Suggestions update from your actual booking history and help decide where to open more capacity.'}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={palette.accent} />}
      >
        {suggestions.map((feature) => (
          <SurfaceCard key={feature.id} style={styles.card}>
            <Row gap="sm" align="flex-start">
              <Ionicons name="sparkles-outline" size={24} color={palette.tint} />
              <Column gap="xs" style={styles.featureText}>
                <ThemedText type="defaultSemiBold">{feature.title}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{feature.detail}</ThemedText>
                <ThemedText style={[Typography.small, { color: palette.success }]}>
                  {feature.impact}
                </ThemedText>
              </Column>
            </Row>
          </SurfaceCard>
        ))}

        <SurfaceCard style={styles.card}>
          <Column gap="sm">
            <ThemedText type="defaultSemiBold">Turn insights into action</ThemedText>
            <Button onPress={() => router.push(Routes.AVAILABILITY)}>Open Availability</Button>
            <Button variant="secondary" onPress={() => router.push(Routes.SCHEDULE)}>
              Review Schedule
            </Button>
          </Column>
        </SurfaceCard>
      </ScrollView>
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, marginBottom: Spacing.md },
  featureText: { flex: 1 },
});
