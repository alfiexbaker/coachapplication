/**
 * Coach Service
 *
 * Manages coach profiles, reviews, and public-facing data.
 * Uses apiClient for mock/local data and explicit `/v1` routes for API-mode authority.
 */

import { apiClient, apiFetch } from './api-client';
import { createLogger } from '@/utils/logger';
import type { Result, ServiceError } from '@/types/result';
import { ok, err, notFound, serviceError, storageError, unsupportedError } from '@/types/result';
import { accountIdsMatch } from '@/utils/account-id';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';
import { appendCoachReview, type StoredCoachReview } from '@/services/review-sync-service';
import type { SessionOffering } from '@/constants/types';
import {
  mapApiCoachOfferingToSessionOffering,
  searchPublicCoachesFromApi,
  type ApiCoachOffering,
  type ApiPublicCoachSearchParams,
  type ApiPublicCoachProfile,
  type SessionOfferingWithCoachProfile,
} from '@/services/coach-offering-api';

const logger = createLogger('CoachService');

// Storage keys (inline until added to storage-keys.ts)
const COACHES_KEY = STORAGE_KEYS.COACH_DIRECTORY;
const COACH_REVIEWS_KEY = STORAGE_KEYS.COACH_PUBLIC_REVIEWS;

interface RateCoachReviewRecord {
  id: string;
  coachId: string;
  userName?: string;
  parentName?: string;
  userId?: string;
  parentId?: string;
  athleteId?: string;
  athleteName?: string;
  rating: number;
  text?: string;
  content?: string;
  sessionType?: string;
  bookingId?: string;
  categories?: Record<string, number>;
  createdAt: string;
}

// Simplified Coach type for public profiles
export interface Coach {
  id: string;
  name: string;
  bio?: string;
  sports: string[];
  location?: { city: string; state?: string; lat?: number; lng?: number };
  distance?: number;
  rating: number;
  reviewCount: number;
  minPrice: number;
  maxPrice?: number;
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;
  joinedAt?: string;
  totalSessions: number;
  nextAvailable?: string;
  badges?: string[];
  footballFocuses?: string[];
  experiences?: {
    title: string;
    organization: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }[];
  certifications?: {
    name: string;
    issuer: string;
    issueDate: string;
    expiryDate?: string;
  }[];
  languages?: {
    name: string;
    proficiency: string;
  }[];
}

// Simplified Review for public display
export interface PublicReview {
  id: string;
  coachId: string;
  reviewerName: string;
  reviewerId?: string;
  athleteId?: string;
  athleteName?: string;
  rating: number;
  comment?: string;
  sessionType?: string;
  bookingId?: string;
  isVerifiedBooking?: boolean;
  categories?: Record<string, number>;
  createdAt: string;
}

