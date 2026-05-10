import { RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { SettingsFormScreen } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useBlockedUsersSettings } from '@/hooks/use-blocked-users-settings';
import { useTheme } from '@/hooks/useTheme';

export default function BlockedUsersSettingsScreen() {
  const { colors } = useTheme();
  const {
    blockedUsers,
    blockedUsersCount,
    pendingUserId,
    loading,
    empty,
    error,
    refreshing,
    onRefresh,
    retry,
    unblockUser,
  } = useBlockedUsersSettings();

  return (
    <SettingsFormScreen
      title="Blocked Users"
      infoText="Blocked accounts cannot message you, appear in your discovery results, or be invited into your flows."
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {loading ? <LoadingState variant="list" /> : null}

      {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

      {!loading && !error && empty ? (
        <EmptyState
          title="No blocked users"
          message="When you block someone, they will appear here so you can review or unblock them later."
        />
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          <SurfaceCard style={[styles.summaryCard, { borderColor: colors.border }]}>
            <Row justify="between" align="center" gap="sm">
              <View style={styles.summaryCopy}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                  Active blocks
                </ThemedText>
                <ThemedText style={{ color: colors.muted }}>
                  {blockedUsersCount === 1
                    ? '1 account is currently blocked.'
                    : `${blockedUsersCount} accounts are currently blocked.`}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.countBadge,
                  {
                    backgroundColor: withAlpha(colors.error, 0.12),
                    borderColor: withAlpha(colors.error, 0.2),
                  },
                ]}
              >
                <ThemedText type="defaultSemiBold" style={{ color: colors.error }}>
                  {blockedUsersCount}
                </ThemedText>
              </View>
            </Row>
          </SurfaceCard>

          {blockedUsers.map((user) => {
            const isPending = pendingUserId === user.id;
            return (
              <SurfaceCard key={user.id} style={[styles.userCard, { borderColor: colors.border }]}>
                <Row gap="sm" align="center">
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: withAlpha(colors.error, 0.1),
                        borderColor: withAlpha(colors.error, 0.18),
                      },
                    ]}
                  >
                    <Ionicons name="ban" size={18} color={colors.error} />
                  </View>

                  <View style={styles.userCopy}>
                    <ThemedText type="defaultSemiBold" style={{ color: colors.text }}>
                      {user.name}
                    </ThemedText>
                    <ThemedText style={{ color: colors.muted }}>{user.subtitle}</ThemedText>
                    <ThemedText style={[styles.email, { color: colors.muted }]}>
                      {user.email}
                    </ThemedText>
                    {user.missingProfile ? (
                      <ThemedText style={[styles.warning, { color: colors.warning }]}>
                        This profile is no longer fully available, but the block still applies.
                      </ThemedText>
                    ) : null}
                  </View>
                </Row>

                <Button
                  onPress={() => void unblockUser(user)}
                  variant="outline"
                  disabled={isPending}
                  accessibilityLabel={`Unblock ${user.name}`}
                  style={styles.unblockButton}
                >
                  {isPending ? 'Unblocking...' : 'Unblock'}
                </Button>
              </SurfaceCard>
            );
          })}
        </View>
      ) : null}
    </SettingsFormScreen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  summaryCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
  },
  summaryCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  countBadge: {
    minWidth: 48,
    minHeight: 48,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
  },
  userCard: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  userCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  email: {
    ...Typography.small,
  },
  warning: {
    ...Typography.caption,
  },
  unblockButton: {
    alignSelf: 'flex-start',
  },
});
