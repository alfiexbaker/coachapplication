import React from 'react';
import { View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/useTheme';

import {
  CoverSection,
  AvatarSection,
  ProfileStatsRow,
  FollowButton,
  BadgesRow,
  EditProfileButton,
} from './profile-header-sections';
import { styles } from './profile-header-section-styles';

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
  followerCount: number;
  isFollowing: boolean;
  followLoading: boolean;
  isOwnProfile: boolean;
  userRole?: string;
  isLoggedIn: boolean;
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
  const { colors: palette } = useTheme();

  return (
    <>
      <CoverSection coverPhotoUrl={coach.coverPhotoUrl} palette={palette} />

      <View style={styles.profileHeader}>
        <AvatarSection
          profilePhotoUrl={coach.profilePhotoUrl}
          userRole={userRole}
          palette={palette}
        />

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

          <ProfileStatsRow
            totalSessions={coach.totalSessions ?? 0}
            followerCount={followerCount}
            rating={coach.rating}
          />

          {!isOwnProfile && isLoggedIn && (
            <FollowButton
              isFollowing={isFollowing}
              followLoading={followLoading}
              onFollowToggle={onFollowToggle}
              palette={palette}
            />
          )}

          {coach.badges && coach.badges.length > 0 && (
            <BadgesRow badges={coach.badges} palette={palette} />
          )}

          {userRole === 'COACH' && <EditProfileButton palette={palette} />}
        </View>
      </View>
    </>
  );
}

// ─── Exports ────────────────────────────────────────────────────

export const ProfileHeader = ProfileHeaderInner;
export default ProfileHeader;
