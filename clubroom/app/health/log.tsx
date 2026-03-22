/**
 * Log Injury Screen
 *
 * Multi-step form for logging a new injury.
 * Guides user through body part selection, severity, and details.
 */

import { useState, useCallback, useMemo } from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { InjuryForm } from '@/components/health';
import { ErrorBoundary } from '@/components/error-boundary';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { LogInjuryInput } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { injuryService } from '@/services/injury-service';
import { Routes } from '@/navigation/routes';
import {
  buildProfileScopePayload,
  buildProfileSubjectOptions,
  findProfileSubject,
  getNextProfileSubject,
  resolveProfileSubjectId,
} from '@/utils/profile-subject';
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
  const { childId: childIdParam } = useLocalSearchParams<{ childId?: string | string[] }>();
  const { children, profileMode, profileSubjectId, setProfileScope } = useChildContext();

  const [loading, setLoading] = useState(false);

  const requestedChildId = useMemo(
    () => (Array.isArray(childIdParam) ? childIdParam[0] : childIdParam),
    [childIdParam],
  );

  const subjectOptions = useMemo(
    () => buildProfileSubjectOptions({ currentUser, children }),
    [children, currentUser],
  );

  const selectedSubjectId = useMemo(
    () =>
      resolveProfileSubjectId({
        explicitSubjectId: requestedChildId,
        currentUserId: currentUser?.id,
        profileMode,
        profileSubjectId,
        subjectOptions,
      }),
    [currentUser?.id, profileMode, profileSubjectId, requestedChildId, subjectOptions],
  );

  const selectedSubject = useMemo(
    () => findProfileSubject(selectedSubjectId, subjectOptions),
    [selectedSubjectId, subjectOptions],
  );
  const selectedChildId = selectedSubject?.kind === 'child' ? selectedSubject.id : null;
  const selectedSubjectKind: 'self' | 'child' = selectedSubject?.kind ?? 'self';
  const selectedSubjectName =
    selectedSubject?.name ?? currentUser?.fullName ?? currentUser?.name ?? 'User';
  const nextSubjectLabel = useMemo(() => {
    const nextSubject = getNextProfileSubject(selectedSubjectId, subjectOptions);
    return nextSubject?.name ?? null;
  }, [selectedSubjectId, subjectOptions]);
  const userId = selectedSubjectId;
  const userName = selectedSubjectName;
  const handleEditSelectedSubject = useCallback(() => {
    if (!selectedSubject) return;
    if (selectedSubject.kind === 'child') {
      router.push(Routes.modalEditChildProfile(selectedSubject.id));
      return;
    }
    router.push(Routes.EDIT_PROFILE);
  }, [selectedSubject]);
  const handleSelectNextSubject = useCallback(() => {
    const nextSubject = getNextProfileSubject(selectedSubjectId, subjectOptions);
    if (!nextSubject) {
      return;
    }
    void setProfileScope(buildProfileScopePayload(nextSubject));
  }, [selectedSubjectId, setProfileScope, subjectOptions]);

  const handleSubmit = useCallback(
    async (data: LogInjuryInput) => {
      if (!userId) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
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
        {Boolean(selectedSubjectId) && (
          <View
            style={[
              styles.kidCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Row align="center" justify="space-between">
              <Row align="center" gap="xs">
                <Ionicons name="person-circle-outline" size={18} color={palette.tint} />
                {selectedSubjectKind === 'child' ? (
                  <ThemedText style={[styles.kidLabel, { color: palette.muted }]}>Kid</ThemedText>
                ) : null}
                <ThemedText style={styles.kidName}>{selectedSubjectName}</ThemedText>
              </Row>
              <Row align="center" gap="xs">
                {subjectOptions.length > 1 ? (
                  <Clickable
                    onPress={handleSelectNextSubject}
                    style={[
                      styles.editKidButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: withAlpha(palette.tint, 0.08),
                      },
                    ]}
                    accessibilityLabel="Switch injury subject"
                  >
                    <Row align="center" gap="xxs">
                      <Ionicons name="swap-horizontal-outline" size={14} color={palette.tint} />
                      <ThemedText style={[styles.editKidText, { color: palette.tint }]}>
                        {nextSubjectLabel ? `Switch to ${nextSubjectLabel}` : 'Switch'}
                      </ThemedText>
                    </Row>
                  </Clickable>
                ) : null}
                <Row align="center" gap="xs">
                  <Clickable
                    onPress={handleEditSelectedSubject}
                    style={[
                      styles.editKidButton,
                      {
                        borderColor: palette.border,
                        backgroundColor: withAlpha(palette.tint, 0.08),
                      },
                    ]}
                    accessibilityLabel="Edit selected profile"
                  >
                    <Row align="center" gap="xxs">
                      <Ionicons name="create-outline" size={14} color={palette.tint} />
                      <ThemedText style={[styles.editKidText, { color: palette.tint }]}>Edit</ThemedText>
                    </Row>
                  </Clickable>
                </Row>
              </Row>
            </Row>
          </View>
        )}
        <ErrorBoundary>
          <InjuryForm onSubmit={handleSubmit} onCancel={handleCancel} loading={loading || !userId} />
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
  kidCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  kidLabel: {
    ...Typography.caption,
  },
  kidName: {
    ...Typography.bodySmallSemiBold,
  },
  editKidButton: {
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
  },
  editKidText: {
    ...Typography.caption,
  },
});
