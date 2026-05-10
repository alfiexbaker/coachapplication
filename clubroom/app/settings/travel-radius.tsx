import { RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState, SubmitProgressState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTravelRadiusSettings } from '@/hooks/use-travel-radius-settings';

export default function TravelRadiusScreen() {
  const { colors: palette } = useTheme();
  const { settings, postcode, status, error, refreshing, onRefresh, retry, saving, update } =
    useTravelRadiusSettings();

  if (!settings) {
    return (
      <SettingsFormScreen title="Travel Radius">
        {status === 'error' ? (
          <ErrorState message={error ?? 'Failed to load travel settings.'} onRetry={retry} />
        ) : (
          <LoadingState variant="form" />
        )}
      </SettingsFormScreen>
    );
  }

  return (
    <SettingsFormScreen
      title="Travel Radius"
      infoText={error ?? 'Parents searching nearby will see you within this service radius.'}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
      }
    >
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Your Location</ThemedText>
        <Row gap="sm" align="center">
          <Ionicons name="location" size={20} color={palette.tint} />
          <ThemedText>{postcode}</ThemedText>
        </Row>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold">Travel Radius</ThemedText>
        <Row align="center" justify="space-between">
          <Clickable
            onPress={() => update('radiusMiles', Math.max(1, settings.radiusMiles - 1))}
            style={styles.stepper}
          >
            <Ionicons name="remove" size={20} color={palette.text} />
          </Clickable>
          <View style={styles.radiusValue}>
            <ThemedText type="title">{settings.radiusMiles} miles</ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              Discovery radius for in-person sessions
            </ThemedText>
          </View>
          <Clickable
            onPress={() => update('radiusMiles', Math.min(50, settings.radiusMiles + 1))}
            style={styles.stepper}
          >
            <Ionicons name="add" size={20} color={palette.text} />
          </Clickable>
        </Row>
        <ThemedText style={[Typography.small, { color: palette.muted }]}>
          Suggested range: 5-20 miles for local grassroots coverage.
        </ThemedText>
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <Row justify="space-between" align="center">
          <View style={styles.toggleText}>
            <ThemedText type="defaultSemiBold">Accept travel sessions</ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              Show in search for in-person bookings inside your radius
            </ThemedText>
          </View>
          <Clickable
            onPress={() => update('acceptsTravelSessions', !settings.acceptsTravelSessions)}
          >
            <Ionicons
              name={settings.acceptsTravelSessions ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={settings.acceptsTravelSessions ? palette.success : palette.muted}
            />
          </Clickable>
        </Row>
        <Row justify="space-between" align="center">
          <View style={styles.toggleText}>
            <ThemedText type="defaultSemiBold">Accept remote sessions</ThemedText>
            <ThemedText style={{ color: palette.muted }}>
              Keep remote/virtual sessions available even outside your local radius
            </ThemedText>
          </View>
          <Clickable
            onPress={() => update('acceptsRemoteSessions', !settings.acceptsRemoteSessions)}
          >
            <Ionicons
              name={settings.acceptsRemoteSessions ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={settings.acceptsRemoteSessions ? palette.success : palette.muted}
            />
          </Clickable>
        </Row>
      </SurfaceCard>

      {saving ? <SubmitProgressState label="Saving travel settings..." /> : null}
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm, marginBottom: Spacing.md },
  stepper: { padding: Spacing.sm },
  radiusValue: { alignItems: 'center', flex: 1, gap: Spacing.micro },
  toggleText: { flex: 1, gap: Spacing.micro, paddingRight: Spacing.sm },
});
