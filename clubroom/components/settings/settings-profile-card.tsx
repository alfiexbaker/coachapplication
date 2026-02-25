import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
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
  const profilePhotoUrl =
    currentUser?.avatar && currentUser.avatar.startsWith('http') ? currentUser.avatar : undefined;

  const handleEditProfile = useCallback(() => {
    logger.press('EditProfileButton', { targetRoute: '/(tabs)/edit-profile' });
    router.push(Routes.EDIT_PROFILE);
  }, []);

  const handleMyAthletes = useCallback(() => {
    router.push(Routes.ATHLETES);
  }, []);

  return (
    <SurfaceCard style={styles.profileCard}>
      {/* Avatar + Info */}
      <Column align="center" gap="sm">
        {profilePhotoUrl ? (
          <Image
            source={{ uri: profilePhotoUrl }}
            style={styles.profilePhoto}
            accessibilityLabel="Profile photo"
          />
        ) : (
          <View style={[styles.profilePhoto, { backgroundColor: withAlpha(palette.muted, 0.08) }]}>
            <Ionicons name="person" size={32} color={palette.muted} />
          </View>
        )}

        <Column align="center" gap="xxs">
          <ThemedText style={styles.profileName} numberOfLines={1}>
            {profileName}
          </ThemedText>
          <ThemedText style={[styles.profileEmail, { color: palette.muted }]} numberOfLines={1}>
            {profileEmail}
          </ThemedText>
        </Column>

        <View
          style={[
            styles.rolePill,
            { backgroundColor: withAlpha(palette.tint, 0.08) },
          ]}
        >
          <ThemedText style={[styles.rolePillLabel, { color: palette.tint }]}>
            {role ?? 'GUEST'}
          </ThemedText>
        </View>
      </Column>

      {/* Actions */}
      <Row gap="xs">
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
          <Ionicons name="create-outline" size={18} color={palette.onPrimary} />
          <ThemedText style={[styles.buttonLabel, { color: palette.onPrimary }]}>
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
            <Ionicons name="people" size={18} color={palette.tint} />
            <ThemedText style={[styles.buttonLabel, { color: palette.tint }]}>
              My Athletes
            </ThemedText>
          </Clickable>
        )}
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  profileCard: {
    gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  profilePhoto: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    ...Typography.heading,
  },
  profileEmail: {
    ...Typography.bodySmall,
  },
  rolePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
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
    height: 44,
    borderRadius: Radii.md,
    flex: 1,
  },
  secondaryButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
    height: 44,
    borderRadius: Radii.md,
    flex: 1,
    borderWidth: 1.5,
  },
  buttonLabel: {
    ...Typography.bodySemiBold,
  },
});
