import React, { memo, useCallback } from 'react';
import { Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Routes } from '@/navigation/routes';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SettingsProfileCard');

interface SettingsProfileCardProps {
  role: string | undefined;
}

export const SettingsProfileCard = memo(function SettingsProfileCard({
  role,
}: SettingsProfileCardProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const profileName = currentUser?.name ?? 'Your profile';
  const profileEmail = currentUser?.email ?? 'No email available';
  const profilePhone = undefined;
  const profilePhotoUrl = currentUser?.avatar && currentUser.avatar.startsWith('http')
    ? currentUser.avatar
    : undefined;

  const handleEditProfile = useCallback(() => {
    logger.press('EditProfileButton', { targetRoute: '/(tabs)/edit-profile' });
    router.push(Routes.EDIT_PROFILE);
  }, []);

  const handleMyAthletes = useCallback(() => {
    router.push(Routes.ATHLETES);
  }, []);

  return (
    <SurfaceCard style={styles.profileCard}>
      <Row gap="md" align="center">
        {profilePhotoUrl ? (
          <Image
            source={{ uri: profilePhotoUrl }}
            style={styles.profilePhoto}
            accessibilityLabel="Profile photo"
          />
        ) : (
          <Row align="center" justify="center" style={[styles.profilePhoto, { backgroundColor: palette.border }]}>
            <Ionicons name="person" size={40} color={palette.muted} />
          </Row>
        )}
        <Column gap="xs" flex>
          <ThemedText type="subtitle" style={styles.profileName}>
            {profileName}
          </ThemedText>
          <ThemedText style={[styles.profileEmail, { color: palette.muted }]}>
            {profileEmail}
          </ThemedText>
          {profilePhone && (
            <ThemedText style={[styles.profilePhone, { color: palette.muted }]}>
              {profilePhone}
            </ThemedText>
          )}
        </Column>
        <Row
          align="center"
          justify="center"
          style={[
            styles.rolePill,
            { backgroundColor: withAlpha(palette.premium, 0.12), borderColor: palette.premium },
          ]}
        >
          <ThemedText style={[styles.rolePillLabel, { color: palette.premium }]}>
            {role ?? 'GUEST'}
          </ThemedText>
        </Row>
      </Row>

      <Row gap="sm">
        <Clickable
          style={({ pressed }) => [
            styles.editButton,
            {
              backgroundColor: pressed ? palette.tintPressed : palette.tint,
            },
          ]}
          onPress={handleEditProfile}
          accessibilityLabel="Edit profile"
          accessibilityRole="button"
        >
          <Ionicons name="create-outline" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.editButtonLabel, { color: palette.onPrimary }]}>
            Edit profile
          </ThemedText>
        </Clickable>
        {role === 'COACH' && (
          <Clickable
            style={({ pressed }) => [
              styles.secondaryButton,
              {
                borderColor: palette.tint,
                backgroundColor: pressed ? withAlpha(palette.tint, 0.06) : palette.surface,
              },
            ]}
            onPress={handleMyAthletes}
            accessibilityLabel="My Athletes"
            accessibilityRole="button"
          >
            <Ionicons name="people" size={20} color={palette.tint} />
            <ThemedText style={[styles.editButtonLabel, { color: palette.tint }]}>My Athletes</ThemedText>
          </Clickable>
        )}
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  profileCard: {
    gap: Spacing.md,
  },
  profilePhoto: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Components.avatar.xl / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    ...Typography.title,
  },
  profileEmail: {
    ...Typography.body,
  },
  profilePhone: {
    ...Typography.bodySmall,
  },
  rolePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
  },
  rolePillLabel: {
    ...Typography.caption,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  editButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
    flex: 1,
    borderWidth: 1.5,
  },
  editButtonLabel: {
    ...Typography.subheading,
  },
});
