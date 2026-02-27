import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';

import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { userService } from '@/services/user-service';
import { Routes } from '@/navigation/routes';
import type { User } from '@/constants/types';
import { err, ok, serviceError } from '@/types/result';

export default function ProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const { data, status, error, retry, colors } = useScreen<User | null>({
    load: async () => {
      if (!userId) {
        return err(serviceError('VALIDATION', 'Missing user id.'));
      }

      const result = await userService.getUserById(userId);
      if (!result.success) {
        if (result.error.code === 'NOT_FOUND') {
          return ok<User | null>(null);
        }
        return err(result.error);
      }

      return ok<User | null>(result.data);
    },
    deps: [userId],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(<ErrorState message={error?.message ?? 'Failed to load profile.'} onRetry={retry} />);
  }

  if (status === 'empty' || !data) {
    return renderShell(
      <EmptyState
        icon="person-outline"
        title="Profile not found"
        message="This user could not be loaded."
        actionLabel="Go back"
        onPressAction={() => router.back()}
      />,
    );
  }

  const canOpenCoachProfile = data.role === 'COACH';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <Row style={styles.header} align="center" justify="between">
        <Clickable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <ThemedText type="title">Profile</ThemedText>
        <View style={styles.headerSpacer} />
      </Row>

      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[styles.avatarText, { color: colors.tint }]}>
            {(data.name || 'U').slice(0, 1).toUpperCase()}
          </ThemedText>
        </View>
        <ThemedText type="heading">{data.name}</ThemedText>
        <ThemedText style={[styles.role, { color: colors.muted }]}>{data.role}</ThemedText>

        <View style={styles.meta}>
          <Row align="center" gap="xs">
            <Ionicons name="mail-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.text }]}>
              {data.email || 'No email provided'}
            </ThemedText>
          </Row>
          <Row align="center" gap="xs">
            <Ionicons name="location-outline" size={16} color={colors.muted} />
            <ThemedText style={[styles.metaText, { color: colors.text }]}>
              {data.postcode || 'No location provided'}
            </ThemedText>
          </Row>
        </View>
      </View>

      <View style={styles.actions}>
        <Button onPress={() => router.push(Routes.chat(data.id))}>Message</Button>
        {canOpenCoachProfile && (
          <Button onPress={() => router.push(Routes.coachPublic(data.id))} variant="secondary">
            View Coach Profile
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerSpacer: {
    width: 24,
    height: 24,
  },
  card: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  avatarText: {
    ...Typography.title,
  },
  role: {
    ...Typography.caption,
  },
  meta: {
    width: '100%',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.body,
    flex: 1,
  },
  actions: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
});
