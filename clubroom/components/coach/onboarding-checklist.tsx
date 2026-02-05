import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import { CardStyles, ButtonStyles, LayoutStyles } from '@/constants/styles';

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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <Text style={styles.title}>Complete your setup</Text>
          <Text style={styles.subtitle}>
            {completedCount} of {totalCount} steps done
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={20} color={Colors.light.muted} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>

      {/* Checklist items */}
      <View style={styles.itemsList}>
        {items.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.item}
            onPress={() => {
              if (!item.isComplete) {
                router.push(item.route as any);
              }
            }}
            activeOpacity={item.isComplete ? 1 : 0.7}
            disabled={item.isComplete}
          >
            <View
              style={[
                styles.checkCircle,
                item.isComplete && styles.checkCircleComplete,
              ]}
            >
              {item.isComplete && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
            <Text
              style={[
                styles.itemLabel,
                item.isComplete && styles.itemLabelComplete,
              ]}
            >
              {item.label}
            </Text>
            {!item.isComplete && (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.light.muted}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Dismiss button */}
      <TouchableOpacity
        style={styles.dismissButton}
        onPress={handleDismiss}
        activeOpacity={0.7}
      >
        <Text style={styles.dismissButtonText}>Dismiss checklist</Text>
      </TouchableOpacity>
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
    color: Colors.light.text,
  },
  subtitle: {
    ...Typography.small,
    color: Colors.light.muted,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.success,
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
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleComplete: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  itemLabel: {
    ...Typography.body,
    flex: 1,
    color: Colors.light.text,
  },
  itemLabelComplete: {
    color: Colors.light.muted,
    textDecorationLine: 'line-through',
  },
  dismissButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  dismissButtonText: {
    ...Typography.small,
    color: Colors.light.muted,
    fontWeight: '500',
  },
});
