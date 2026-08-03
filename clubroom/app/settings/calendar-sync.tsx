import { ScrollView, StyleSheet, View, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsScreenState, SettingsSection, SettingsToggleRow } from '@/components/settings';
import { SubmitProgressState } from '@/components/ui/screen-states';
import { SyncSettingsCard } from '@/components/calendar/SyncSettingsCard';
import { Button } from '@/components/primitives/button';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useCalendarSync } from '@/hooks/use-calendar-sync';

export default function CalendarExportScreen() {
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
    handleToggleLocation,
    handleToggleNotes,
    handleReminderChange,
    handleExportCalendar,
  } = useCalendarSync();

  const header = (
    <PageHeader
      title="Calendar Export"
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
          <SubmitProgressState label="Saving export settings..." style={styles.submitProgress} />
        ) : null}

        <SettingsSection title="Calendar File">
          <SettingsToggleRow
            icon="location"
            title="Include Location"
            subtitle="Add session location to calendar events"
            value={settings.includeLocation}
            onValueChange={handleToggleLocation}
          />
          <SettingsToggleRow
            icon="document-text"
            title="Include Notes"
            subtitle="Add session notes and details"
            value={settings.includeNotes}
            onValueChange={handleToggleNotes}
          />
          <SyncSettingsCard
            reminderMinutes={settings.reminderMinutes}
            onReminderChange={handleReminderChange}
          />
        </SettingsSection>

        <SettingsSection title="Export">
          <View style={styles.exportSection}>
            <ThemedText style={[styles.exportDescription, { color: palette.muted }]}>
              Create one calendar file for your upcoming bookings, sessions and club events.
            </ThemedText>
            <Button
              onPress={handleExportCalendar}
              disabled={isExporting}
              variant="primary"
              style={styles.exportButton}
            >
              <Row gap="sm" align="center">
                {!isExporting ? (
                  <Ionicons name="download-outline" size={20} color={palette.onPrimary} />
                ) : null}
                <ThemedText style={{ color: palette.onPrimary, ...Typography.subheading }}>
                  {isExporting ? 'Exporting...' : 'Export Calendar'}
                </ThemedText>
              </Row>
            </Button>
          </View>
        </SettingsSection>
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
});
