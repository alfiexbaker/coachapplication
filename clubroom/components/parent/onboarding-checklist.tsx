import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import { useRouter, type Href } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Typography, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { ChecklistItemRow } from './onboarding-checklist-sections';
export type { ChecklistItem, ChecklistItemRowProps } from './onboarding-checklist-sections';

import { ChecklistItemRow } from './onboarding-checklist-sections';
import type { ChecklistItem } from './onboarding-checklist-sections';

interface ParentOnboardingChecklistProps {
  parentId: string;
  hasChild: boolean;
  hasEmergencyContacts: boolean;
  hasMedicalInfo: boolean;
  hasConsentPreferences: boolean;
  hasFirstBooking: boolean;
}

const DISMISS_KEY_PREFIX = 'clubroom.parent_onboarding_dismissed_';

export function ParentOnboardingChecklist({
  parentId, hasChild, hasEmergencyContacts, hasMedicalInfo, hasConsentPreferences, hasFirstBooking,
}: ParentOnboardingChecklistProps) {
  const router = useRouter();
  const { colors: palette } = useTheme();
  const [isDismissed, setIsDismissed] = useState(true);

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
    { id: 'account', label: 'Account created', isComplete: true, route: '/settings' },
    { id: 'child', label: 'Child added', isComplete: hasChild, route: '/children' },
    { id: 'emergency', label: 'Emergency contacts added', isComplete: hasEmergencyContacts, route: '/family' },
    { id: 'medical', label: 'Medical info reviewed', isComplete: hasMedicalInfo, route: '/health' },
    { id: 'consent', label: 'Consent preferences set', isComplete: hasConsentPreferences, route: '/settings' },
    { id: 'booking', label: 'First booking made', isComplete: hasFirstBooking, route: '/discover' },
  ];

  const completedCount = items.filter((i) => i.isComplete).length;
  const progress = completedCount / items.length;

  if (isDismissed) return null;

  return (
    <View style={[styles.container, { backgroundColor: palette.surface, borderColor: palette.border }]}>
      <View style={styles.header}>
        <View style={styles.headerTextGroup}>
          <ThemedText type="defaultSemiBold" style={[styles.title, { color: palette.text }]}>Get started</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {completedCount} of {items.length} steps done
          </ThemedText>
        </View>
        <Clickable accessibilityLabel="Close" onPress={handleDismiss} hitSlop={12}>
          <Ionicons name="close" size={20} color={palette.muted} />
        </Clickable>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: palette.border }]}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: palette.success }]} />
      </View>

      <View style={styles.itemsList}>
        {items.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            onNavigate={(route) => router.push(route)}
            palette={palette}
          />
        ))}
      </View>

      <Clickable style={styles.dismissButton} onPress={handleDismiss}>
        <ThemedText style={[styles.dismissButtonText, { color: palette.muted }]}>Dismiss checklist</ThemedText>
      </Clickable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.card,
    padding: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTextGroup: { flex: 1, gap: Spacing.micro },
  title: { ...Typography.heading },
  subtitle: { ...Typography.small },
  progressTrack: { height: 6, borderRadius: Radii.xs, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: Radii.xs },
  itemsList: { gap: 0 },
  dismissButton: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  dismissButtonText: { ...Typography.small, fontWeight: '500' },
});
