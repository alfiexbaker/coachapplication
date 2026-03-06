/**
 * AthleteQuickActions — Row of action buttons: Book, Message, Concern, More.
 */

import React, { useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { sendEmail, openMessage } from '@/utils/contact-actions';
import type { RosterEntry } from '@/constants/types';
import { getRosterAthleteName } from '@/utils/roster-display';
import { uiFeedback } from '@/services/ui-feedback';

interface AthleteQuickActionsProps {
  athlete: RosterEntry;
  onRaiseConcern: () => void;
  onRemove: () => void;
}

function AthleteQuickActionsInner({ athlete, onRaiseConcern, onRemove }: AthleteQuickActionsProps) {
  const { colors } = useTheme();
  const athleteName = getRosterAthleteName(athlete);
  const parentEmail: string | undefined = undefined;

  const handleBook = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(Routes.rosterAthleteAddToSession(athlete.athleteId, athleteName));
  }, [athlete.athleteId, athleteName]);

  const handleMessage = useCallback(() => {
    openMessage(athlete.athleteId);
  }, [athlete.athleteId]);

  const handleMore = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    void (async () => {
      const selected = await uiFeedback.choose({
        title: athleteName,
        options: [
          { id: 'analytics', label: 'View Analytics' },
          { id: 'concern', label: 'Raise Concern' },
          { id: 'email_parent', label: 'Email Parent' },
          { id: 'remove_roster', label: 'Remove from Roster', destructive: true },
        ],
        cancelText: 'Cancel',
      });

      if (selected === 'analytics') {
        router.push(Routes.analyticsAthlete(athlete.athleteId));
        return;
      }
      if (selected === 'concern') {
        onRaiseConcern();
        return;
      }
      if (selected === 'email_parent') {
        if (parentEmail) void sendEmail(parentEmail);
        return;
      }
      if (selected === 'remove_roster') {
        onRemove();
      }
    })();
  }, [athlete.athleteId, athleteName, onRaiseConcern, onRemove, parentEmail]);

  const actions = [
    { icon: 'add-circle-outline' as const, label: 'Book', onPress: handleBook, primary: true },
    {
      icon: 'chatbubble-outline' as const,
      label: 'Message',
      onPress: handleMessage,
      primary: false,
    },
    { icon: 'warning-outline' as const, label: 'Concern', onPress: onRaiseConcern, primary: false },
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
              backgroundColor: action.primary ? colors.tint : withAlpha(colors.tint, 0.09),
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
            style={[styles.actionLabel, { color: action.primary ? colors.onPrimary : colors.tint }]}
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
