/**
 * Public Coach Profile
 *
 * Viewable by anyone - shows coach's full profile including:
 * - Bio, experience, certifications
 * - Reviews and ratings
 * - Session offerings
 * - Contact/booking options
 */

import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { coachService, type Coach, type PublicReview } from '@/services/coach-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('CoachProfileScreen');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 180;

type TabId = 'about' | 'reviews' | 'sessions';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'about', label: 'About', icon: 'person-outline' },
  { id: 'reviews', label: 'Reviews', icon: 'star-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
];

export default function CoachProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [coach, setCoach] = useState<Coach | null>(null);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [isFollowing, setIsFollowing] = useState(false);

  const isOwnProfile = currentUser?.id === id;

  const loadCoach = useCallback(async () => {
    if (!id) return;
    try {
      const data = await coachService.getCoach(id);
      setCoach(data);

      // Load reviews
      const reviewData = await coachService.getCoachReviews(id);
      setReviews(reviewData);
    } catch (error) {
      logger.error('Failed to load coach:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadCoach();
  }, [loadCoach]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCoach();
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleBook = () => {
    router.push(Routes.bookCoach(id!));
  };

  const handleMessage = () => {
    router.push(Routes.chat(`coach-${id}`));
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  if (!coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.muted} />
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            Coach not found
          </ThemedText>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Ionicons key={i} name="star" size={14} color={palette.warning} />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Ionicons key={i} name="star-half" size={14} color={palette.warning} />);
      } else {
        stars.push(<Ionicons key={i} name="star-outline" size={14} color={palette.warning} />);
      }
    }
    return stars;
  };

  const renderAboutTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {/* Bio */}
      {coach.bio && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>About</ThemedText>
          <ThemedText style={styles.bioText}>{coach.bio}</ThemedText>
        </SurfaceCard>
      )}

      {/* Specialties */}
      {coach.footballFocuses && coach.footballFocuses.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Specialties</ThemedText>
          <View style={styles.chipGrid}>
            {coach.footballFocuses.map((focus, index) => (
              <View
                key={index}
                style={[styles.chip, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
              >
                <ThemedText style={[styles.chipText, { color: palette.tint }]}>
                  {focus}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      )}

      {/* Experience */}
      {coach.experiences && coach.experiences.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Experience</ThemedText>
          {coach.experiences.map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <View style={[styles.expDot, { backgroundColor: palette.tint }]} />
              <View style={styles.expContent}>
                <ThemedText type="defaultSemiBold">{exp.title}</ThemedText>
                <ThemedText style={{ color: palette.muted }}>{exp.organization}</ThemedText>
                <ThemedText style={[styles.expDates, { color: palette.muted }]}>
                  {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                </ThemedText>
                {exp.description && (
                  <ThemedText style={styles.expDesc}>{exp.description}</ThemedText>
                )}
              </View>
            </View>
          ))}
        </SurfaceCard>
      )}

      {/* Certifications */}
      {coach.certifications && coach.certifications.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Certifications</ThemedText>
          {coach.certifications.map((cert, index) => (
            <View key={index} style={styles.certItem}>
              <Ionicons name="ribbon-outline" size={20} color={palette.tint} />
              <View style={{ flex: 1 }}>
                <ThemedText type="defaultSemiBold">{cert.name}</ThemedText>
                <ThemedText style={{ color: palette.muted, ...Typography.small }}>
                  {cert.issuer} • {cert.issueDate}
                </ThemedText>
              </View>
            </View>
          ))}
        </SurfaceCard>
      )}

      {/* Languages */}
      {coach.languages && coach.languages.length > 0 && (
        <SurfaceCard style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Languages</ThemedText>
          <View style={styles.chipGrid}>
            {coach.languages.map((lang, index) => (
              <View
                key={index}
                style={[styles.chip, { backgroundColor: palette.surface, borderColor: palette.border, borderWidth: 1 }]}
              >
                <ThemedText style={styles.chipText}>
                  {lang.name} • {lang.proficiency}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      )}
    </Animated.View>
  );

  const renderReviewsTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {/* Rating Summary */}
      <SurfaceCard style={styles.ratingsSummary}>
        <View style={styles.ratingBig}>
          <ThemedText style={styles.ratingNumber}>{coach.rating.toFixed(1)}</ThemedText>
          <View style={styles.starsRow}>{renderStars(coach.rating)}</View>
          <ThemedText style={{ color: palette.muted }}>
            {coach.reviewCount} review{coach.reviewCount !== 1 ? 's' : ''}
          </ThemedText>
        </View>
      </SurfaceCard>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        reviews.map((review, index) => (
          <Animated.View key={review.id} entering={FadeInDown.delay(index * 50)}>
            <SurfaceCard style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewAvatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                  <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
                    {review.reviewerName.charAt(0)}
                  </ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{review.reviewerName}</ThemedText>
                  <View style={styles.starsRow}>{renderStars(review.rating)}</View>
                </View>
                <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                  {new Date(review.createdAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </ThemedText>
              </View>
              {review.comment && (
                <ThemedText style={styles.reviewText}>{review.comment}</ThemedText>
              )}
              {review.sessionType && (
                <View style={[styles.sessionTypeBadge, { backgroundColor: withAlpha(palette.tint, 0.06) }]}>
                  <ThemedText style={{ color: palette.tint, ...Typography.caption }}>
                    {review.sessionType}
                  </ThemedText>
                </View>
              )}
            </SurfaceCard>
          </Animated.View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={48} color={palette.muted} />
          <ThemedText style={{ color: palette.muted }}>No reviews yet</ThemedText>
        </View>
      )}
    </Animated.View>
  );

  const renderSessionsTab = () => (
    <Animated.View entering={FadeIn} style={styles.tabContent}>
      {/* Pricing */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Pricing</ThemedText>
        <View style={styles.pricingRow}>
          <View style={styles.priceBox}>
            <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>From</ThemedText>
            <ThemedText type="title" style={{ color: palette.tint }}>
              £{coach.minPriceUsd}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>per session</ThemedText>
          </View>
          {coach.maxPriceUsd && coach.maxPriceUsd !== coach.minPriceUsd && (
            <View style={styles.priceBox}>
              <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>Up to</ThemedText>
              <ThemedText type="title" style={{ color: palette.tint }}>
                £{coach.maxPriceUsd}
              </ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>per session</ThemedText>
            </View>
          )}
        </View>
      </SurfaceCard>

      {/* Availability */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Availability</ThemedText>
        {coach.nextAvailable ? (
          <View style={styles.availabilityRow}>
            <Ionicons name="calendar-outline" size={20} color={palette.success} />
            <ThemedText>
              Next available:{' '}
              <ThemedText type="defaultSemiBold" style={{ color: palette.success }}>
                {new Date(coach.nextAvailable).toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </ThemedText>
            </ThemedText>
          </View>
        ) : (
          <ThemedText style={{ color: palette.muted }}>
            Check availability when booking
          </ThemedText>
        )}
      </SurfaceCard>

      {/* Stats */}
      <SurfaceCard style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Stats</ThemedText>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <ThemedText type="title" style={{ color: palette.tint }}>
              {coach.totalSessions}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Sessions</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="title" style={{ color: palette.tint }}>
              {coach.rating.toFixed(1)}
            </ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Rating</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText type="title" style={{ color: palette.tint }}>
              {new Date().getFullYear() - new Date(coach.joinedAt || Date.now()).getFullYear()}+
            </ThemedText>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Years</ThemedText>
          </View>
        </View>
      </SurfaceCard>

      {/* Book Button */}
      <Button onPress={handleBook} style={styles.bookButton}>
        <Ionicons name="calendar" size={18} color={palette.onPrimary} />
        <ThemedText style={{ color: palette.onPrimary, fontWeight: '700', marginLeft: 8 }}>
          Book a Session
        </ThemedText>
      </Button>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={palette.tint} />
        }
      >
        {/* Cover & Profile Header */}
        <View style={styles.coverContainer}>
          {coach.coverPhotoUrl ? (
            <Image source={{ uri: coach.coverPhotoUrl }} style={styles.coverImage} />
          ) : (
            <View style={[styles.coverPlaceholder, { backgroundColor: palette.tint }]} />
          )}

          {/* Back Button */}
          <Clickable
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.4)' }]}
          >
            <Ionicons name="arrow-back" size={24} color={palette.onPrimary} />
          </Clickable>

          {/* Profile Avatar */}
          <View style={styles.avatarContainer}>
            {coach.profilePhotoUrl ? (
              <Image source={{ uri: coach.profilePhotoUrl }} style={[styles.avatar, { borderColor: palette.onPrimary }]} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: palette.tint, borderColor: palette.onPrimary }]}>
                <ThemedText style={[styles.avatarText, { color: palette.onPrimary }]}>
                  {coach.name.split(' ').map((n) => n[0]).join('')}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Profile Info */}
        <View style={styles.profileInfo}>
          <ThemedText type="title" style={styles.name}>{coach.name}</ThemedText>

          {coach.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={palette.muted} />
              <ThemedText style={{ color: palette.muted }}>
                {coach.location.city}{coach.location.state ? `, ${coach.location.state}` : ''}
              </ThemedText>
            </View>
          )}

          {/* Badges */}
          {coach.badges && coach.badges.length > 0 && (
            <View style={styles.badgesRow}>
              {coach.badges.slice(0, 3).map((badge, index) => (
                <View
                  key={index}
                  style={[styles.badge, { backgroundColor: withAlpha(palette.success, 0.09) }]}
                >
                  <Ionicons name="checkmark-circle" size={12} color={palette.success} />
                  <ThemedText style={{ color: palette.success, ...Typography.caption }}>
                    {badge}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <ThemedText type="defaultSemiBold">{coach.rating.toFixed(1)}</ThemedText>
              <View style={styles.starsRow}>{renderStars(coach.rating)}</View>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statBlock}>
              <ThemedText type="defaultSemiBold">{coach.reviewCount}</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Reviews</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
            <View style={styles.statBlock}>
              <ThemedText type="defaultSemiBold">{coach.totalSessions}</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>Sessions</ThemedText>
            </View>
          </View>

          {/* Action Buttons */}
          {!isOwnProfile && (
            <View style={styles.actionButtons}>
              <Clickable
                onPress={handleFollow}
                style={[
                  styles.followButton,
                  {
                    backgroundColor: isFollowing ? palette.surface : palette.tint,
                    borderColor: isFollowing ? palette.border : palette.tint,
                  },
                ]}
              >
                <Ionicons
                  name={isFollowing ? 'checkmark' : 'add'}
                  size={18}
                  color={isFollowing ? palette.text : palette.onPrimary}
                />
                <ThemedText
                  style={{
                    color: isFollowing ? palette.text : palette.onPrimary,
                    fontWeight: '600',
                  }}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </ThemedText>
              </Clickable>
              <Clickable
                onPress={handleMessage}
                style={[styles.messageButton, { borderColor: palette.border }]}
              >
                <Ionicons name="chatbubble-outline" size={18} color={palette.text} />
              </Clickable>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={[styles.tabBar, { borderBottomColor: palette.border }]}>
          {TABS.map((tab) => (
            <Clickable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[
                styles.tab,
                activeTab === tab.id ? { borderBottomColor: palette.tint, borderBottomWidth: 2 } : undefined,
              ].filter(Boolean) as ViewStyle[]}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={18}
                color={activeTab === tab.id ? palette.tint : palette.muted}
              />
              <ThemedText
                style={{
                  color: activeTab === tab.id ? palette.tint : palette.muted,
                  fontWeight: activeTab === tab.id ? '600' : '400',
                }}
              >
                {tab.label}
              </ThemedText>
            </Clickable>
          ))}
        </View>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'about' && renderAboutTab()}
          {activeTab === 'reviews' && renderReviewsTab()}
          {activeTab === 'sessions' && renderSessionsTab()}
        </View>
      </ScrollView>

      {/* Fixed Book Button */}
      {!isOwnProfile && (
        <View style={[styles.fixedFooter, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
          <View style={styles.footerPrice}>
            <ThemedText style={{ color: palette.muted, ...Typography.caption }}>From</ThemedText>
            <ThemedText type="title" style={{ color: palette.tint }}>£{coach.minPriceUsd}</ThemedText>
          </View>
          <Button onPress={handleBook} style={{ flex: 1 }}>
            Book Session
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
  },
  errorText: {
    ...Typography.subheading,
  },
  coverContainer: {
    height: COVER_HEIGHT + 50,
    position: 'relative',
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverPlaceholder: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
    opacity: 0.8,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarContainer: {
    position: 'absolute',
    bottom: 0,
    left: Spacing.lg,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    borderWidth: 4,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: Radii.pill,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Typography.display,
  },
  profileInfo: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  name: {
    ...Typography.display,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  statBlock: {
    alignItems: 'center',
    gap: Spacing.micro,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  starsRow: {
    flexDirection: 'row',
    gap: Spacing.micro,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  followButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  messageButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: Spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.md,
  },
  tabContentContainer: {
    paddingBottom: 100,
  },
  tabContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  bioText: {
    lineHeight: 22,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  chipText: {
    ...Typography.smallSemiBold,
  },
  experienceItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  expDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.xs,
    marginTop: Spacing.xxs,
  },
  expContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  expDates: {
    ...Typography.caption,
  },
  expDesc: {
    ...Typography.small,
    marginTop: Spacing.xxs,
    lineHeight: 18,
  },
  certItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  ratingsSummary: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  ratingBig: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ratingNumber: {
    ...Typography.display,
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
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewText: {
    lineHeight: 20,
  },
  sessionTypeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceBox: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
  },
  priceLabel: {
    ...Typography.caption,
  },
  availabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  fixedFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  footerPrice: {
    alignItems: 'center',
  },
});
