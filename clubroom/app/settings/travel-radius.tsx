import { RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen, SettingsSection, SettingsToggleRow } from '@/components/settings';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { ErrorState, LoadingState, SubmitProgressState } from '@/components/ui/screen-states';
import { StatusBanner } from '@/components/ui/primitives/StatusBanner';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useTravelRadiusSettings } from '@/hooks/use-travel-radius-settings';

export default function TravelRadiusScreen() {
  const { colors: palette } = useTheme();
  const {
    settings,
    postcode,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    saving,
    canSave,
    update,
  } = useTravelRadiusSettings();

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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
      }
    >
      {error ? <StatusBanner message={error} variant="error" /> : null}

      <SettingsSection title="Service area">
        <View style={styles.settingRow}>
          <View
            style={[styles.iconContainer, { backgroundColor: withAlpha(palette.accent, 0.09) }]}
          >
            <Ionicons name="location-outline" size={22} color={palette.accent} />
          </View>
          <View style={styles.settingContent}>
            <ThemedText type="defaultSemiBold">Base postcode</ThemedText>
          </View>
          <ThemedText style={[styles.postcode, { color: palette.muted }]}>{postcode}</ThemedText>
        </View>

        <View style={[styles.divider, { backgroundColor: palette.border }]} />

        <View style={styles.radiusRow}>
          <ThemedText type="defaultSemiBold" style={styles.radiusLabel}>
            Search radius
          </ThemedText>
          <Row align="center" gap="xs">
            <Clickable
              onPress={() => update('radiusMiles', Math.max(1, settings.radiusMiles - 1))}
              style={[styles.stepperButton, { backgroundColor: palette.background }]}
              disabled={!canSave || saving || settings.radiusMiles <= 1}
              accessibilityRole="button"
              accessibilityLabel="Decrease in-person radius"
              accessibilityState={{ disabled: !canSave || saving || settings.radiusMiles <= 1 }}
            >
              <Ionicons name="remove" size={18} color={palette.text} />
            </Clickable>
            <ThemedText style={styles.radiusValue}>{settings.radiusMiles} mi</ThemedText>
            <Clickable
              onPress={() => update('radiusMiles', Math.min(50, settings.radiusMiles + 1))}
              style={[styles.stepperButton, { backgroundColor: palette.background }]}
              disabled={!canSave || saving || settings.radiusMiles >= 50}
              accessibilityRole="button"
              accessibilityLabel="Increase in-person radius"
              accessibilityState={{ disabled: !canSave || saving || settings.radiusMiles >= 50 }}
            >
              <Ionicons name="add" size={18} color={palette.text} />
            </Clickable>
          </Row>
        </View>
      </SettingsSection>

      <SettingsSection title="Session formats">
        <SettingsToggleRow
          icon="football-outline"
          title="In-person sessions"
          subtitle="Shown in local search"
          value={settings.acceptsTravelSessions}
          onValueChange={(value) => update('acceptsTravelSessions', value)}
          disabled={!canSave || saving}
        />
        <View style={[styles.divider, { backgroundColor: palette.border }]} />
        <SettingsToggleRow
          icon="videocam-outline"
          title="Remote sessions"
          subtitle="No distance limit"
          value={settings.acceptsRemoteSessions}
          onValueChange={(value) => update('acceptsRemoteSessions', value)}
          disabled={!canSave || saving}
        />
      </SettingsSection>

      {saving ? <SubmitProgressState label="Saving..." /> : null}
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    minHeight: 64,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: { flex: 1, minWidth: 0 },
  postcode: { ...Typography.body, flexShrink: 1, maxWidth: '35%', textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 56 + Spacing.sm },
  radiusRow: {
    minHeight: 64,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  radiusLabel: { flexShrink: 1 },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusValue: { ...Typography.bodySemiBold, minWidth: 44, textAlign: 'center' },
});
