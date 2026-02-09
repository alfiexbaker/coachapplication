import { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { apiClient } from '@/services/api-client';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { RatingStars } from '@/components/review/rating-stars';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import type { Booking } from '@/constants/app-types';
import type { SessionOffering } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';

/** Stored review shape (superset of display-only CoachReview from user-types) */
interface StoredReview {
  id: string;
  coachId: string;
  coachName?: string;
  userId?: string;
  userName: string;
  parentName: string;
  rating: number;
  text: string;
  content: string;
  createdAt: string;
  sessionDate: string;
}

const logger = createLogger('RateCoachScreen');

interface CoachToRate {
  id: string;
  name: string;
  photoUrl?: string;
  sessionCount: number;
  lastSession?: string;
  hasReview: boolean;
}

export default function RateCoachScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  const [coaches, setCoaches] = useState<CoachToRate[]>([]);
  const [selectedCoach, setSelectedCoach] = useState<CoachToRate | null>(null);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load coaches the user has worked with
  const loadCoaches = useCallback(async () => {
    try {
      // Load session bookings to find coaches
      const bookings = await apiClient.get<Booking[]>('session_bookings', []);

      // Also check session offerings for registrations
      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);

      // Load existing reviews
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);
      const reviewedCoachIds = new Set(reviews.map((r) => r.coachId));

      // Collect unique coaches
      const coachMap = new Map<string, CoachToRate>();

      // From bookings
      for (const booking of bookings) {
        if (booking.status === 'COMPLETED') {
          const existing = coachMap.get(booking.coachId);
          if (existing) {
            existing.sessionCount++;
            if (!existing.lastSession || new Date(booking.scheduledAt) > new Date(existing.lastSession)) {
              existing.lastSession = booking.scheduledAt;
            }
          } else {
            coachMap.set(booking.coachId, {
              id: booking.coachId,
              name: booking.coachName ?? 'Coach',
              photoUrl: `https://i.pravatar.cc/100?u=${booking.coachId}`,
              sessionCount: 1,
              lastSession: booking.scheduledAt,
              hasReview: reviewedCoachIds.has(booking.coachId),
            });
          }
        }
      }

      // From offerings where user is registered
      for (const offering of offerings) {
        const userReg = offering.registrations?.find(
          (r) => r.userId === currentUser?.id && r.status === 'confirmed'
        );
        if (userReg && new Date(offering.scheduledAt) < new Date()) {
          const existing = coachMap.get(offering.coachId);
          if (existing) {
            existing.sessionCount++;
          } else {
            coachMap.set(offering.coachId, {
              id: offering.coachId,
              name: offering.coachName,
              photoUrl: `https://i.pravatar.cc/100?u=${offering.coachId}`,
              sessionCount: 1,
              lastSession: offering.scheduledAt,
              hasReview: reviewedCoachIds.has(offering.coachId),
            });
          }
        }
      }

      // Add some demo coaches if none found
      if (coachMap.size === 0) {
        coachMap.set('demo-coach-1', {
          id: 'demo-coach-1',
          name: 'Coach Sarah',
          photoUrl: 'https://i.pravatar.cc/100?u=sarah',
          sessionCount: 5,
          lastSession: new Date(Date.now() - 86400000 * 3).toISOString(),
          hasReview: false,
        });
        coachMap.set('demo-coach-2', {
          id: 'demo-coach-2',
          name: 'Coach Mike',
          photoUrl: 'https://i.pravatar.cc/100?u=mike',
          sessionCount: 3,
          lastSession: new Date(Date.now() - 86400000 * 7).toISOString(),
          hasReview: false,
        });
      }

      setCoaches(Array.from(coachMap.values()).sort((a, b) =>
        new Date(b.lastSession || 0).getTime() - new Date(a.lastSession || 0).getTime()
      ));
    } catch (error) {
      logger.error('Failed to load coaches', error);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      loadCoaches();
    }, [loadCoaches])
  );

  const handleSubmitReview = async () => {
    if (!selectedCoach || rating === 0) {
      Alert.alert('Missing Rating', 'Please select a star rating');
      return;
    }

    setSubmitting(true);
    try {
      const reviews = await apiClient.get<StoredReview[]>('coach_reviews', []);

      const userName = currentUser?.fullName || currentUser?.username || 'Anonymous';
      const newReview: StoredReview = {
        id: `review_${Date.now()}`,
        coachId: selectedCoach.id,
        coachName: selectedCoach.name,
        userId: currentUser?.id ?? '',
        userName,
        parentName: userName,
        rating,
        text: reviewText.trim(),
        content: reviewText.trim(),
        createdAt: new Date().toISOString(),
        sessionDate: new Date().toISOString(),
      };

      reviews.push(newReview);
      await apiClient.set('coach_reviews', reviews);

      logger.info('Review submitted', { coachId: selectedCoach.id, rating });

      Alert.alert(
        'Review Submitted',
        `Thank you for rating ${selectedCoach.name}!`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      logger.error('Failed to submit review', error);
      Alert.alert('Error', 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Coach selection view
  if (!selectedCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <ThemedView style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
          <ThemedText type="title">Rate a Coach</ThemedText>
          <View style={{ width: 24 }} />
        </ThemedView>

        <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
          Select a coach you&apos;ve worked with
        </ThemedText>

        <FlatList
          data={coaches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Clickable onPress={() => setSelectedCoach(item)}>
              <SurfaceCard style={styles.coachCard}>
                <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                  <Ionicons name="person" size={28} color={palette.tint} />
                </View>
                <View style={styles.coachInfo}>
                  <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                  <ThemedText style={[styles.coachMeta, { color: palette.muted }]}>
                    {item.sessionCount} session{item.sessionCount !== 1 ? 's' : ''} - Last: {formatDate(item.lastSession)}
                  </ThemedText>
                </View>
                {item.hasReview ? (
                  <View style={[styles.reviewedBadge, { backgroundColor: withAlpha(palette.success, 0.12) }]}>
                    <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                    <ThemedText style={[styles.reviewedText, { color: palette.success }]}>Reviewed</ThemedText>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={palette.muted} />
                )}
              </SurfaceCard>
            </Clickable>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="person-outline" size={48} color={palette.muted} />
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                No coaches to rate yet
              </ThemedText>
              <ThemedText style={[styles.emptySubtext, { color: palette.muted }]}>
                Complete some sessions first
              </ThemedText>
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  // Rating form view
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ThemedView style={styles.header}>
        <Clickable onPress={() => setSelectedCoach(null)} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={palette.foreground} />
        </Clickable>
        <ThemedText type="title">Rate {selectedCoach.name}</ThemedText>
        <View style={{ width: 24 }} />
      </ThemedView>

      <View style={styles.ratingContent}>
        {/* Coach Info */}
        <View style={styles.selectedCoachHeader}>
          <View style={[styles.avatarLarge, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
            <Ionicons name="person" size={40} color={palette.tint} />
          </View>
          <ThemedText type="subtitle" style={styles.selectedCoachName}>
            {selectedCoach.name}
          </ThemedText>
          <ThemedText style={[styles.sessionCountText, { color: palette.muted }]}>
            {selectedCoach.sessionCount} session{selectedCoach.sessionCount !== 1 ? 's' : ''} together
          </ThemedText>
        </View>

        {/* Star Rating */}
        <View style={styles.ratingSection}>
          <ThemedText type="defaultSemiBold" style={styles.ratingLabel}>
            How was your experience?
          </ThemedText>
          <View style={styles.starsContainer}>
            <RatingStars rating={rating} onRate={setRating} />
          </View>
          {rating > 0 && (
            <ThemedText style={[styles.ratingHint, { color: palette.muted }]}>
              {rating === 5 ? 'Excellent!' : rating === 4 ? 'Great!' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Needs improvement'}
            </ThemedText>
          )}
        </View>

        {/* Quick Feedback Chips */}
        <View style={styles.quickFeedback}>
          <ThemedText type="defaultSemiBold" style={styles.feedbackLabel}>
            What stood out? (optional)
          </ThemedText>
          <View style={styles.chipContainer}>
            {['Great Communication', 'Patient', 'Knowledgeable', 'Motivating', 'Punctual', 'Friendly'].map((label) => {
              const isSelected = reviewText.includes(label);
              return (
                <Clickable
                  key={label}
                  onPress={() => {
                    if (isSelected) {
                      setReviewText(reviewText.replace(label + '. ', '').replace(label, ''));
                    } else {
                      setReviewText((prev) => (prev ? prev + ' ' + label + '.' : label + '.'));
                    }
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? palette.tint : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText style={[styles.chipText, { color: isSelected ? palette.onPrimary : palette.text }]}>
                    {label}
                  </ThemedText>
                </Clickable>
              );
            })}
          </View>
        </View>

        {/* Submit Button */}
        <Clickable
          onPress={handleSubmitReview}
          disabled={submitting || rating === 0}
          style={[
            styles.submitButton,
            {
              backgroundColor: rating > 0 ? palette.tint : palette.muted,
              opacity: submitting ? 0.6 : 1,
            },
          ]}
        >
          <Ionicons name="star" size={20} color={palette.onPrimary} />
          <ThemedText style={[styles.submitText, { color: palette.onPrimary }]}>
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </ThemedText>
        </Clickable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  subtitle: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    ...Typography.bodySmall,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  coachMeta: {
    ...Typography.small,
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  reviewedText: {
    ...Typography.caption,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.sm,
  },
  emptyText: {
    ...Typography.subheading,
  },
  emptySubtext: {
    ...Typography.bodySmall,
  },
  ratingContent: {
    flex: 1,
    padding: Spacing.lg,
    gap: Spacing.xl,
  },
  selectedCoachHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCoachName: {
    ...Typography.title,
  },
  sessionCountText: {
    ...Typography.bodySmall,
  },
  ratingSection: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingLabel: {
    ...Typography.subheading,
  },
  starsContainer: {
    paddingVertical: Spacing.sm,
  },
  ratingHint: {
    ...Typography.bodySmall,
  },
  quickFeedback: {
    gap: Spacing.sm,
  },
  feedbackLabel: {
    ...Typography.bodySmall,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  chipText: {
    ...Typography.smallSemiBold,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    marginTop: 'auto',
  },
  submitText: {
    ...Typography.subheading,
  },
});
