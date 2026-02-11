import { ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsSection, SettingsToggleRow } from '@/components/settings';
import { CalendarProviderSelect } from '@/components/calendar/CalendarProviderSelect';
import { SyncSettingsCard } from '@/components/calendar/SyncSettingsCard';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
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

  if (status === 'loading') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Calendar Sync
          </ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top']}
      >
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Calendar Sync
          </ThemedText>
          <View style={{ width: 24 }} />
        </Row>
        <ErrorState message={error ?? 'Failed to load calendar settings.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Calendar Sync
        </ThemedText>
        {isSaving ? (
          <ActivityIndicator size="small" color={palette.accent} />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </Row>

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
                {isExporting ? (
                  <ActivityIndicator size="small" color={palette.onPrimary} />
                ) : (
                  <Ionicons name="download-outline" size={20} color={palette.onPrimary} />
                )}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.heading },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing.md },
  loadingText: { ...Typography.bodySmall },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'], gap: Spacing.lg },
  exportSection: { padding: Spacing.md, gap: Spacing.md },
  exportDescription: { ...Typography.bodySmall },
  exportButton: { marginTop: Spacing.xs },
  lastSyncContainer: { alignItems: 'center', paddingVertical: Spacing.sm },
  infoContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  infoText: { ...Typography.small, textAlign: 'center' },
});
