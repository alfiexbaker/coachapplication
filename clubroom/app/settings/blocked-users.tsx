import { RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { SettingsFormScreen } from '@/components/settings';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useBlockedUsersSettings } from '@/hooks/use-blocked-users-settings';
import { useTheme } from '@/hooks/useTheme';

export default function BlockedUsersSettingsScreen() {
  const { colors } = useTheme();
  const {
    blockedUsers,
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
      infoText={
        !loading && !error && !empty
          ? 'Blocked accounts cannot message you or appear in search.'
          : undefined
      }
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />
      }
    >
      {loading ? <LoadingState variant="list" /> : null}

      {!loading && error ? <ErrorState message={error} onRetry={retry} /> : null}

      {!loading && !error && empty ? (
        <EmptyState
          title="No blocked accounts"
          message="People you block cannot message you or appear in search."
        />
      ) : null}

      {!loading && !error && !empty ? (
        <View style={styles.list}>
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
                    <ThemedText style={{ color: colors.muted }}>{user.blockedLabel}</ThemedText>
                  </View>
                </Row>

                <Button
                  onPress={() => void unblockUser(user)}
                  variant="outline"
                  disabled={Boolean(pendingUserId)}
                  accessibilityLabel={`Unblock ${user.name}`}
                  style={styles.unblockButton}
                  label={isPending ? 'Unblocking…' : 'Unblock'}
                />
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
  unblockButton: {
    alignSelf: 'flex-start',
  },
});
