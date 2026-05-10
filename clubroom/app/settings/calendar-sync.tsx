import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsScreenState, SettingsSection, SettingsToggleRow } from '@/components/settings';
import { SubmitProgressState } from '@/components/ui/screen-states';
import { CalendarProviderSelect } from '@/components/calendar/CalendarProviderSelect';
import { SyncSettingsCard } from '@/components/calendar/SyncSettingsCard';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCalendarSync } from '@/hooks/use-calendar-sync';

export default function CalendarSyncScreen() {
  const { colors: palette } = useTheme();
  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    isSaving,
    isExporting,
    settings,
    handleToggleEnabled,
    handleToggleAutoSync,
    handleToggleLocation,
    handleToggleNotes,
    handleProviderChange,
    handleReminderChange,
    handleExportAllSessions,
  } = useCalendarSync();

  const header = (
    <PageHeader
      title="Calendar Sync"
      showBack
      backIcon="arrow-back"
      onBackPress={() => router.back()}
      centerTitle
    />
  );

  if (status === 'loading') {
    return (
      <SettingsScreenState
        colors={palette}
        header={header}
        status="loading"
        errorMessage="Failed to load calendar settings."
        onRetry={retry}
        loadingVariant="form"
      />
    );
  }

  if (status === 'error') {
    return (
      <SettingsScreenState
        colors={palette}
        header={header}
        status="error"
        errorMessage={error ?? 'Failed to load calendar settings.'}
        onRetry={retry}
        loadingVariant="form"
      />
    );
  }

  return (
    <SettingsScreenState
      colors={palette}
      header={header}
      status="ready"
      errorMessage="Failed to load calendar settings."
      onRetry={retry}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
        {isSaving ? (
          <SubmitProgressState
            label="Saving calendar sync settings..."
            style={styles.submitProgress}
          />
        ) : null}

        <SettingsSection title="Sync Settings">
          <SettingsToggleRow
            icon="sync"
            title="Enable Calendar Sync"
            subtitle="Sync your sessions with your calendar"
            value={settings.enabled}
            onValueChange={handleToggleEnabled}
          />
          <SettingsToggleRow
            icon="flash"
            title="Auto-Sync New Bookings"
            subtitle="Automatically add new bookings to calendar"
            value={settings.autoSync}
            onValueChange={handleToggleAutoSync}
            disabled={!settings.enabled}
          />
        </SettingsSection>

        <SettingsSection title="Calendar Provider">
          <CalendarProviderSelect
            selectedProvider={settings.provider}
            onProviderChange={handleProviderChange}
            disabled={!settings.enabled}
          />
        </SettingsSection>

        <SettingsSection title="Event Details">
          <SettingsToggleRow
            icon="location"
            title="Include Location"
            subtitle="Add session location to calendar events"
            value={settings.includeLocation}
            onValueChange={handleToggleLocation}
            disabled={!settings.enabled}
          />
          <SettingsToggleRow
            icon="document-text"
            title="Include Notes"
            subtitle="Add session notes and details"
            value={settings.includeNotes}
            onValueChange={handleToggleNotes}
            disabled={!settings.enabled}
          />
        </SettingsSection>

        <SettingsSection title="Reminders">
          <SyncSettingsCard
            reminderMinutes={settings.reminderMinutes}
            onReminderChange={handleReminderChange}
            disabled={!settings.enabled}
          />
        </SettingsSection>

        <SettingsSection title="Export">
          <View style={styles.exportSection}>
            <ThemedText style={[styles.exportDescription, { color: palette.muted }]}>
              Export all your upcoming sessions to your calendar app.
            </ThemedText>
            <Button
              onPress={handleExportAllSessions}
              disabled={isExporting}
              variant="primary"
              style={styles.exportButton}
            >
              <Row gap="sm" align="center">
                {!isExporting ? (
                  <Ionicons name="download-outline" size={20} color={palette.onPrimary} />
                ) : null}
                <ThemedText style={{ color: palette.onPrimary, ...Typography.subheading }}>
                  {isExporting ? 'Exporting...' : 'Export All Sessions'}
                </ThemedText>
              </Row>
            </Button>
          </View>
        </SettingsSection>

        {settings.lastSyncAt && (
          <View style={styles.lastSyncContainer}>
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Last synced: {new Date(settings.lastSyncAt).toLocaleString()}
            </ThemedText>
          </View>
        )}

        <View style={styles.infoContainer}>
          <ThemedText style={[styles.infoText, { color: palette.muted }]}>
            Calendar sync allows you to keep your training sessions organized in your preferred
            calendar app.
          </ThemedText>
        </View>
      </ScrollView>
    </SettingsScreenState>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
  submitProgress: { marginBottom: Spacing.xs },
  exportSection: { padding: Spacing.md, gap: Spacing.md },
  exportDescription: { ...Typography.bodySmall },
  exportButton: { marginTop: Spacing.xs },
  lastSyncContainer: { alignItems: 'center', paddingVertical: Spacing.sm },
  infoContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  infoText: { ...Typography.small, textAlign: 'center' },
});
