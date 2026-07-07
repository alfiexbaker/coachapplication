/**
 * EditPhotoSection — Cover photo + profile photo for Edit Profile.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

const DEMO_IMAGE_HOST = 'cdn.clubroom.demo';

function isUsablePhotoUrl(uri: string | undefined): uri is string {
  if (!uri) return false;
  try {
    return new URL(uri).hostname !== DEMO_IMAGE_HOST;
  } catch {
    return !uri.startsWith('http');
  }
}

interface EditPhotoSectionProps {
  colors: ThemeColors;
  userIsCoach: boolean;
  coverPhotoUrl?: string;
  profilePhotoUrl?: string;
}

export const EditPhotoSection = function EditPhotoSection({
  colors,
  userIsCoach,
  coverPhotoUrl,
  profilePhotoUrl,
}: EditPhotoSectionProps) {
  const usableCoverPhotoUrl = isUsablePhotoUrl(coverPhotoUrl) ? coverPhotoUrl : undefined;
  const usableProfilePhotoUrl = isUsablePhotoUrl(profilePhotoUrl) ? profilePhotoUrl : undefined;

  return (
    <>
      {userIsCoach && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Cover Photo</ThemedText>
          <View style={styles.coverPhotoContainer}>
            {usableCoverPhotoUrl ? (
              <Image source={{ uri: usableCoverPhotoUrl }} style={styles.coverPhoto} />
            ) : (
              <View style={[styles.coverPhoto, { backgroundColor: colors.border }]} />
            )}
          </View>
        </SurfaceCard>
      )}

      <SurfaceCard style={styles.section}>
        <ThemedText type="subtitle">Profile Photo</ThemedText>
        <View style={styles.avatarContainer}>
          {usableProfilePhotoUrl ? (
            <Image source={{ uri: usableProfilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={48} color={colors.muted} />
            </View>
          )}
        </View>
      </SurfaceCard>
    </>
  );
};

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  coverPhotoContainer: { position: 'relative', borderRadius: Radii.lg, overflow: 'hidden' },
  coverPhoto: { width: '100%', height: 150 },
  avatarContainer: { position: 'relative', alignSelf: 'center' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
