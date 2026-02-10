import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Typography, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { ChecklistItemRow, ProgressTrack } from './onboarding-checklist-sections';
export type { ChecklistItem, ChecklistItemRowProps, ProgressTrackProps } from './onboarding-checklist-sections';

import { ChecklistItemRow, ProgressTrack } from './onboarding-checklist-sections';
import type { ChecklistItem } from './onboarding-checklist-sections';
import { Row } from '@/components/primitives';

// ============================================================================
// TYPES
// ============================================================================

interface CoachOnboardingChecklistProps {
  coachId: string;
  hasProfilePhoto: boolean;
  bio: string;
  hasQualifications: boolean;
  hasAvailability: boolean;
  hasSchedulingRules: boolean;
  hasCancellationPolicy: boolean;
  isLive: boolean;
}

const DISMISS_KEY_PREFIX = 'clubroom.coach_onboarding_dismissed_';

// ============================================================================
// COMPONENT
// ============================================================================

export function CoachOnboardingChecklist({
  coachId,
  hasProfilePhoto,
  bio,
  hasQualifications,
  hasAvailability,
  hasSchedulingRules,
  hasCancellationPolicy,
  isLive,
}: CoachOnboardingChecklistProps) {
  const router = useRouter();
  const { colors: palette } = useTheme();
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  const dismissKey = `${DISMISS_KEY_PREFIX}${coachId}`;

  useEffect(() => {
    apiClient.get<string | null>(dismissKey, null).then((value) => {
      setIsDismissed(value === 'true');
    });
  }, [dismissKey]);

  const handleDismiss = useCallback(async () => {
    await apiClient.set(dismissKey, 'true');
    setIsDismissed(true);
  }, [dismissKey]);

  const handleNavigate = useCallback((route: string) => {
    router.push(route as Href);
  }, [router]);

  const items: ChecklistItem[] = [
    { id: 'account', label: 'Account created', isComplete: true, route: '/settings' },
    { id: 'photo', label: 'Profile photo set', isComplete: hasProfilePhoto, route: '/settings' },
    { id: 'bio', label: 'Bio written', isComplete: bio != null && bio.length > 20, route: '/settings' },
    { id: 'qualifications', label: 'Qualifications added', isComplete: hasQualifications, route: '/settings' },
    { id: 'availability', label: 'Availability set', isComplete: hasAvailability, route: '/availability' },
    { id: 'scheduling', label: 'Scheduling rules configured', isComplete: hasSchedulingRules, route: '/availability' },
    { id: 'cancellation', label: 'Cancellation policy set', isComplete: hasCancellationPolicy, route: '/settings' },
    { id: 'live', label: 'Gone live', isComplete: isLive, route: '/settings' },
  ];

  const completedCount = items.filter((item) => item.isComplete).length;
  const totalCount = items.length;
  const progress = completedCount / totalCount;

  if (isDismissed) return null;

  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      {/* Header */}
      <Row style={styles.header}>
        <View style={styles.headerTextGroup}>
          <ThemedText style={[styles.title, { color: palette.text }]}>Complete your setup</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {completedCount} of {totalCount} steps done
          </ThemedText>
        </View>
        <Clickable accessibilityLabel="Close" onPress={handleDismiss} hitSlop={12}>
          <Ionicons name="close" size={20} color={palette.muted} />
        </Clickable>
      </Row>

      <ProgressTrack progress={progress} palette={palette} />

      {/* Checklist items */}
      <View style={styles.itemsList}>
        {items.map((item) => (
          <ChecklistItemRow key={item.id} item={item} onNavigate={handleNavigate} palette={palette} />
        ))}
      </View>

      {/* Dismiss button */}
      <Clickable style={styles.dismissButton} onPress={handleDismiss}>
        <ThemedText style={[styles.dismissButtonText, { color: palette.muted }]}>Dismiss checklist</ThemedText>
      </Clickable>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.card,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
    gap: Spacing.micro,
  },
  title: {
    ...Typography.heading,
  },
  subtitle: {
    ...Typography.small,
  },
  itemsList: {
    gap: 0,
  },
  dismissButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  dismissButtonText: {
    ...Typography.small,
    fontWeight: '500',
  },
});