interface ApiCoachReviewsResponse {
  reviews: Array<{
    id: string;
    bookingId: string;
    coachUserId: string;
    reviewerUserId: string;
    reviewerName: string | null;
    athleteId: string;
    athleteName: string | null;
    rating: number;
    comment: string | null;
    sessionType: string | null;
    categories: Record<string, number>;
    isVerifiedBooking: true;
    createdAt: string;
  }>;
}
interface ApiPublicCoachProfileResponse {
  coachId: string;
  coachProfile: ApiPublicCoachProfile;
  offerings: ApiCoachOffering[];
  total: number;
  seedVersion?: string | null;
  requestId: string;
}
interface ApiCoachFollowStatusResponse {
  following?: boolean;
  follow?: unknown;
  requestId?: string;
}
interface ApiCoachFollowMutationResponse {
  follow?: unknown;
  removed?: boolean;
  requestId?: string;
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_COACHES: Coach[] = normalizeLegacyMockDates([
  {
    id: 'coach-1',
    name: 'Marcus Johnson',
    bio: 'Former professional footballer with 15 years of coaching experience. Specializing in youth development and technical skills. I believe in building confidence alongside ability, helping young players reach their full potential on and off the pitch.',
    sports: ['Football'],
    location: { city: 'Manchester', state: 'Greater Manchester', lat: 53.4808, lng: -2.2426 },
    distance: 2.5,
    rating: 4.8,
    reviewCount: 47,
    minPrice: 35,
    maxPrice: 60,
    profilePhotoUrl: undefined,
    coverPhotoUrl: undefined,
    joinedAt: '2021-03-15',
    totalSessions: 342,
    nextAvailable: new Date(Date.now() + 86400000 * 2).toISOString(),
    badges: ['Verified', 'Background Checked', 'Top Rated'],
    footballFocuses: ['Dribbling', 'Finishing', 'Ball Control', 'Speed Training'],
    experiences: [
      {
        title: 'Youth Academy Coach',
        organization: 'Manchester City FC Academy',
        startDate: '2019',
        endDate: undefined,
        current: true,
        description: 'Lead coach for U14 development squad',
      },
      {
        title: 'Private Football Coach',
        organization: 'Self-employed',
        startDate: '2015',
        endDate: '2019',
        current: false,
        description: 'Private 1-on-1 and small group coaching',
      },
    ],
    certifications: [
      { name: 'UEFA B License', issuer: 'UEFA', issueDate: '2018' },
      { name: 'FA Level 3', issuer: 'The FA', issueDate: '2017' },
      { name: 'First Aid Certified', issuer: 'St John Ambulance', issueDate: '2023' },
    ],
    languages: [
      { name: 'English', proficiency: 'Native' },
      { name: 'Spanish', proficiency: 'Conversational' },
    ],
  },
  {
    id: 'coach-2',
    name: 'Sarah Williams',
    bio: "Passionate about developing young talent. Former England Women's U21 player with a focus on technical excellence and tactical awareness.",
    sports: ['Football'],
    location: { city: 'London', state: 'Greater London', lat: 51.5074, lng: -0.1278 },
    distance: 5.0,
    rating: 4.9,
    reviewCount: 89,
    minPrice: 45,
    maxPrice: 75,
    profilePhotoUrl: undefined,
    coverPhotoUrl: undefined,
    joinedAt: '2020-06-01',
    totalSessions: 567,
    nextAvailable: new Date(Date.now() + 86400000).toISOString(),
    badges: ['Verified', 'Background Checked', 'Pro Athlete'],
    footballFocuses: ['Passing', 'Tactical Awareness', 'Defending', 'Leadership'],
    experiences: [
      {
        title: 'Head Coach',
        organization: 'Chelsea FC Women Academy',
        startDate: '2020',
        current: true,
      },
    ],
    certifications: [{ name: 'UEFA A License', issuer: 'UEFA', issueDate: '2020' }],
    languages: [{ name: 'English', proficiency: 'Native' }],
  },
]);

const MOCK_REVIEWS: PublicReview[] = normalizeLegacyMockDates([
  {
    id: 'review-1',
    coachId: 'coach-1',
    reviewerName: 'James P.',
    reviewerId: 'parent-1',
    athleteId: 'athlete-1',
    athleteName: 'Ethan',
    rating: 5,
    comment:
      'Marcus is fantastic with my son. His confidence on the ball has improved dramatically over the past 3 months. Highly recommend!',
    sessionType: '1-on-1 Session',
    bookingId: 'booking-proof-1',
    isVerifiedBooking: true,
    categories: {
      Communication: 5,
      'Skill development': 5,
      Punctuality: 4,
      Value: 5,
    },
    createdAt: '2024-01-10T14:00:00Z',
  },
  {
    id: 'review-2',
    coachId: 'coach-1',
    reviewerName: 'Emily R.',
    reviewerId: 'parent-2',
    athleteId: 'athlete-2',
    athleteName: 'Mia',
    rating: 5,
    comment:
      'Professional, punctual, and great with kids. My daughter loves her sessions with Marcus.',
    sessionType: 'Group Session',
    bookingId: 'booking-proof-2',
    isVerifiedBooking: true,
    categories: {
      Communication: 5,
      'Skill development': 4,
      Punctuality: 5,
      Value: 4,
    },
    createdAt: '2024-01-05T10:00:00Z',
  },
  {
    id: 'review-3',
    coachId: 'coach-1',
    reviewerName: 'David M.',
    reviewerId: 'parent-3',
    athleteId: 'athlete-3',
    athleteName: 'Noah',
    rating: 4,
    comment: 'Good coaching sessions. Would appreciate more feedback after each session.',
    sessionType: '1-on-1 Session',
    bookingId: 'booking-proof-3',
    isVerifiedBooking: true,
    categories: {
      Communication: 3,
      'Skill development': 4,
      Punctuality: 5,
      Value: 4,
    },
    createdAt: '2023-12-20T16:00:00Z',
  },
  {
    id: 'review-4',
    coachId: 'coach-1',
    reviewerName: 'Lisa T.',
    reviewerId: 'parent-4',
    rating: 5,
    comment: 'Excellent coach! Really understands how to work with different skill levels.',
    isVerifiedBooking: false,
    createdAt: '2023-12-15T11:00:00Z',
  },
  {
    id: 'review-5',
    coachId: 'coach-2',
    reviewerName: 'Michael B.',
    reviewerId: 'parent-5',
    athleteId: 'athlete-4',
    athleteName: 'Ava',
    rating: 5,
    comment:
      'Sarah is an incredible coach. Her experience as a professional really shows in how she teaches.',
    sessionType: '1-on-1 Session',
    bookingId: 'booking-proof-4',
    isVerifiedBooking: true,
    categories: {
      Communication: 5,
      'Skill development': 5,
      Punctuality: 5,
      Value: 4,
    },
    createdAt: '2024-01-08T09:00:00Z',
  },
]);

// ============================================================================
// SERVICE METHODS
// ============================================================================

function toPublicReview(review: RateCoachReviewRecord): PublicReview {
  return {
    id: review.id,
    coachId: review.coachId,
    reviewerName:
      review.parentName?.trim() ||
      review.userName?.trim() ||
      'Parent',
    reviewerId: review.userId || review.parentId,
    athleteId: review.athleteId,
    athleteName: review.athleteName,
    rating: review.rating,
    comment: review.text?.trim() || review.content?.trim(),
    sessionType: review.sessionType,
    bookingId: review.bookingId,
    isVerifiedBooking: Boolean(review.bookingId),
    categories: review.categories,
    createdAt: review.createdAt,
  };
}

function toPublicReviewFromApi(
  review: ApiCoachReviewsResponse['reviews'][number],
): PublicReview {
  return {
    id: review.id,
    coachId: review.coachUserId,
    reviewerName: review.reviewerName?.trim() || 'Parent',
    reviewerId: review.reviewerUserId,
    athleteId: review.athleteId,
    athleteName: review.athleteName ?? undefined,
    rating: review.rating,
    comment: review.comment?.trim() || undefined,
    sessionType: review.sessionType ?? undefined,
    bookingId: review.bookingId,
    isVerifiedBooking: review.isVerifiedBooking,
    categories: review.categories,
    createdAt: review.createdAt,
  };
}

function dedupePublicReviews(reviews: PublicReview[]): PublicReview[] {
  const seen = new Set<string>();
  const result: PublicReview[] = [];
  for (const review of reviews) {
    if (!review.id || seen.has(review.id)) continue;
    seen.add(review.id);
    result.push(review);
  }
  return result;
}

function shouldUseLocalCoachFixture(coachId: string): boolean {
  void coachId;
  return apiClient.isMockMode;
}

function getCoachDisplayName(coachId: string): string {
  return `Coach ${coachId.replace(/^usr_/, '')}`;
}

function getApiCoachDisplayName(
  coachId: string,
  profile: ApiPublicCoachProfile | undefined,
): string {
  return profile?.displayName?.trim() || getCoachDisplayName(coachId);
}

function getApiCoachLocation(profile: ApiPublicCoachProfile | undefined): Coach['location'] {
  const location =
    profile?.publicLocations?.find((candidate) => candidate.isDefault) ??
    profile?.publicLocations?.[0];
  return location
    ? {
        city: location.label,
        lat: location.lat,
        lng: location.lng,
      }
    : { city: 'Unknown' };
}

function priceMinorToPounds(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value / 100) : undefined;
}

