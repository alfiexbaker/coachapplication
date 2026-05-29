/**
 * ClubAdminActions — Admin quick-action grid for club coaches.
 *
 * Shows Settings, Dashboard, Calendar, and invite shortcuts.
 * Only rendered when the user is a coach.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface AdminAction {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: () => void;
}

export interface ClubAdminActionsProps {
  clubId: string;
}

export const ClubAdminActions = function ClubAdminActions({ clubId }: ClubAdminActionsProps) {
  const { colors } = useTheme();

  const goSettings = () => router.push(Routes.clubSettings({ clubId, section: 'details' }));
  const goInvites = () => router.push(Routes.clubSettings({ clubId, section: 'invites' }));
  const goDashboard = () => router.push(Routes.clubDashboard(clubId));
  const goCalendar = () => router.push(Routes.clubCalendar(clubId));

  const actions: AdminAction[] = [
    { key: 'settings', icon: 'settings-outline', label: 'Settings', route: goSettings },
    { key: 'dashboard', icon: 'bar-chart-outline', label: 'Dashboard', route: goDashboard },
    { key: 'calendar', icon: 'calendar-outline', label: 'Calendar', route: goCalendar },
    { key: 'invites', icon: 'mail-outline', label: 'Invites', route: goInvites },
  ];

  return (
    <Row gap="xs" paddingH="md" paddingV="sm">
      {actions.map((action) => (
        <Clickable
          key={action.key}
          onPress={action.route}
          accessibilityLabel={action.label}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name={action.icon} size={22} color={colors.tint} />
          <ThemedText style={{ ...Typography.caption, color: colors.muted }}>
            {action.label}
          </ThemedText>
        </Clickable>
      ))}
    </Row>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 72,
    borderRadius: Radii.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
  },
});
