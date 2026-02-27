import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Routes } from '@/navigation/routes';

export default function BlockedDatesScreen() {
  const { colors: palette } = useTheme();

  return (
    <SettingsFormScreen title="Blocked Dates">
      <ThemedText style={[styles.description, { color: palette.muted }]}>
        {`Block specific dates when you're unavailable for coaching. Parents won't be able to book sessions on these dates.`}
      </ThemedText>

      <EmptyState
        icon="calendar-outline"
        title="No blocked dates"
        message="You can block dates from your availability calendar. Tap below to manage your schedule."
        actionLabel="Go to Availability"
        onPressAction={() => router.push(Routes.AVAILABILITY_CALENDAR)}
      />

      <SurfaceCard style={styles.card}>
        <Row gap="sm" align="flex-start">
          <Ionicons name="information-circle" size={20} color={palette.tint} />
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            {`You can also block dates directly from the Availability calendar using the "Block Date" option. Blocked dates will be shown here for easy management.`}
          </ThemedText>
        </Row>
      </SurfaceCard>
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  description: { ...Typography.body },
  card: { gap: Spacing.sm },
  infoText: { flex: 1, ...Typography.small },
});