function toCoachFromOfferings(coachId: string, offerings: SessionOffering[]): Coach | null {
  const activeOfferings = offerings.filter(
    (offering) => offering.coachId === coachId && offering.status === 'active',
  ) as SessionOfferingWithCoachProfile[];
  if (activeOfferings.length === 0) {
    return null;
  }
  const profile: ApiPublicCoachProfile | undefined = activeOfferings.find(
    (offering) => offering.coachProfile,
  )?.coachProfile;

  const prices = activeOfferings.flatMap((offering) =>
    typeof offering.price === 'number' && Number.isFinite(offering.price)
      ? [offering.price]
      : [],
  );
  const timestamps = activeOfferings
    .map((offering) => new Date(offering.scheduledAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const minPrice = priceMinorToPounds(profile?.sessionRateMinor) ?? (prices.length > 0 ? Math.min(...prices) : 0);
  const maxPrice = priceMinorToPounds(profile?.priceMaxMinor) ?? (prices.length > 0 ? Math.max(...prices) : undefined);
  const focusTerms = Array.from(
    new Set(
      activeOfferings
        .flatMap((offering) => [offering.title, offering.description ?? ''])
        .join(' ')
        .split(/\W+/)
        .filter(Boolean),
    ),
  ).slice(0, 6);

  return {
    id: coachId,
    name: getApiCoachDisplayName(coachId, profile),
    bio: profile?.bio ?? 'This coach has live API-backed offerings.',
    sports: ['Football'],
    location: getApiCoachLocation(profile),
    rating: 0,
    reviewCount: 0,
    minPrice,
    maxPrice,
    profilePhotoUrl: undefined,
    coverPhotoUrl: undefined,
    joinedAt: undefined,
    totalSessions: 0,
    nextAvailable:
      timestamps.length > 0 ? new Date(timestamps[0] as number).toISOString() : undefined,
    badges: [],
    footballFocuses: focusTerms,
    experiences: profile?.experiences ?? [],
    certifications: (profile?.qualifications ?? []).map((name) => ({
      name,
      issuer: '',
      issueDate: '',
    })),
    languages: profile?.languages ?? [],
  };
}

function toCoachFromPublicProfileResponse(
  response: ApiPublicCoachProfileResponse,
  scheduledAt: string,
): Coach {
  const offerings = response.offerings.flatMap((offering) =>
    offering.active !== false
      ? [
          mapApiCoachOfferingToSessionOffering(
            offering,
            response.coachId,
            scheduledAt,
          ),
        ]
      : [],
  );
  const base = toCoachFromOfferings(response.coachId, offerings);
  const profile = response.coachProfile;
  const minPrice = priceMinorToPounds(profile.sessionRateMinor) ?? base?.minPrice ?? 0;
  const maxPrice = priceMinorToPounds(profile.priceMaxMinor) ?? base?.maxPrice;

  return {
    id: response.coachId,
    name: getApiCoachDisplayName(response.coachId, profile),
    bio: profile.bio ?? base?.bio ?? 'This coach has a live API-backed profile.',
    sports: base?.sports ?? ['Football'],
    location: getApiCoachLocation(profile) ?? base?.location ?? { city: 'Unknown' },
    rating: base?.rating ?? 0,
    reviewCount: base?.reviewCount ?? 0,
    minPrice,
    maxPrice,
    profilePhotoUrl: base?.profilePhotoUrl,
    coverPhotoUrl: base?.coverPhotoUrl,
    joinedAt: base?.joinedAt,
    totalSessions: base?.totalSessions ?? 0,
    nextAvailable: base?.nextAvailable,
    badges: base?.badges ?? [],
    footballFocuses:
      profile.specialties && profile.specialties.length > 0
        ? profile.specialties
        : base?.footballFocuses ?? [],
    experiences: profile.experiences ?? base?.experiences ?? [],
    certifications: (profile.qualifications ?? []).map((name) => ({
      name,
      issuer: '',
      issueDate: '',
    })),
    languages: profile.languages ?? base?.languages ?? [],
  };
}

function filterCoaches(
  coaches: Coach[],
  filters?: {
    sport?: string;
    location?: string;
    minRating?: number;
    maxPrice?: number;
  },
): Coach[] {
  let filtered = coaches;

  if (filters?.minRating) {
    filtered = filtered.filter((coach) => coach.rating >= filters.minRating!);
  }
  if (filters?.maxPrice) {
    filtered = filtered.filter((coach) => coach.minPrice <= filters.maxPrice!);
  }
  if (filters?.sport) {
    filtered = filtered.filter((coach) =>
      coach.sports.some((sport) => sport.toLowerCase() === filters.sport!.toLowerCase()),
    );
  }

  return filtered;
}

async function searchApiCoaches(
  params: ApiPublicCoachSearchParams,
): Promise<Result<Coach[], ServiceError>> {
  const scheduledAt = new Date().toISOString();
  const result = await searchPublicCoachesFromApi(params);
  if (!result.success) {
    return err(result.error);
  }
  return ok(
    result.data.results.map((item) =>
      toCoachFromPublicProfileResponse(
        {
          coachId: item.coachId,
          coachProfile: item.coachProfile,
          offerings: item.offerings,
          total: item.offerings.length,
          requestId: result.data.requestId,
        },
        scheduledAt,
      ),
    ),
  );
}

export const coachService = {
  /**
   * Get a single coach by ID
   */
  async getCoach(coachId: string): Promise<Result<Coach, ServiceError>> {
    logger.info('Getting coach', { coachId });
    try {
      if (!apiClient.isMockMode) {
        const scheduledAt = new Date().toISOString();
        const profileResult = await apiFetch<ApiPublicCoachProfileResponse>(
          `/v1/coaches/${encodeURIComponent(coachId)}/profile`,
        );
        if (!profileResult.success) {
          return err(profileResult.error);
        }
        return ok(toCoachFromPublicProfileResponse(profileResult.data, scheduledAt));
      }

      const coaches = await apiClient.get<Coach[]>(COACHES_KEY, MOCK_COACHES);
      const coach = coaches.find((c) => accountIdsMatch(c.id, coachId));
      if (!coach) return err(notFound('Coach', coachId));
      return ok(coach);
    } catch (error) {
      logger.error('Failed to get coach', error);
      return err(storageError('Failed to get coach'));
    }
  },

  /**
   * Get all coaches (with optional filters)
   */
  async getCoaches(filters?: {
    sport?: string;
    location?: string;
    minRating?: number;
    maxPrice?: number;
  }): Promise<Result<Coach[], ServiceError>> {
    logger.info('Getting coaches', { filters });
    try {
      if (!apiClient.isMockMode) {
        if (
          filters?.sport &&
          filters.sport.toLowerCase() !== 'football'
        ) {
          return ok([]);
        }
        if (filters?.location) {
          return err(
            unsupportedError(
              'Location coach filtering needs a public location projection before it can run in API mode.',
            ),
          );
        }
        return searchApiCoaches({
          sports: ['Football'],
          priceMax: filters?.maxPrice,
          rating: filters?.minRating,
          pageSize: 100,
        });
      }

      let coaches = await apiClient.get<Coach[]>(COACHES_KEY, MOCK_COACHES);
      return ok(filterCoaches(coaches, filters));
    } catch (error) {
      logger.error('Failed to get coaches', error);
      return err(storageError('Failed to get coaches'));
    }
  },

  /**
   * Get reviews for a coach
   */
  async getCoachReviews(coachId: string): Promise<Result<PublicReview[], ServiceError>> {
    logger.info('Getting coach reviews', { coachId });
    try {
      if (!shouldUseLocalCoachFixture(coachId)) {
        const apiResult = await apiFetch<ApiCoachReviewsResponse>(
          `/v1/coaches/${encodeURIComponent(coachId)}/reviews`,
        );
        if (!apiResult.success) {
          return err(apiResult.error);
        }

        return ok(
          apiResult.data.reviews
            .map(toPublicReviewFromApi)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
        );
      }

      const [publicReviews, rateCoachReviews] = await Promise.all([
        apiClient.get<PublicReview[]>(COACH_REVIEWS_KEY, MOCK_REVIEWS),
        apiClient.get<RateCoachReviewRecord[]>(STORAGE_KEYS.RATE_COACH_REVIEWS, []),
      ]);
      const merged = dedupePublicReviews([
        ...publicReviews,
        ...rateCoachReviews.map(toPublicReview),
      ]);
      const coachReviews = merged
        .filter((r) => accountIdsMatch(r.coachId, coachId))
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
      return ok(coachReviews);
    } catch (error) {
      logger.error('Failed to get coach reviews', error);
      return err(storageError('Failed to get coach reviews'));
    }
  },

  /**
   * Submit a review for a coach
   */
  async submitReview(
    coachId: string,
    review: {
      rating: number;
      comment?: string;
      sessionId?: string;
      sessionType?: string;
    },
  ): Promise<Result<PublicReview, ServiceError>> {
    logger.info('Submitting review', { coachId, rating: review.rating });
    if (!apiClient.isMockMode) {
      return err(
        serviceError(
          'VALIDATION',
          'Reviews must be submitted from a completed booking in API mode.',
        ),
      );
    }

    try {
      const coaches = await apiClient.get<Coach[]>(COACHES_KEY, MOCK_COACHES);
      const canonicalCoachId =
        coaches.find((coach) => accountIdsMatch(coach.id, coachId))?.id ?? coachId;
      const createdAt = new Date().toISOString();
      const reviewId = `review-${Date.now()}`;
      const storedReview: StoredCoachReview = {
        id: reviewId,
        coachId: canonicalCoachId,
        coachName: coaches.find((coach) => coach.id === canonicalCoachId)?.name,
        userId: 'current-user',
        parentId: 'current-user',
        userName: 'You',
        parentName: 'You',
        rating: review.rating,
        text: review.comment?.trim() || '',
        content: review.comment?.trim() || '',
        sessionType: review.sessionType,
        createdAt,
        sessionDate: createdAt,
        bookingId: review.sessionId,
      };

      await appendCoachReview(storedReview);
      return ok(toPublicReview(storedReview));
    } catch (error) {
      logger.error('Failed to submit review', error);
      return err(storageError('Failed to submit review'));
    }
  },

  /**
   * Search coaches
   */
  async searchCoaches(query: string): Promise<Result<Coach[], ServiceError>> {
    logger.info('Searching coaches', { query });
    try {
      if (!apiClient.isMockMode) {
        return searchApiCoaches({
          query,
          sports: ['Football'],
          pageSize: 100,
        });
      }

      const coaches = await apiClient.get<Coach[]>(COACHES_KEY, MOCK_COACHES);
      const lowerQuery = query.toLowerCase();
      const results = coaches.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.bio?.toLowerCase().includes(lowerQuery) ||
          c.footballFocuses?.some((f) => f.toLowerCase().includes(lowerQuery)),
      );
      return ok(results);
    } catch (error) {
      logger.error('Failed to search coaches', error);
      return err(storageError('Failed to search coaches'));
    }
  },

  /**
   * Get featured/recommended coaches
   */
  async getFeaturedCoaches(): Promise<Result<Coach[], ServiceError>> {
    logger.info('Getting featured coaches');
    try {
      if (!apiClient.isMockMode) {
        return searchApiCoaches({
          sports: ['Football'],
          sortBy: 'price_high',
          pageSize: 5,
        });
      }

      const coaches = await apiClient.get<Coach[]>(COACHES_KEY, MOCK_COACHES);
      const featured = Array.from(coaches).toSorted((a, b) => b.rating - a.rating).slice(0, 5);
      return ok(featured);
    } catch (error) {
      logger.error('Failed to get featured coaches', error);
      return err(storageError('Failed to get featured coaches'));
    }
  },

  /**
   * Follow/unfollow a coach
   */
  async toggleFollow(coachId: string, _userId: string): Promise<Result<boolean, ServiceError>> {
    logger.info('Toggling follow', { coachId });
    try {
      if (!apiClient.isMockMode) {
        const statusResult = await apiFetch<ApiCoachFollowStatusResponse>(
          `/v1/follows?targetUserId=${encodeURIComponent(coachId)}`,
        );
        if (!statusResult.success) {
          return err(statusResult.error);
        }

        if (statusResult.data.following === true) {
          const removeResult = await apiFetch<ApiCoachFollowMutationResponse>(
            `/v1/follows?followingId=${encodeURIComponent(coachId)}`,
            {
              method: 'DELETE',
            },
          );
          return removeResult.success ? ok(false) : err(removeResult.error);
        }

        const followResult = await apiFetch<ApiCoachFollowMutationResponse>('/v1/follows', {
          method: 'POST',
          body: JSON.stringify({
            followingId: coachId,
            followingType: 'COACH',
          }),
        });
        if (!followResult.success) {
          return err(followResult.error);
        }
        if (!followResult.data.follow) {
          return err(serviceError('UNKNOWN', 'Follow API did not return a follow relationship.'));
        }
      }
      return ok(true);
    } catch (error) {
      logger.error('Failed to toggle follow', error);
      return err(storageError('Failed to toggle follow'));
    }
  },
};
