import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Colors, Spacing, Typography } from '@/constants/theme';
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

interface ParentOnboardingChecklistProps {
  /** Parent user ID */
  parentId: string;
  /** Whether at least one child has been added */
  hasChild: boolean;
  /** Whether emergency contacts have been added */
  hasEmergencyContacts: boolean;
  /** Whether medical info has been reviewed */
  hasMedicalInfo: boolean;
  /** Whether consent preferences have been configured */
  hasConsentPreferences: boolean;
  /** Whether at least one booking has been made */
  hasFirstBooking: boolean;
}

const DISMISS_KEY_PREFIX = 'clubroom.parent_onboarding_dismissed_';

// ============================================================================
// COMPONENT
// ============================================================================

export function ParentOnboardingChecklist({
  parentId,
  hasChild,
  hasEmergencyContacts,
  hasMedicalInfo,
  hasConsentPreferences,
  hasFirstBooking,
}: ParentOnboardingChecklistProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  const dismissKey = `${DISMISS_KEY_PREFIX}${parentId}`;

  useEffect(() => {
    apiClient.get<string | null>(dismissKey, null).then((value) => {
      setIsDismissed(value === 'true');
    });
  }, [dismissKey]);

  const handleDismiss = useCallback(async () => {
    await apiClient.set(dismissKey, 'true');
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
      id: 'child',
      label: 'Child added',
      isComplete: hasChild,
      route: '/children',
    },
    {
      id: 'emergency',
      label: 'Emergency contacts added',
      isComplete: hasEmergencyContacts,
      route: '/family',
    },
    {
      id: 'medical',
      label: 'Medical info reviewed',
      isComplete: hasMedicalInfo,
      route: '/health',
    },
    {
      id: 'consent',
      label: 'Consent preferences set',
      isComplete: hasConsentPreferences,
      route: '/settings',
    },
    {
      id: 'booking',
      label: 'First booking made',
      isComplete: hasFirstBooking,
      route: '/discover',
    },
  ];

  const completedCount = items.filter((item) => item.isComplete).length;
  const totalCount = items.length;
  const progress = completedCount / totalCount;

  if (isDismissed) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <ThemedText type="defaultSemiBold" style={[styles.title, { color: palette.text }]}>
            Get started
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {completedCount} of {totalCount} steps done
          </ThemedText>
        </View>
        <Clickable onPress={handleDismiss} hitSlop={12}>
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
                item.isComplete ? { backgroundColor: palette.success, borderColor: palette.success } : undefined,
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
                item.isComplete ? { color: palette.muted, textDecorationLine: 'line-through' } : undefined,
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
      <Clickable style={styles.dismissButton} onPress={handleDismiss}>
        <ThemedText style={[styles.dismissButtonText, { color: palette.muted }]}>
          Dismiss checklist
        </ThemedText>
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
    alignItems: 'center',
    justifyContent: 'center',
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
