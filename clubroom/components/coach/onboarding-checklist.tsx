import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import { CardStyles } from '@/constants/styles';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ============================================================================
// TYPES
// ============================================================================

interface ChecklistItem {
  id: string;
  label: string;
  isComplete: boolean;
  route: string;
}

interface CoachOnboardingChecklistProps {
  /** Coach user ID */
  coachId: string;
  /** Whether the coach has a profile photo set */
  hasProfilePhoto: boolean;
  /** The coach's bio text */
  bio: string;
  /** Whether qualifications/certifications have been added */
  hasQualifications: boolean;
  /** Whether availability slots have been configured */
  hasAvailability: boolean;
  /** Whether scheduling rules have been configured */
  hasSchedulingRules: boolean;
  /** Whether a cancellation policy has been set */
  hasCancellationPolicy: boolean;
  /** Whether the coach profile is currently live */
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
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  const dismissKey = `${DISMISS_KEY_PREFIX}${coachId}`;

  useEffect(() => {
    AsyncStorage.getItem(dismissKey).then((value) => {
      setIsDismissed(value === 'true');
    });
  }, [dismissKey]);

  const handleDismiss = useCallback(async () => {
    await AsyncStorage.setItem(dismissKey, 'true');
    setIsDismissed(true);
  }, [dismissKey]);

  const items: ChecklistItem[] = [
    {
      id: 'account',
      label: 'Account created',
      isComplete: true,
      route: '/settings',
    },
    {
      id: 'photo',
      label: 'Profile photo set',
      isComplete: hasProfilePhoto,
      route: '/settings',
    },
    {
      id: 'bio',
      label: 'Bio written',
      isComplete: bio != null && bio.length > 20,
      route: '/settings',
    },
    {
      id: 'qualifications',
      label: 'Qualifications added',
      isComplete: hasQualifications,
      route: '/settings',
    },
    {
      id: 'availability',
      label: 'Availability set',
      isComplete: hasAvailability,
      route: '/availability',
    },
    {
      id: 'scheduling',
      label: 'Scheduling rules configured',
      isComplete: hasSchedulingRules,
      route: '/availability',
    },
    {
      id: 'cancellation',
      label: 'Cancellation policy set',
      isComplete: hasCancellationPolicy,
      route: '/settings',
    },
    {
      id: 'live',
      label: 'Gone live',
      isComplete: isLive,
      route: '/settings',
    },
  ];

  const completedCount = items.filter((item) => item.isComplete).length;
  const totalCount = items.length;
  const progress = completedCount / totalCount;
  const allComplete = completedCount === totalCount;

  if (isDismissed) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.surface }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <ThemedText style={[styles.title, { color: palette.text }]}>Complete your setup</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {completedCount} of {totalCount} steps done
          </ThemedText>
        </View>
        <Clickable
          onPress={handleDismiss}
          hitSlop={12}
        >
          <Ionicons name="close" size={20} color={palette.muted} />
        </Clickable>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.success },
          ]}
        />
      </View>

      {/* Checklist items */}
      <View style={styles.itemsList}>
        {items.map((item) => (
          <Clickable
            key={item.id}
            style={styles.item}
            onPress={() => {
              if (!item.isComplete) {
                router.push(item.route as any);
              }
            }}
            disabled={item.isComplete}
          >
            <View
              style={[
                styles.checkCircle,
                { borderColor: palette.border },
                item.isComplete && { backgroundColor: palette.success, borderColor: palette.success },
              ]}
            >
              {item.isComplete && (
                <Ionicons name="checkmark" size={14} color={palette.surface} />
              )}
            </View>
            <ThemedText
              style={[
                styles.itemLabel,
                { color: palette.text },
                item.isComplete && { color: palette.muted, textDecorationLine: 'line-through' },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </ThemedText>
            {!item.isComplete && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={palette.muted}
              />
            )}
          </Clickable>
        ))}
      </View>

      {/* Dismiss button */}
      <Clickable
        style={styles.dismissButton}
        onPress={handleDismiss}
      >
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
    ...CardStyles.base,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...Typography.heading,
  },
  subtitle: {
    ...Typography.small,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  itemsList: {
    gap: 0,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  itemLabel: {
    ...Typography.body,
    flex: 1,
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
