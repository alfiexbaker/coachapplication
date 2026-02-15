/**
 * Log Injury Screen
 *
 * Multi-step form for logging a new injury.
 * Guides user through body part selection, severity, and details.
 */

import { useState, useCallback } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { InjuryForm } from '@/components/health';
import { ErrorBoundary } from '@/components/error-boundary';
import { Spacing, Typography } from '@/constants/theme';
import type { LogInjuryInput } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { injuryService } from '@/services/injury-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';
import { ok } from '@/types/result';

const logger = createLogger('LogInjuryScreen');

/**
 * Log injury screen with multi-step form.
 */
export default function LogInjuryScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);

  const userId = currentUser?.id ?? 'user1';
  const userName = currentUser?.fullName ?? currentUser?.name ?? 'User';

  const handleSubmit = useCallback(
    async (data: LogInjuryInput) => {
      setLoading(true);
      try {
        await injuryService.logInjury(userId, data, userName);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      } catch (error) {
        logger.error('Failed to log injury:', error);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
    [userId, userName],
  );

  const handleCancel = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Row align="center" gap="md" style={styles.headerLeft}>
          <Clickable accessibilityLabel="Close" onPress={handleCancel} hitSlop={8}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Log Injury
          </ThemedText>
        </Row>
      </Row>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={100}
      >
        <ErrorBoundary>
          <InjuryForm onSubmit={handleSubmit} onCancel={handleCancel} loading={loading} />
        </ErrorBoundary>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {},
  headerTitle: {
    ...Typography.display,
    fontSize: scaleFont(Typography.display.fontSize),
  },
  content: {
    flex: 1,
  },
});
