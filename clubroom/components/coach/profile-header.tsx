import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── Types ──────────────────────────────────────────────────────

interface CoachBadge {
  id: string;
  label: string;
  tone?: 'success' | 'warning' | string;
}

interface CoachRating {
  average: number;
  reviewCount: number;
}

export interface ProfileHeaderProps {
  /** Coach display data */
  coach: {
    fullName: string;
    schoolName?: string;
    city?: string;
    state?: string;
    profilePhotoUrl?: string;
    coverPhotoUrl?: string;
    totalSessions?: number;
    rating: CoachRating;
    badges?: CoachBadge[];
    footballFocuses?: string[];
  };
  /** Current follower count */
  followerCount: number;
  /** Whether the logged-in user is following this coach */
  isFollowing: boolean;
  /** Whether a follow toggle request is in flight */
  followLoading: boolean;
  /** True when the profile belongs to the logged-in user */
  isOwnProfile: boolean;
  /** Current user's role (for edit button visibility) */
  userRole?: string;
  /** Whether the user is logged in */
  isLoggedIn: boolean;
  /** Toggle follow / unfollow */
  onFollowToggle: () => void;
}

// ─── Component ──────────────────────────────────────────────────

function ProfileHeaderInner({
  coach,
  followerCount,
  isFollowing,
  followLoading,
  isOwnProfile,
  userRole,
  isLoggedIn,
  onFollowToggle,
}: ProfileHeaderProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <>
      {/* Cover Photo */}
      <View style={styles.coverContainer}>
        {coach.coverPhotoUrl ? (
          <Image source={{ uri: coach.coverPhotoUrl }} style={styles.coverPhoto} />
        ) : (
          <View style={[styles.coverPhoto, { backgroundColor: palette.border }]} />
        )}
      </View>

      {/* Profile Info */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: coach.profilePhotoUrl }} style={styles.avatar} />
          {userRole === 'Coach' && (
            <Clickable style={[styles.editAvatarButton, { backgroundColor: palette.tint }]}>
              <Ionicons name="camera" size={16} color={palette.surface} />
            </Clickable>
          )}
        </View>

        <View style={styles.profileInfo}>
          <ThemedText type="title">{coach.fullName}</ThemedText>
          {coach.schoolName ? (
            <ThemedText style={[styles.schoolName, { color: palette.foreground }]}>
              {coach.schoolName}
            </ThemedText>
          ) : null}
          {coach.city && coach.state ? (
            <ThemedText style={styles.location}>
              {coach.city}, {coach.state}
            </ThemedText>
          ) : null}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="subtitle">{coach.totalSessions ?? 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Sessions</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="subtitle">{followerCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Followers</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="subtitle">{coach.rating.average.toFixed(1)}</ThemedText>
              <ThemedText style={styles.statLabel}>Rating</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText type="subtitle">{coach.rating.reviewCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Reviews</ThemedText>
            </View>
          </View>

          {/* Follow Button */}
          {!isOwnProfile && isLoggedIn && (
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
          )}

          {/* Badges */}
          {coach.badges && coach.badges.length > 0 && (
            <View style={styles.badgesRow}>
              {coach.badges.map((badge) => (
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
            </View>
          )}

          {/* Edit Profile */}
          {userRole === 'Coach' && (
            <Clickable
              style={[styles.editProfileButton, { backgroundColor: palette.tint }]}
              onPress={() => router.push(Routes.EDIT_PROFILE)}
            >
              <ThemedText style={[styles.editProfileText, { color: palette.surface }]}>
                Edit Profile
              </ThemedText>
            </Clickable>
          )}
        </View>
      </View>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles = StyleSheet.create({
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
    borderColor: Colors.light.surface,
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
    borderColor: Colors.light.surface,
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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
    flexDirection: 'row',
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

// ─── Exports ────────────────────────────────────────────────────

export const ProfileHeader = React.memo(ProfileHeaderInner);
export default ProfileHeader;
