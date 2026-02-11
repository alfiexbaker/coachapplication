import React, { memo, useCallback } from 'react';
import { Alert, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Routes } from '@/navigation/routes';

import { SectionHeader } from '@/components/primitives/section-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsSignOutSection');

export const SettingsSignOutSection = memo(function SettingsSignOutSection() {
  const { colors: palette } = useTheme();
  const { currentUser, logout } = useAuth();

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          logger.press('ConfirmLogout', { userId: currentUser?.id });
          await logout();
          logger.info('Logout complete - returning to login screen');
          router.replace(Routes.ROOT);
        },
      },
    ]);
  }, [currentUser?.id, logout]);

  return (
    <Column gap="sm">
      <SectionHeader title="Account actions" />
      <SurfaceCard style={{ padding: 0, gap: 0 }}>
        <Clickable
          onPress={handleLogout}
          style={({ pressed }) => [styles.settingRow, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel="Sign out"
          accessibilityRole="button"
        >
          <Row
            align="center"
            justify="center"
            style={[styles.iconContainer, { backgroundColor: withAlpha(palette.error, 0.09) }]}
          >
            <Ionicons name="log-out" size={22} color={palette.error} />
          </Row>
          <Column gap="xxs" flex>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.settingTitle, { color: palette.error }]}
            >
              Sign out
            </ThemedText>
          </Column>
        </Clickable>
      </SurfaceCard>
    </Column>
  );
});

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTitle: {
    ...Typography.subheading,
  },
});
