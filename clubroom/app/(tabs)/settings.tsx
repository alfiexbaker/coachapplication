import { useEffect } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/primitives/screen-header';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { SettingsProfileCard } from '@/components/settings/settings-profile-card';
import { SettingsNavHub } from '@/components/settings/settings-nav-hub';
import { SettingsAlertsSection } from '@/components/settings/settings-alerts-section';
import { SettingsAccountSection } from '@/components/settings/settings-account-section';
import { SettingsNotificationToggles } from '@/components/settings/settings-notification-toggles';
import { SettingsPrivacySection } from '@/components/settings/settings-privacy-section';
import { SettingsPaymentsSection } from '@/components/settings/settings-payments-section';
import { SettingsPreferencesSection } from '@/components/settings/settings-preferences-section';
import { SettingsSupportSection } from '@/components/settings/settings-support-section';
import { SettingsSignOutSection } from '@/components/settings/settings-sign-out-section';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsScreen');

export default function SettingsScreen() {
  const { colors: palette } = useTheme();
  const { currentUser, isLoading, error, logout } = useAuth();
  const role = currentUser?.role;

  useEffect(() => {
    logger.debug('Settings screen mounted', { role });
  }, [role]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Profile" subtitle="Your account" />
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Profile" subtitle="Your account" />
        <ErrorState message={error} onRetry={() => void logout()} />
      </SafeAreaView>
    );
  }

  if (!currentUser) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <ScreenHeader title="Profile" subtitle="Your account" />
        <EmptyState
          icon="person-outline"
          title="Sign in required"
          message="Please sign in to manage your settings."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Profile" subtitle="Your account" />

        <SettingsProfileCard role={role} />

        <SettingsNavHub role={role} />

        <SettingsAlertsSection role={role} />

        <SettingsAccountSection role={role} />

        <SettingsNotificationToggles />

        <SettingsPrivacySection role={role} />

        {role === 'COACH' && <SettingsPaymentsSection />}

        <SettingsPreferencesSection />

        <SettingsSupportSection />

        <SettingsSignOutSection />

        <Column align="center" gap="xs" style={styles.versionContainer}>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>
            Clubroom v1.0.0
          </ThemedText>
          <ThemedText style={[styles.versionText, { color: palette.muted }]}>
            {role ?? 'GUEST'} account
          </ThemedText>
        </Column>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.md,
  },
  versionContainer: {
    marginTop: Spacing.lg,
  },
  versionText: {
    ...Typography.small,
  },
});
