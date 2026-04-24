/**
 * Profile Tabs — Composition root.
 * Re-exports ProfileTabBar and composes ProfileTabContent from sub-tabs.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
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
import { RetainedTabPanels } from '@/components/ui/retained-tab-panels';
import { CoachOfferingsShowcase } from './coach-offerings-showcase';
import { summarizeCoachOfferings } from '@/utils/coach-profile-offerings';

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
    priceRange?: {
      min: number;
      max: number;
      unitLabel: string;
    };
    sessionRate?: number;
    nextAvailability?: string;
    footballFocuses: string[];
    posts?: {
      id: string;
      content: string;
      createdAt: string;
      likes: number;
      comments: number;
      mediaUrls?: string[];
      mediaType?: string;
      clubName?: string;
      clubBadge?: string;
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
    clubName?: string;
    clubBadge?: string;
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
    clubName?: string;
    clubBadge?: string;
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
  const offeringSummary = summarizeCoachOfferings(sessionOfferings);
  const minPrice = coach.priceRange?.min ?? coach.sessionRate ?? 0;
  const maxPrice = coach.priceRange?.max;

  return (
    <View style={styles.tabContent}>
      <RetainedTabPanels
        activeTab={activeTab}
        panels={[
          {
            id: 'posts',
            content: (
              <ProfileTabPosts
                coachName={coach.fullName}
                userRole={userRole}
                feedPosts={feedPosts ?? coach.posts}
                feedLoading={feedLoading}
                onComposePress={onComposePress}
                renderPostCard={renderPostCard}
              />
            ),
          },
          {
            id: 'about',
            content: <ProfileTabAbout coach={coach} userRole={userRole} />,
          },
          {
            id: 'photos',
            content: (
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
            ),
          },
          {
            id: 'sessions',
            content: (
              <CoachOfferingsShowcase
                minPrice={minPrice}
                maxPrice={maxPrice}
                nextAvailable={coach.nextAvailability}
                sessionOfferings={sessionOfferings}
                offeringSummary={offeringSummary}
                onOfferingPress={onOfferingPress}
                emptyTitle="No live sessions yet"
                emptyMessage="Create or publish a session so athletes can see the real formats and availability you offer."
              />
            ),
          },
          {
            id: 'reviews',
            content: (
              <SurfaceCard style={styles.emptyState}>
                <ThemedText style={styles.emptyStateText}>No reviews yet</ThemedText>
              </SurfaceCard>
            ),
          },
        ]}
      />
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
