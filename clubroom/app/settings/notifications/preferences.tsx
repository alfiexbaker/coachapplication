import { ScrollView, StyleSheet, View, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { SettingsScreenState } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ErrorState } from '@/components/ui/screen-states';
import {
  QuietHoursSelector,
  ChannelToggle,
  NotificationTypeList,
  MutedCoachesList,
} from '@/components/notification';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNotificationPrefs } from '@/hooks/use-notification-prefs';

export default function NotificationPreferencesScreen() {
  const { colors } = useTheme();
  const {
    preferences,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    updating,
    handleRefresh,
    handleQuietHoursChange,
    handleChannelToggle,
    handleTypeToggle,
    handleUnmuteCoach,
  } = useNotificationPrefs();

  const shellStatus =
    loading && !preferences ? 'loading' : status === 'error' && !preferences ? 'error' : 'ready';

  return (
    <SettingsScreenState
      colors={colors}
      header={<Header colors={colors} updating={shellStatus === 'ready' ? updating : false} />}
      status={shellStatus}
      errorMessage={error ?? 'Failed to load notification preferences.'}
      onRetry={retry}
      loadingVariant="list"
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
        }
      >
        {preferences && (
          <>
            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>
                QUIET HOURS
              </ThemedText>
              <ThemedText style={[styles.sectionDescription, { color: colors.muted }]}>
                Quiet hours pause push notifications only. In-app notifications still appear when
                you open the app.
              </ThemedText>
              <QuietHoursSelector
                value={preferences.quietHours}
                onChange={handleQuietHoursChange}
                disabled={updating}
                loading={updating}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>
                NOTIFICATION CHANNELS
              </ThemedText>
              <ChannelToggle
                value={preferences.channels}
                onChange={handleChannelToggle}
                disabled={updating}
                loading={updating}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>
                NOTIFICATION TYPES
              </ThemedText>
              <ThemedText style={[styles.sectionDescription, { color: colors.muted }]}>
                Choose which notifications you want to receive. Tap a category to expand.
              </ThemedText>
              <NotificationTypeList
                typePreferences={preferences.typePreferences}
                onToggle={handleTypeToggle}
                disabled={updating}
                loading={updating}
              />
            </View>

            <View style={styles.section}>
              <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>
                MUTED COACHES
              </ThemedText>
              <MutedCoachesList
                mutedCoaches={preferences.mutedCoaches}
                onUnmute={handleUnmuteCoach}
                disabled={updating}
                loading={updating}
              />
            </View>

            <View style={styles.infoContainer}>
              <ThemedText style={[styles.infoText, { color: colors.muted }]}>
                Some critical notifications like account security and payment issues cannot be
                disabled.
              </ThemedText>
            </View>
          </>
        )}
        {!preferences && (
          <ErrorState
            message={error ?? 'Notification preferences are unavailable right now.'}
            onRetry={handleRefresh}
          />
        )}
      </ScrollView>
    </SettingsScreenState>
  );
}

function Header({
  colors,
  updating,
}: {
  colors: ReturnType<typeof import('@/hooks/useTheme').useTheme>['colors'];
  updating: boolean;
}) {
  return (
    <Row justify="space-between" align="center" style={styles.header}>
      <Clickable onPress={() => router.back()} hitSlop={8}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <ThemedText type="title" style={styles.headerTitle}>
        Notification Preferences
      </ThemedText>
      <View style={{ width: 24 }}>
        {updating && <ActivityIndicator size="small" color={colors.accent} />}
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.heading },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing['3xl'] },
  section: { marginBottom: Spacing.xl },
  sectionTitle: {
    ...Typography.smallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sectionDescription: { ...Typography.small, marginLeft: Spacing.sm, marginBottom: Spacing.sm },
  infoContainer: { paddingHorizontal: Spacing.sm, marginTop: Spacing.sm },
  infoText: { ...Typography.small, textAlign: 'center' },
});
