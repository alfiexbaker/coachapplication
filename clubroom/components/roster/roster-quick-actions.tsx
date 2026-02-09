/**
 * RosterQuickActions — Horizontal action buttons for group invites.
 *
 * Displays quick action buttons: "Group Invite" and "Invite All Active".
 * Only visible when not in selection mode and there are active athletes.
 */

import { memo, useCallback } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { useTheme } from '@/hooks/useTheme';

interface RosterQuickActionsProps {
  activeCount: number;
  onInviteAll: () => void;
}

export const RosterQuickActions = memo(function RosterQuickActions({
  activeCount,
  onInviteAll,
}: RosterQuickActionsProps) {
  const { colors } = useTheme();

  const handleGroupInvite = useCallback(() => {
    router.push(Routes.SESSION_INVITES_GROUP);
  }, []);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Row gap="xs" style={styles.container}>
        <Clickable
          onPress={handleGroupInvite}
          style={[styles.button, { backgroundColor: colors.tint }]}
          accessibilityLabel="Create group invite"
          accessibilityRole="button"
        >
          <Row gap="xs" align="center">
            <Ionicons name="people" size={Components.icon.sm} color={colors.onPrimary} />
            <ThemedText style={{ color: colors.onPrimary, ...Typography.smallSemiBold }}>
              Group Invite
            </ThemedText>
          </Row>
        </Clickable>
        <Clickable
          onPress={onInviteAll}
          style={[
            styles.button,
            { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
          ]}
          accessibilityLabel={`Invite all ${activeCount} active athletes`}
          accessibilityRole="button"
        >
          <Row gap="xs" align="center">
            <Ionicons name="mail" size={Components.icon.sm} color={colors.tint} />
            <ThemedText style={{ color: colors.text, ...Typography.small }}>
              Invite All Active ({activeCount})
            </ThemedText>
          </Row>
        </Clickable>
      </Row>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingRight: Spacing.lg,
  },
  button: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: Components.button.height,
    justifyContent: 'center',
  },
});
