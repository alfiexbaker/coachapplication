/**
 * Profile Tabs — Composition root.
 * Re-exports ProfileTabBar and composes ProfileTabContent from sub-tabs.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { Spacing, Typography } from '@/constants/theme';
import type {
  SessionOffering,
  SocialLinks as SocialLinksType,
  CoachExperience,
  CoachCertification,
  CoachLanguage,
} from '@/constants/types';

import { ProfileTabPosts } from './profile-tab-posts';
import { ProfileTabAbout } from './profile-tab-about';
import { Row } from '@/components/primitives';

// Re-export TabBar and types from their dedicated file
export { ProfileTabBar, type TabType, type ProfileTabsProps } from './profile-tab-bar';

export interface ProfileTabContentProps {
  activeTab: 'posts' | 'about' | 'photos' | 'sessions' | 'reviews';
  coach: {
    fullName: string;
    profilePhotoUrl?: string;
    bio?: string;
    shortBio?: string;
    email?: string;
    phone?: string;
    website?: string;
    socialLinks?: SocialLinksType;
    experiences?: CoachExperience[];
    certifications?: CoachCertification[];
    achievements?: string[];
    languages?: CoachLanguage[];
    footballFocuses: string[];
    posts?: {
      id: string;
      content: string;
      createdAt: string;
      likes: number;
      comments: number;
      mediaUrls?: string[];
      mediaType?: string;
    }[];
    photoGallery?: string[];
  };
  sessionOfferings: SessionOffering[];
  userRole?: string;
  feedPosts?: {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    comments: number;
    mediaUrls?: string[];
    mediaType?: string;
  }[];
  feedLoading?: boolean;
  onComposePress?: () => void;
  onOfferingPress: (offering: SessionOffering) => void;
  renderPostCard: (post: {
    id: string;
    content: string;
    createdAt: string;
    likes: number;
    comments: number;
    mediaUrls?: string[];
    mediaType?: string;
  }) => React.ReactNode;
}

function ProfileTabContentInner({
  activeTab,
  coach,
  sessionOfferings,
  userRole,
  feedPosts,
  feedLoading,
  onComposePress,
  onOfferingPress,
  renderPostCard,
}: ProfileTabContentProps) {
  return (
    <View style={styles.tabContent}>
      {activeTab === 'posts' && (
        <ProfileTabPosts
          coachName={coach.fullName}
          userRole={userRole}
          feedPosts={feedPosts ?? coach.posts}
          feedLoading={feedLoading}
          onComposePress={onComposePress}
          renderPostCard={renderPostCard}
        />
      )}

      {activeTab === 'about' && <ProfileTabAbout coach={coach} userRole={userRole} />}

      {activeTab === 'photos' && (
        <Row style={styles.photosGrid}>
          {coach.photoGallery && coach.photoGallery.length > 0 ? (
            coach.photoGallery.map((url, index) => (
              <Image key={index} source={{ uri: url }} style={styles.gridPhoto} />
            ))
          ) : (
            <SurfaceCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No photos yet</ThemedText>
            </SurfaceCard>
          )}
        </Row>
      )}

      {activeTab === 'sessions' && (
        <>
          {sessionOfferings.length > 0 ? (
            sessionOfferings.map((offering) => (
              <SessionOfferingCard
                key={offering.id}
                offering={offering}
                showCoach={false}
                showCapacity={true}
                onPress={() => onOfferingPress(offering)}
              />
            ))
          ) : (
            <SurfaceCard style={styles.emptyState}>
              <ThemedText style={styles.emptyStateText}>No active sessions available</ThemedText>
            </SurfaceCard>
          )}
        </>
      )}

      {activeTab === 'reviews' && (
        <SurfaceCard style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>No reviews yet</ThemedText>
        </SurfaceCard>
      )}
    </View>
  );
}

export const ProfileTabContent = React.memo(ProfileTabContentInner);
export default ProfileTabContent;

const styles = StyleSheet.create({
  tabContent: { padding: Spacing.lg, gap: Spacing.md },
  photosGrid: { flexWrap: 'wrap', gap: Spacing.micro },
  gridPhoto: { width: '32.5%', aspectRatio: 1 },
  emptyState: { paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.xs },
  emptyStateText: { fontSize: Typography.body.fontSize, opacity: 0.6 },
});
