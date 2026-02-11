import { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useScreen } from '@/hooks/use-screen';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { ok } from '@/types/result';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('JoinTeam');

export default function JoinTeamScreen() {
  const { status, error, retry, colors: palette } = useScreen<boolean>({
    load: async () => ok(true),
    isEmpty: () => false,
    refetchOnFocus: true,
  });
  const { currentUser } = useAuth();

  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      Alert.alert('Missing Code', 'Please enter an invite code');
      return;
    }

    if (!currentUser?.id) {
      Alert.alert('Error', 'You must be logged in to join a team');
      return;
    }

    setLoading(true);
    try {
      const result = await academyService.joinWithCode(code, currentUser.id, currentUser.name, currentUser.avatar);
      if (!result.success) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        logger.error('team_join_failed', { error: result.error.message });
        Alert.alert('Unable to Join', result.error.message);
        return;
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      logger.info('team_joined', { teamId: result.data.academyId });
      Alert.alert('Welcome!', 'You have successfully joined the team', [
        { text: 'View Team', onPress: () => router.replace(Routes.academy(result.data.academyId)) },
      ]);
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = error instanceof Error ? error.message : 'Failed to join team';
      logger.error('team_join_failed', { error: message });
      Alert.alert('Unable to Join', message);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState message={error?.message || 'Failed to open join-team flow.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="people-outline"
          title="Join flow unavailable"
          message="The invite code join flow is currently unavailable."
          actionLabel="Retry"
          onPressAction={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <Row align="center" gap="md" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={{ flex: 1 }}>
            Join Team
          </ThemedText>
        </Row>

        <View style={styles.content}>
          {/* Hero */}
          <View style={styles.heroSection}>
            <View style={[styles.iconCircle, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
              <Ionicons name="people" size={48} color={palette.tint} />
            </View>
            <ThemedText type="subtitle" style={styles.heroTitle}>
              Join with Invite Code
            </ThemedText>
            <ThemedText style={[styles.heroDescription, { color: palette.muted }]}>
              Enter the invite code you received from your coach to join the team.
            </ThemedText>
          </View>

          {/* Input Card */}
          <SurfaceCard style={styles.inputCard}>
            <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
              Invite Code
            </ThemedText>
            <TextInput
              style={[
                styles.codeInput,
                {
                  backgroundColor: palette.surfaceSecondary,
                  color: palette.text,
                  borderColor: inviteCode ? palette.tint : palette.border,
                },
              ]}
              value={inviteCode}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="e.g. TEAM2024"
              placeholderTextColor={palette.muted}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={20}
            />
            <ThemedText style={[styles.helperText, { color: palette.muted }]}>
              Codes are typically 6-12 characters and case-insensitive
            </ThemedText>
          </SurfaceCard>

          {/* Join Button */}
          <Button onPress={handleJoin} disabled={loading || !inviteCode.trim()}>
            {loading ? 'Joining...' : 'Join Team'}
          </Button>

          {/* Info */}
          <Row align="flex-start" gap="sm" style={[styles.infoCard, { backgroundColor: withAlpha(palette.info, 0.06) }]}>
            <Ionicons name="information-circle" size={20} color={palette.info} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              Don&apos;t have a code? Ask your coach or club administrator for an invite.
            </ThemedText>
          </Row>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  heroDescription: {
    textAlign: 'center',
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.lg,
  },
  inputCard: {
    gap: Spacing.sm,
  },
  inputLabel: {
    ...Typography.bodySmall,
  },
  codeInput: {
    height: 56,
    borderRadius: Radii.md,
    borderWidth: 2,
    paddingHorizontal: Spacing.lg,
    ...Typography.title,
    letterSpacing: 2,
    textAlign: 'center',
  },
  helperText: {
    ...Typography.caption,
    textAlign: 'center',
  },
  infoCard: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  infoText: {
    flex: 1,
    ...Typography.small,
  },
});
