/**
 * AthleteQuickActions — Row of action buttons: Book, Message, Call, More.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { callPhone, sendEmail, openMessage } from '@/utils/contact-actions';
import type { RosterEntry } from '@/constants/types';
import { getRosterAthleteName, getRosterParentName } from '@/utils/roster-display';

interface AthleteQuickActionsProps {
  athlete: RosterEntry;
  onRaiseConcern: () => void;
  onRemove: () => void;
}

function AthleteQuickActionsInner({
  athlete,
  onRaiseConcern,
  onRemove,
}: AthleteQuickActionsProps) {
  const { colors } = useTheme();
  const athleteName = getRosterAthleteName(athlete);
  const parentName = getRosterParentName(athlete);
  const parentEmail: string | undefined = undefined;
  const parentPhone: string | undefined = undefined;

  const handleBook = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(Routes.rosterAthleteAddToSession(athlete.athleteId));
  }, [athlete.athleteId]);

  const handleMessage = useCallback(() => {
    openMessage(athlete.athleteId);
  }, [athlete.athleteId]);

  const handleCall = useCallback(() => {
    if (parentPhone) {
      void callPhone(parentPhone, parentName);
    } else {
      Alert.alert('No Phone Number', 'No phone number is on file for this parent.');
    }
  }, [parentName, parentPhone]);

  const handleMore = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert(
      athleteName,
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Analytics',
          onPress: () => router.push(Routes.analyticsAthlete(athlete.athleteId)),
        },
        {
          text: 'Raise Concern',
          onPress: onRaiseConcern,
        },
        {
          text: 'Email Parent',
          onPress: () => { if (parentEmail) void sendEmail(parentEmail); },
        },
        {
          text: 'Remove from Roster',
          style: 'destructive',
          onPress: onRemove,
        },
      ]
    );
  }, [athlete.athleteId, athleteName, onRaiseConcern, onRemove, parentEmail]);

  const actions = [
    { icon: 'add-circle-outline' as const, label: 'Book', onPress: handleBook, primary: true },
    { icon: 'chatbubble-outline' as const, label: 'Message', onPress: handleMessage, primary: false },
    { icon: 'call-outline' as const, label: 'Call', onPress: handleCall, primary: false },
    { icon: 'ellipsis-horizontal' as const, label: 'More', onPress: handleMore, primary: false },
  ];

  return (
    <Row gap="sm" style={styles.container}>
      {actions.map((action) => (
        <Clickable
          key={action.label}
          onPress={action.onPress}
          style={[
            styles.actionButton,
            {
              backgroundColor: action.primary
                ? colors.tint
                : withAlpha(colors.tint, 0.09),
            },
          ]}
          accessibilityLabel={action.label}
        >
          <Ionicons
            name={action.icon}
            size={20}
            color={action.primary ? colors.onPrimary : colors.tint}
          />
          <ThemedText
            style={[
              styles.actionLabel,
              { color: action.primary ? colors.onPrimary : colors.tint },
            ]}
          >
            {action.label}
          </ThemedText>
        </Clickable>
      ))}
    </Row>
  );
}

export const AthleteQuickActions = React.memo(AthleteQuickActionsInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xs,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 56,
  },
  actionLabel: {
    ...Typography.caption,
  },
});
