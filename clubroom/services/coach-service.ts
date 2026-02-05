/**
 * Coach Service
 *
 * Manages coach profiles, reviews, and public-facing data.
 */

import { api } from '@/constants/config';

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
  minPriceUsd: number;
  maxPriceUsd?: number;
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
  rating: number;
  comment?: string;
  sessionType?: string;
  createdAt: string;
}

const USE_MOCK = api.useMock;

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_COACHES: Coach[] = [
  {
    id: 'coach-1',
    name: 'Marcus Johnson',
    bio: 'Former professional footballer with 15 years of coaching experience. Specializing in youth development and technical skills. I believe in building confidence alongside ability, helping young players reach their full potential on and off the pitch.',
    sports: ['Football'],
    location: { city: 'Manchester', state: 'Greater Manchester', lat: 53.4808, lng: -2.2426 },
    distance: 2.5,
    rating: 4.8,
    reviewCount: 47,
    minPriceUsd: 35,
    maxPriceUsd: 60,
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
    bio: 'Passionate about developing young talent. Former England Women\'s U21 player with a focus on technical excellence and tactical awareness.',
    sports: ['Football'],
    location: { city: 'London', state: 'Greater London', lat: 51.5074, lng: -0.1278 },
    distance: 5.0,
    rating: 4.9,
    reviewCount: 89,
    minPriceUsd: 45,
    maxPriceUsd: 75,
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
    certifications: [
      { name: 'UEFA A License', issuer: 'UEFA', issueDate: '2020' },
    ],
    languages: [
      { name: 'English', proficiency: 'Native' },
    ],
  },
];

const MOCK_REVIEWS: PublicReview[] = [
  {
    id: 'review-1',
    coachId: 'coach-1',
    reviewerName: 'James P.',
    reviewerId: 'parent-1',
    rating: 5,
    comment: 'Marcus is fantastic with my son. His confidence on the ball has improved dramatically over the past 3 months. Highly recommend!',
    sessionType: '1-on-1 Session',
    createdAt: '2024-01-10T14:00:00Z',
  },
  {
    id: 'review-2',
    coachId: 'coach-1',
    reviewerName: 'Emily R.',
    reviewerId: 'parent-2',
    rating: 5,
    comment: 'Professional, punctual, and great with kids. My daughter loves her sessions with Marcus.',
    sessionType: 'Group Session',
    createdAt: '2024-01-05T10:00:00Z',
  },
  {
    id: 'review-3',
    coachId: 'coach-1',
    reviewerName: 'David M.',
    reviewerId: 'parent-3',
    rating: 4,
    comment: 'Good coaching sessions. Would appreciate more feedback after each session.',
    sessionType: '1-on-1 Session',
    createdAt: '2023-12-20T16:00:00Z',
  },
  {
    id: 'review-4',
    coachId: 'coach-1',
    reviewerName: 'Lisa T.',
    reviewerId: 'parent-4',
    rating: 5,
    comment: 'Excellent coach! Really understands how to work with different skill levels.',
    createdAt: '2023-12-15T11:00:00Z',
  },
  {
    id: 'review-5',
    coachId: 'coach-2',
    reviewerName: 'Michael B.',
    reviewerId: 'parent-5',
    rating: 5,
    comment: 'Sarah is an incredible coach. Her experience as a professional really shows in how she teaches.',
    sessionType: '1-on-1 Session',
    createdAt: '2024-01-08T09:00:00Z',
  },
];

// ============================================================================
// SERVICE METHODS
// ============================================================================

export const coachService = {
  /**
   * Get a single coach by ID
   */
  async getCoach(coachId: string): Promise<Coach | null> {
    if (USE_MOCK) {
      return MOCK_COACHES.find((c) => c.id === coachId) || null;
    }

    const response = await fetch(`/api/coaches/${coachId}`);
    return response.json();
  },

  /**
   * Get all coaches (with optional filters)
   */
  async getCoaches(filters?: {
    sport?: string;
    location?: string;
    minRating?: number;
    maxPrice?: number;
  }): Promise<Coach[]> {
    if (USE_MOCK) {
      let coaches = [...MOCK_COACHES];

      if (filters?.minRating) {
        coaches = coaches.filter((c) => c.rating >= filters.minRating!);
      }
      if (filters?.maxPrice) {
        coaches = coaches.filter((c) => c.minPriceUsd <= filters.maxPrice!);
      }

      return coaches;
    }

    const params = new URLSearchParams();
    if (filters?.sport) params.append('sport', filters.sport);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.minRating) params.append('minRating', filters.minRating.toString());
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());

    const response = await fetch(`/api/coaches?${params}`);
    return response.json();
  },

  /**
   * Get reviews for a coach
   */
  async getCoachReviews(coachId: string): Promise<PublicReview[]> {
    if (USE_MOCK) {
      return MOCK_REVIEWS.filter((r) => r.coachId === coachId);
    }

    const response = await fetch(`/api/coaches/${coachId}/reviews`);
    return response.json();
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
    }
  ): Promise<PublicReview> {
    if (USE_MOCK) {
      const newReview: PublicReview = {
        id: `review-${Date.now()}`,
        coachId,
        reviewerName: 'You',
        reviewerId: 'current-user',
        rating: review.rating,
        comment: review.comment,
        sessionType: review.sessionType,
        createdAt: new Date().toISOString(),
      };
      MOCK_REVIEWS.unshift(newReview);
      return newReview;
    }

    const response = await fetch(`/api/coaches/${coachId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    return response.json();
  },

  /**
   * Search coaches
   */
  async searchCoaches(query: string): Promise<Coach[]> {
    if (USE_MOCK) {
      const lowerQuery = query.toLowerCase();
      return MOCK_COACHES.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.bio?.toLowerCase().includes(lowerQuery) ||
          c.footballFocuses?.some((f) => f.toLowerCase().includes(lowerQuery))
      );
    }

    const response = await fetch(`/api/coaches/search?q=${encodeURIComponent(query)}`);
    return response.json();
  },

  /**
   * Get featured/recommended coaches
   */
  async getFeaturedCoaches(): Promise<Coach[]> {
    if (USE_MOCK) {
      return MOCK_COACHES.sort((a, b) => b.rating - a.rating).slice(0, 5);
    }

    const response = await fetch('/api/coaches/featured');
    return response.json();
  },

  /**
   * Follow/unfollow a coach
   */
  async toggleFollow(coachId: string, userId: string): Promise<boolean> {
    if (USE_MOCK) {
      // Mock: just return toggled state
      return true;
    }

    const response = await fetch(`/api/coaches/${coachId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await response.json();
    return data.isFollowing;
  },
};
