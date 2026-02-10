/**
 * Extracted sub-components for ProfileHeader.
 *
 * CoverSection — cover photo with fallback.
 * AvatarSection — profile photo with optional camera edit button.
 * ProfileStatsRow — sessions / followers / rating / reviews stats.
 * FollowButton — follow/unfollow toggle with loading state.
 * BadgesRow — coach badges (success/warning/tint tones).
 * EditProfileButton — edit profile CTA for coaches.
 */

import React, { memo } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoachBadge {
  id: string;
  label: string;
  tone?: 'success' | 'warning' | string;
}

interface CoachRating {
  average: number;
  reviewCount: number;
}

// ─── CoverSection ────────────────────────────────────────────────────────────

interface CoverSectionProps {
  coverPhotoUrl?: string;
  palette: ThemeColors;
}

export const CoverSection = memo(function CoverSection({
  coverPhotoUrl,
  palette,
}: CoverSectionProps) {
  return (
    <View style={styles.coverContainer}>
      {coverPhotoUrl ? (
        <Image source={{ uri: coverPhotoUrl }} style={styles.coverPhoto} />
      ) : (
        <View style={[styles.coverPhoto, { backgroundColor: palette.border }]} />
      )}
    </View>
  );
});

// ─── AvatarSection ───────────────────────────────────────────────────────────

interface AvatarSectionProps {
  profilePhotoUrl?: string;
  userRole?: string;
  palette: ThemeColors;
}

export const AvatarSection = memo(function AvatarSection({
  profilePhotoUrl,
  userRole,
  palette,
}: AvatarSectionProps) {
  return (
    <View style={styles.avatarContainer}>
      <Image
        source={{ uri: profilePhotoUrl }}
        style={[styles.avatar, { borderColor: palette.surface }]}
      />
      {userRole === 'Coach' && (
        <Clickable
          style={[
            styles.editAvatarButton,
            { backgroundColor: palette.tint, borderColor: palette.surface },
          ]}
        >
          <Ionicons name="camera" size={16} color={palette.surface} />
        </Clickable>
      )}
    </View>
  );
});

// ─── ProfileStatsRow ─────────────────────────────────────────────────────────

interface ProfileStatsRowProps {
  totalSessions: number;
  followerCount: number;
  rating: CoachRating;
}

export const ProfileStatsRow = memo(function ProfileStatsRow({
  totalSessions,
  followerCount,
  rating,
}: ProfileStatsRowProps) {
  return (
    <Row style={styles.statsRow}>
      <View style={styles.statItem}>
        <ThemedText type="subtitle">{totalSessions}</ThemedText>
        <ThemedText style={styles.statLabel}>Sessions</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText type="subtitle">{followerCount}</ThemedText>
        <ThemedText style={styles.statLabel}>Followers</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText type="subtitle">{rating.average.toFixed(1)}</ThemedText>
        <ThemedText style={styles.statLabel}>Rating</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText type="subtitle">{rating.reviewCount}</ThemedText>
        <ThemedText style={styles.statLabel}>Reviews</ThemedText>
      </View>
    </Row>
  );
});

// ─── FollowButton ────────────────────────────────────────────────────────────

interface FollowButtonProps {
  isFollowing: boolean;
  followLoading: boolean;
  onFollowToggle: () => void;
  palette: ThemeColors;
}

export const FollowButton = memo(function FollowButton({
  isFollowing,
  followLoading,
  onFollowToggle,
  palette,
}: FollowButtonProps) {
  return (
    <Clickable
      style={
        [
          styles.followButton,
          isFollowing && styles.followingButton,
          isFollowing && { borderColor: palette.tint },
          !isFollowing && { backgroundColor: palette.tint },
        ].filter(Boolean) as ViewStyle[]
      }
      onPress={onFollowToggle}
      disabled={followLoading}
    >
      {followLoading ? (
        <ActivityIndicator
          size="small"
          color={isFollowing ? palette.tint : palette.surface}
        />
      ) : (
        <>
          <Ionicons
            name={isFollowing ? 'checkmark' : 'add'}
            size={18}
            color={isFollowing ? palette.tint : palette.surface}
          />
          <ThemedText
            style={[
              styles.followButtonText,
              { color: isFollowing ? palette.tint : palette.surface },
            ]}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </ThemedText>
        </>
      )}
    </Clickable>
  );
});

// ─── BadgesRow ───────────────────────────────────────────────────────────────

interface BadgesRowProps {
  badges: CoachBadge[];
  palette: ThemeColors;
}

export const BadgesRow = memo(function BadgesRow({
  badges,
  palette,
}: BadgesRowProps) {
  if (badges.length === 0) return null;

  return (
    <Row style={styles.badgesRow}>
      {badges.map((badge) => (
        <View
          key={badge.id}
          style={[
            styles.badge,
            {
              backgroundColor:
                badge.tone === 'success'
                  ? withAlpha(palette.success, 0.12)
                  : badge.tone === 'warning'
                    ? withAlpha(palette.warning, 0.12)
                    : withAlpha(palette.tint, 0.12),
            },
          ]}
        >
          <ThemedText
            style={[
              styles.badgeText,
              {
                color:
                  badge.tone === 'success'
                    ? palette.success
                    : badge.tone === 'warning'
                      ? palette.warning
                      : palette.tint,
              },
            ]}
          >
            {badge.label}
          </ThemedText>
        </View>
      ))}
    </Row>
  );
});

// ─── EditProfileButton ───────────────────────────────────────────────────────

interface EditProfileButtonProps {
  palette: ThemeColors;
}

export const EditProfileButton = memo(function EditProfileButton({
  palette,
}: EditProfileButtonProps) {
  return (
    <Clickable
      style={[styles.editProfileButton, { backgroundColor: palette.tint }]}
      onPress={() => router.push(Routes.EDIT_PROFILE)}
    >
      <ThemedText style={[styles.editProfileText, { color: palette.surface }]}>
        Edit Profile
      </ThemedText>
    </Clickable>
  );
});

// ─── Styles ──────────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  coverContainer: {
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: 200,
  },
  profileHeader: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  avatarContainer: {
    marginTop: -50,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: Radii.full,
    borderWidth: 4,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileInfo: {
    gap: Spacing.xs,
  },
  schoolName: {
    ...Typography.subheading,
    opacity: 0.8,
  },
  location: {
    ...Typography.body,
    opacity: 0.6,
  },
  statsRow: {
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  statItem: {
    gap: Spacing.micro,
  },
  statLabel: {
    ...Typography.caption,
    opacity: 0.6,
  },
  followButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
    gap: Spacing.xs,
    marginTop: Spacing.md,
    minWidth: 120,
    height: 40,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  followButtonText: {
    ...Typography.bodySemiBold,
  },
  badgesRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  badgeText: {
    ...Typography.caption,
  },
  editProfileButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  editProfileText: {
    ...Typography.bodySemiBold,
  },
});
