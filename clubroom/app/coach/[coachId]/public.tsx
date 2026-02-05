/**
 * Sprint 7A - Public Coach Profile + Sharing
 *
 * Read-only public profile page that can be shared via link or QR code.
 * Displays coach cover photo, avatar, name, rating, verified badge, location,
 * tabbed sections (About, Specialties, Qualifications, Reviews), and session types.
 *
 * USER STORY:
 * "As a parent, I want to view a coach's full public profile so I can
 * evaluate their qualifications, reviews, and offerings before booking."
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ShareProfile } from '@/components/coach/share-profile';
import { Colors, Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 200;
const AVATAR_SIZE = 96;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'about' | 'specialties' | 'qualifications' | 'reviews';

interface TabDef {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const TABS: TabDef[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'specialties', label: 'Specialties', icon: 'football-outline' },
  { id: 'qualifications', label: 'Qualifications', icon: 'ribbon-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
];

// ---------------------------------------------------------------------------
// Mock session types (would come from API)
// ---------------------------------------------------------------------------

interface SessionType {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  isTrialAvailable?: boolean;
  trialPrice?: number;
}

const MOCK_SESSION_TYPES: SessionType[] = [
  {
    id: 'st-1',
    name: '1-on-1 Session',
    duration: 60,
    price: 45,
    description: 'Personalised coaching tailored to your child\'s needs',
  },
  {
    id: 'st-2',
    name: 'Small Group (2-4)',
    duration: 60,
    price: 30,
    description: 'Train with peers in a small focused group',
    isTrialAvailable: true,
    trialPrice: 15,
  },
  {
    id: 'st-3',
    name: 'Assessment Session',
    duration: 45,
    price: 35,
    description: 'Full skills assessment with written report',
  },
];

// ---------------------------------------------------------------------------
// Helper: render star rating
// ---------------------------------------------------------------------------

function renderStars(rating: number) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#FFB800" />);
    } else if (i === fullStars && hasHalf) {
      stars.push(<Ionicons key={i} name="star-half" size={14} color="#FFB800" />);
    } else {
      stars.push(<Ionicons key={i} name="star-outline" size={14} color="#FFB800" />);
    }
  }
  return stars;
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function PublicCoachProfileScreen() {
  const { coachId } = useLocalSearchParams<{ coachId: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [coach, setCoach] = useState<Coach | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [showShareSheet, setShowShareSheet] = useState(false);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadCoach = useCallback(async () => {
    if (!coachId) return;
    try {
      const data = await coachService.getCoach(coachId);
      setCoach(data);
      const reviewData = await coachService.getCoachReviews(coachId);
      setReviews(reviewData);
    } catch (error) {
      // Fail silently - empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [coachId]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCoach();
  };

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleBook = () => {
    router.push({
      pathname: '/book/[coachId]',
      params: { coachId: coachId! },
    });
  };

  const handleMessage = () => {
    router.push({
      pathname: '/messages/[conversationId]',
      params: { conversationId: `coach-${coachId}` },
    });
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            Coach not found
          </ThemedText>
          <Clickable
            onPress={() => router.back()}
            style={[styles.goBackButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={[Typography.bodySemiBold, { color: palette.surface }]}>
              Go Back
            </ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  // -----------------------------------------------------------------------
  // Tab content renderers
  // -----------------------------------------------------------------------

  const renderAboutTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {coach.bio ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>About</ThemedText>
          <ThemedText style={[Typography.body, { color: palette.text, marginTop: Spacing.xs }]}>
            {coach.bio}
          </ThemedText>
        </SurfaceCard>
      ) : null}

      {/* Session Types */}
      <SurfaceCard style={styles.section}>
        <ThemedText style={[Typography.heading, { color: palette.text }]}>
          Available Sessions
        </ThemedText>
        {MOCK_SESSION_TYPES.map((session) => (
          <View
            key={session.id}
            style={[styles.sessionTypeRow, { borderBottomColor: palette.border }]}
          >
            <View style={{ flex: 1 }}>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                {session.name}
              </ThemedText>
              <ThemedText style={[Typography.small, { color: palette.muted, marginTop: 2 }]}>
                {session.description}
              </ThemedText>
              <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: Spacing.xs / 2 }]}>
                {session.duration} min
              </ThemedText>
            </View>
            <View style={styles.sessionPriceBlock}>
              <ThemedText style={[Typography.heading, { color: palette.tint }]}>
                {'\u00A3'}{session.price}
              </ThemedText>
              {session.isTrialAvailable && (
                <View style={[styles.trialBadge, { backgroundColor: `${palette.success}18` }]}>
                  <ThemedText style={[Typography.micro, { color: palette.success }]}>
                    TRIAL {'\u00A3'}{session.trialPrice}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        ))}
      </SurfaceCard>

      {/* Stats */}
      <SurfaceCard style={styles.section}>
        <ThemedText style={[Typography.heading, { color: palette.text }]}>Stats</ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText style={[Typography.title, { color: palette.tint }]}>
              {coach.totalSessions}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>Sessions</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[Typography.title, { color: palette.tint }]}>
              {coach.rating.toFixed(1)}
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>Rating</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={[Typography.title, { color: palette.tint }]}>
              {new Date().getFullYear() - new Date(coach.joinedAt || Date.now()).getFullYear()}+
            </ThemedText>
            <ThemedText style={[Typography.caption, { color: palette.muted }]}>Years</ThemedText>
          </View>
        </View>
      </SurfaceCard>
    </Animated.View>
  );

  const renderSpecialtiesTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {coach.footballFocuses && coach.footballFocuses.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>
            Football Focus Areas
          </ThemedText>
          <View style={styles.chipGrid}>
            {coach.footballFocuses.map((focus, index) => (
              <View
                key={index}
                style={[styles.chip, { backgroundColor: `${palette.tint}15` }]}
              >
                <ThemedText style={[Typography.small, { color: palette.tint, fontWeight: '500' }]}>
                  {focus}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}

      {coach.sports && coach.sports.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>Sports</ThemedText>
          <View style={styles.chipGrid}>
            {coach.sports.map((sport, index) => (
              <View
                key={index}
                style={[styles.chip, { backgroundColor: `${palette.secondary}15` }]}
              >
                <Ionicons name="football-outline" size={14} color={palette.secondary} />
                <ThemedText style={[Typography.small, { color: palette.secondary, fontWeight: '500' }]}>
                  {sport}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}

      {coach.languages && coach.languages.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>Languages</ThemedText>
          <View style={styles.chipGrid}>
            {coach.languages.map((lang, index) => (
              <View
                key={index}
                style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
              >
                <Ionicons name="language-outline" size={14} color={palette.muted} />
                <ThemedText style={[Typography.small, { color: palette.text }]}>
                  {lang.name} - {lang.proficiency}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      ) : null}
    </Animated.View>
  );

  const renderQualificationsTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {/* Experience */}
      {coach.experiences && coach.experiences.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>Experience</ThemedText>
          {coach.experiences.map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <View style={[styles.expDot, { backgroundColor: palette.tint }]} />
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {exp.title}
                </ThemedText>
                <ThemedText style={[Typography.body, { color: palette.muted }]}>
                  {exp.organization}
                </ThemedText>
                <ThemedText style={[Typography.caption, { color: palette.muted, marginTop: 2 }]}>
                  {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                </ThemedText>
                {exp.description ? (
                  <ThemedText style={[Typography.small, { color: palette.text, marginTop: Spacing.xs / 2 }]}>
                    {exp.description}
                  </ThemedText>
                ) : null}
              </View>
            </View>
          ))}
        </SurfaceCard>
      ) : null}

      {/* Certifications */}
      {coach.certifications && coach.certifications.length > 0 ? (
        <SurfaceCard style={styles.section}>
          <ThemedText style={[Typography.heading, { color: palette.text }]}>
            Certifications
          </ThemedText>
          {coach.certifications.map((cert, index) => (
            <View key={index} style={styles.certItem}>
              <View style={[styles.certIconCircle, { backgroundColor: `${palette.tint}15` }]}>
                <Ionicons name="ribbon-outline" size={Components.icon.md} color={palette.tint} />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {cert.name}
                </ThemedText>
                <ThemedText style={[Typography.small, { color: palette.muted }]}>
                  {cert.issuer} {'\u2022'} {cert.issueDate}
                </ThemedText>
              </View>
            </View>
          ))}
        </SurfaceCard>
      ) : null}
    </Animated.View>
  );

  const renderReviewsTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {/* Rating Summary */}
      <SurfaceCard style={[styles.section, { alignItems: 'center', paddingVertical: Spacing.lg }]}>
        <ThemedText style={[styles.ratingNumber, { color: palette.text }]}>
          {coach.rating.toFixed(1)}
        </ThemedText>
        <View style={styles.starsRow}>{renderStars(coach.rating)}</View>
        <ThemedText style={[Typography.small, { color: palette.muted, marginTop: Spacing.xs }]}>
          {coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''}
        </ThemedText>
      </SurfaceCard>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        reviews.map((review, index) => (
          <Animated.View key={review.id} entering={FadeInDown.delay(index * 50)}>
            <SurfaceCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewAvatar, { backgroundColor: `${palette.tint}15` }]}>
                  <ThemedText style={[Typography.bodySemiBold, { color: palette.tint }]}>
                    {review.reviewerName.charAt(0)}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                    {review.reviewerName}
                  </ThemedText>
                  <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                </View>
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  {new Date(review.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
              </View>
              {review.comment ? (
                <ThemedText style={[Typography.body, { color: palette.text }]}>
                  {review.comment}
                </ThemedText>
              ) : null}
              {review.sessionType ? (
                <View style={[styles.sessionTypeBadge, { backgroundColor: `${palette.tint}10` }]}>
                  <ThemedText style={[Typography.caption, { color: palette.tint }]}>
                    {review.sessionType}
                  </ThemedText>
                </View>
              ) : null}
            </SurfaceCard>
          </Animated.View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color={palette.muted} />
          <ThemedText style={[Typography.body, { color: palette.muted }]}>No reviews yet</ThemedText>
        </View>
      )}
    </Animated.View>
  );

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  const profileUrl = `https://clubroom.app/coach/${coachId}`;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }
      >
        {/* Cover Photo */}
        <View style={styles.coverContainer}>
          {coach.coverPhotoUrl ? (
            <Image source={{ uri: coach.coverPhotoUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: palette.tint }]}>
              <Ionicons name="image-outline" size={Components.icon.xl} color={`${palette.surface}40`} />
            </View>
          )}

          {/* Header buttons */}
          <View style={styles.headerButtons}>
            <Clickable
              onPress={() => router.back()}
              style={[styles.headerBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            >
              <Ionicons name="arrow-back" size={Components.icon.lg} color="#FFFFFF" />
            </Clickable>

            <Clickable
              onPress={() => setShowShareSheet(true)}
              style={[styles.headerBtn, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
            >
              <Ionicons name="share-outline" size={Components.icon.lg} color="#FFFFFF" />
            </Clickable>
          </View>

          {/* Avatar */}
          <View style={styles.avatarContainer}>
            {coach.profilePhotoUrl ? (
              <Image source={{ uri: coach.profilePhotoUrl }} style={[styles.avatar, { borderColor: palette.surface }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: palette.tint, borderColor: palette.surface }]}>
                <ThemedText style={styles.avatarInitials}>
                  {coach.name.split(' ').map((n) => n[0]).join('')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <View style={styles.nameRow}>
            <ThemedText style={[Typography.display, { color: palette.text, flex: 1 }]}>
              {coach.name}
            </ThemedText>
            {coach.badges?.includes('Verified') && (
              <View style={[styles.verifiedBadge, { backgroundColor: `${palette.success}18` }]}>
                <Ionicons name="checkmark-circle" size={Components.icon.sm} color={palette.success} />
                <ThemedText style={[Typography.caption, { color: palette.success }]}>Verified</ThemedText>
              </View>
            )}
          </View>

          {/* Rating */}
          <View style={styles.ratingRow}>
            <View style={styles.starsRow}>{renderStars(coach.rating)}</View>
            <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
              {coach.rating.toFixed(1)}
            </ThemedText>
            <ThemedText style={[Typography.small, { color: palette.muted }]}>
              ({coach.reviewCount} reviews)
            </ThemedText>
          </View>

          {/* Location */}
          {coach.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={Components.icon.sm} color={palette.muted} />
              <ThemedText style={[Typography.body, { color: palette.muted }]}>
                {coach.location.city}{coach.location.state ? `, ${coach.location.state}` : ''}
              </ThemedText>
            </View>
          ) : null}

          {/* Badges */}
          {coach.badges && coach.badges.length > 0 ? (
            <View style={styles.badgesRow}>
              {coach.badges.map((badge, index) => (
                <View
                  key={index}
                  style={[styles.badgePill, { backgroundColor: `${palette.success}15` }]}
                >
                  <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                  <ThemedText style={[Typography.caption, { color: palette.success }]}>
                    {badge}
                  </ThemedText>
                </View>
              ))}
            </View>
          ) : null}

          {/* CTA Buttons */}
          <View style={styles.ctaRow}>
            <Clickable
              onPress={handleBook}
              style={[styles.bookButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="calendar-outline" size={Components.icon.md} color={palette.surface} />
              <ThemedText style={[Typography.bodySemiBold, { color: palette.surface }]}>
                Book a Session
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={handleMessage}
              style={[styles.messageButton, { borderColor: palette.border }]}
            >
              <Ionicons name="chatbubble-outline" size={Components.icon.md} color={palette.text} />
            </Clickable>
          </View>
        </View>

        {/* Tab Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          style={[styles.tabBar, { borderBottomColor: palette.border }]}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Clickable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[
                  styles.tab,
                  isActive && { borderBottomColor: palette.tint, borderBottomWidth: 2 },
                ]}
              >
                <Ionicons
                  name={tab.icon}
                  size={Components.icon.md}
                  color={isActive ? palette.tint : palette.muted}
                />
                <ThemedText
                  style={[
                    Typography.small,
                    { color: isActive ? palette.tint : palette.muted },
                    isActive && { fontWeight: '600' },
                  ]}
                >
                  {tab.label}
                </ThemedText>
              </Clickable>
            );
          })}
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'specialties' && renderSpecialtiesTab()}
          {activeTab === 'qualifications' && renderQualificationsTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
        </View>
      </ScrollView>

      {/* Share Profile Modal */}
      {showShareSheet && (
        <ShareProfile
          coachId={coachId!}
          coachName={coach.name}
          profileUrl={profileUrl}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.body,
  },
  goBackButton: {
    height: Components.button.height,
    paddingHorizontal: Spacing.lg,
    borderRadius: Components.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Cover
  coverContainer: {
    height: COVER_HEIGHT + AVATAR_SIZE / 2,
    position: 'relative',
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverPlaceholder: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
    opacity: 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtons: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },

  // Profile Info
  profileInfo: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs / 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
  },

  // CTAs
  ctaRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  bookButton: {
    flex: 1,
    height: Components.button.height,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    borderRadius: Components.button.borderRadius,
  },
  messageButton: {
    width: Components.button.height,
    height: Components.button.height,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabBar: {
    borderBottomWidth: 1,
    marginTop: Spacing.md,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  tabContentContainer: {
    paddingBottom: Spacing['3xl'],
  },
  tabContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  // Section cards
  section: {
    gap: Spacing.sm,
  },

  // Session types
  sessionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sessionPriceBlock: {
    alignItems: 'flex-end',
    gap: Spacing.xs / 2,
  },
  trialBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radii.sm,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: Spacing.xs,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },

  // Chips
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
  },

  // Experience
  experienceItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  expDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },

  // Certifications
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  certIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Reviews
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
  },
  reviewCard: {
    gap: Spacing.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
});
