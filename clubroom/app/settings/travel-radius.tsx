import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';

export default function TravelRadiusScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const postcode = currentUser?.postcode ?? 'Not set';

  return (
    <SettingsFormScreen title="Travel Radius">
      <ThemedText style={[styles.description, { color: palette.muted }]}>
        {`Set how far you're willing to travel for coaching sessions. Parents searching nearby will see you in their results.`}
      </ThemedText>

      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Your Location</ThemedText>
        <Row gap="sm" align="center">
          <Ionicons name="location" size={20} color={palette.tint} />
          <ThemedText>{postcode}</ThemedText>
        </Row>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Travel Radius</ThemedText>
        <ThemedText style={{ color: palette.muted }}>
          Your current travel radius is set to your default location. Parents within this area will
          see you when searching for coaches.
        </ThemedText>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <Row gap="sm" align="flex-start">
          <Ionicons name="information-circle" size={20} color={palette.tint} />
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Advanced radius settings with map-based selection will be available in a future update.
            You can update your postcode from your profile settings.
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
