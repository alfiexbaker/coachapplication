/**
 * EditPhotoSection — Cover photo + profile photo for Edit Profile.
 */

import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Components, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface EditPhotoSectionProps {
  colors: ThemeColors;
  userIsCoach: boolean;
  coverPhotoUrl?: string;
  profilePhotoUrl?: string;
  onPickImage: (type: 'profile' | 'cover') => void;
}

export const EditPhotoSection = memo(function EditPhotoSection({
  colors,
  userIsCoach,
  coverPhotoUrl,
  profilePhotoUrl,
  onPickImage,
}: EditPhotoSectionProps) {
  return (
    <>
      {userIsCoach && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Cover Photo</ThemedText>
          <Clickable
            onPress={() => onPickImage('cover')}
            style={styles.coverPhotoContainer}
            accessibilityLabel="Change cover photo"
            accessibilityRole="button"
          >
            {coverPhotoUrl ? (
              <Image source={{ uri: coverPhotoUrl }} style={styles.coverPhoto} />
            ) : (
              <View style={[styles.coverPhoto, { backgroundColor: colors.border }]} />
            )}
            <View style={[styles.photoOverlay, { backgroundColor: withAlpha(colors.text, 0.5) }]}>
              <Ionicons name="camera" size={32} color={colors.onPrimary} />
              <ThemedText style={[styles.overlayText, { color: colors.onPrimary }]}>
                Change Cover
              </ThemedText>
            </View>
          </Clickable>
        </SurfaceCard>
      )}

      <SurfaceCard style={styles.section}>
        <ThemedText type="subtitle">Profile Photo</ThemedText>
        <Clickable
          onPress={() => onPickImage('profile')}
          style={styles.avatarContainer}
          accessibilityLabel="Change profile photo"
          accessibilityRole="button"
        >
          {profilePhotoUrl ? (
            <Image source={{ uri: profilePhotoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={48} color={colors.muted} />
            </View>
          )}
          <View
            style={[
              styles.avatarOverlay,
              { backgroundColor: colors.tint, borderColor: colors.onPrimary },
            ]}
          >
            <Ionicons name="camera" size={20} color={colors.onPrimary} />
          </View>
        </Clickable>
      </SurfaceCard>
    </>
  );
});

const styles = StyleSheet.create({
  section: { gap: Spacing.md },
  coverPhotoContainer: { position: 'relative', borderRadius: Radii.lg, overflow: 'hidden' },
  coverPhoto: { width: '100%', height: 150 },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  overlayText: { fontWeight: '600' },
  avatarContainer: { position: 'relative', alignSelf: 'center' },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
});
