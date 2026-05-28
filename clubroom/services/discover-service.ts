/**
 * Discover Service
 *
 * Provides advanced coach discovery functionality including:
 * - Full-text search across coach profiles
 * - Filtering by price, rating, distance, sport, gender, language
 * - Location-based search with distance calculation
 * - Filter options with counts
 * - Suggested coaches based on user history
 */

import type {
  CoachProfile,
  CoachSearchFilters,
  CoachSearchResult,
  CoachSearchResponse,
  FilterOptions,
  FilterOption,
  SuggestedCoach,
  FootballObjective,
  TrainingFormat,
} from '@/constants/types';
import type { SessionOffering } from '@/constants/session-types';
import type { CoachDirectoryEntry } from '@/constants/relational-demo-seeds';
import { apiClient } from './api-client';
import { listPublicCoachOfferingIndexFromApi } from '@/services/coach-offering-api';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { api, preApiLive } from '@/constants/config';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';
import { coachTravelService } from '@/services/coach-travel-service';
import { getSessionOfferingHeadcount } from '@/utils/session-offering-capacity';
import { createLogger } from '@/utils/logger';
import { type Result, type ServiceError, ok, err, storageError } from '@/types/result';
const logger = createLogger('DiscoverService');

const MAX_RECENT_SEARCHES = 10;
const DAY_MS = 24 * 60 * 60 * 1000;
const DISCOVER_DEFAULT_LOCATION = { lat: 51.5074, lng: -0.1278 };
const DISCOVER_DEFAULT_FOCUS: FootballObjective[] = ['Passing', 'Dribbling'];
const COACH_DIRECTORY_KEY = STORAGE_KEYS.COACH_DIRECTORY;

// Phase 2: keep discover data local to the service (no mock-data import dependency).
const importedCoachProfiles: CoachProfile[] = [];

// Create coaches with location data from imported profiles
const coachesFromImport: CoachProfile[] = importedCoachProfiles.map(
  (coach: CoachProfile, index: number) => ({
    ...coach,
    location: coach.location ?? {
      lat: 51.5074 + (Math.random() - 0.5) * 0.1,
      lng: -0.1278 + (Math.random() - 0.5) * 0.2,
    },
    distanceMiles: coach.distanceMiles ?? 1 + index * 1.5,
  }),
);

// Mock extended coach data for discovery
const MOCK_DISCOVERY_COACHES: CoachProfile[] = [
  ...coachesFromImport,
  // Add more coaches for realistic search results
  {
    id: 'coach_mike',
    fullName: 'Mike Thompson',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'Manchester',
    state: 'England',
    distanceMiles: 5.2,
    rating: { average: 4.7, reviewCount: 38 },
    priceRange: { min: 45, max: 70, unitLabel: 'per session' },
    nextAvailability: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [{ id: 'b1', label: 'Verified', tone: 'success' as const }],
    sessionFormats: ['In-person', 'Virtual'] as TrainingFormat[],
    shortBio: 'Specialist striker coach with 12 years experience.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=mike',
    footballFocuses: ['Finishing', 'Dribbling'] as FootballObjective[],
    location: { lat: 51.4854, lng: -0.1547 },
    joinedDate: new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 185,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [
      { id: 'en', name: 'English', proficiency: 'Native' as const },
      { id: 'fr', name: 'French', proficiency: 'Conversational' as const },
    ],
    achievements: [],
  },
  {
    id: 'coach_david',
    fullName: 'Aiden Sharma',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'London',
    state: 'England',
    distanceMiles: 3.8,
    rating: { average: 4.8, reviewCount: 29 },
    priceRange: { min: 40, max: 60, unitLabel: 'per session' },
    nextAvailability: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [{ id: 'b1', label: 'Background Check', tone: 'success' as const }],
    sessionFormats: ['In-person', 'Small group'] as TrainingFormat[],
    shortBio: 'Youth development specialist focusing on technical skills.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=david',
    footballFocuses: ['Dribbling', 'Passing'] as FootballObjective[],
    location: { lat: 51.4621, lng: -0.1142 },
    joinedDate: new Date(Date.now() - 365 * 1.5 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 142,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [{ id: 'en', name: 'English', proficiency: 'Native' as const }],
    achievements: [],
  },
  {
    id: 'coach_amy',
    fullName: 'Amy Taylor',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'London',
    state: 'England',
    distanceMiles: 4.1,
    rating: { average: 4.6, reviewCount: 22 },
    priceRange: { min: 55, max: 85, unitLabel: 'per session' },
    nextAvailability: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [{ id: 'b1', label: 'Verified', tone: 'success' as const }],
    sessionFormats: ['In-person'] as TrainingFormat[],
    shortBio: 'Speed and agility specialist for wingers.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=amy',
    footballFocuses: ['Conditioning', 'Dribbling'] as FootballObjective[],
    location: { lat: 51.5231, lng: -0.0876 },
    joinedDate: new Date(Date.now() - 365 * 2.5 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 120,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [
      { id: 'en', name: 'English', proficiency: 'Native' as const },
      { id: 'es', name: 'Spanish', proficiency: 'Fluent' as const },
    ],
    achievements: [],
  },
  {
    id: 'coach_oliver',
    fullName: 'Oliver Jones',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'Birmingham',
    state: 'England',
    distanceMiles: 8.5,
    rating: { average: 4.9, reviewCount: 55 },
    priceRange: { min: 60, max: 90, unitLabel: 'per session' },
    nextAvailability: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [
      { id: 'b1', label: 'Premium Coach', tone: 'warning' as const },
      { id: 'b2', label: 'Top Rated', tone: 'success' as const },
    ],
    sessionFormats: ['In-person', 'Virtual', 'Small group'] as TrainingFormat[],
    shortBio: 'Data-driven analysis coach with video review expertise.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=oliver',
    footballFocuses: ['Passing', 'Defending'] as FootballObjective[],
    location: { lat: 51.5412, lng: -0.1654 },
    joinedDate: new Date(Date.now() - 365 * 4 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 260,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [
      { id: 'en', name: 'English', proficiency: 'Native' as const },
      { id: 'de', name: 'German', proficiency: 'Conversational' as const },
    ],
    achievements: [],
  },
  {
    id: 'coach_lucy',
    fullName: 'Lucy Brown',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'London',
    state: 'England',
    distanceMiles: 2.9,
    rating: { average: 4.7, reviewCount: 33 },
    priceRange: { min: 58, max: 75, unitLabel: 'per session' },
    nextAvailability: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [{ id: 'b1', label: 'Verified', tone: 'success' as const }],
    sessionFormats: ['In-person', 'Small group'] as TrainingFormat[],
    shortBio: 'Academy-level forward coach specializing in finishing.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=lucy',
    footballFocuses: ['Finishing', 'Conditioning'] as FootballObjective[],
    location: { lat: 51.4923, lng: -0.1421 },
    joinedDate: new Date(Date.now() - 365 * 3 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 188,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [{ id: 'en', name: 'English', proficiency: 'Native' as const }],
    achievements: [],
  },
  {
    id: 'coach_harry',
    fullName: 'Harry Clark',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'Leeds',
    state: 'England',
    distanceMiles: 12.3,
    rating: { average: 4.5, reviewCount: 18 },
    priceRange: { min: 35, max: 50, unitLabel: 'per session' },
    nextAvailability: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    badges: [],
    sessionFormats: ['In-person', 'Virtual'] as TrainingFormat[],
    shortBio: 'Psychology-focused mentor for decision-making.',
    profilePhotoUrl: 'https://i.pravatar.cc/300?u=harry',
    footballFocuses: ['Passing', 'Defending'] as FootballObjective[],
    location: { lat: 51.4532, lng: -0.1876 },
    joinedDate: new Date(Date.now() - 365 * 1 * 24 * 60 * 60 * 1000).toISOString(),
    totalSessions: 90,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [
      { id: 'en', name: 'English', proficiency: 'Native' as const },
      { id: 'pt', name: 'Portuguese', proficiency: 'Basic' as const },
    ],
    achievements: [],
  },
];

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Check if coach matches text search query
 */
function matchesQuery(coach: CoachProfile, query: string): boolean {
  if (!query) return true;
  const searchTerms = query.toLowerCase().split(' ').filter(Boolean);
  const searchableText = [
    coach.fullName,
    coach.shortBio,
    coach.bio,
    coach.city,
    coach.state,
    ...coach.footballFocuses,
    ...(coach.languages?.map((l) => l.name) ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchTerms.every((term) => searchableText.includes(term));
}

/**
 * Calculate relevance score for search ranking
 */
function calculateRelevanceScore(
  coach: CoachProfile,
  filters: CoachSearchFilters,
  distanceKm?: number,
): number {
  let score = 50; // Base score

  // Rating boost (up to 25 points)
  score += coach.rating.average * 5;

  // Review count boost (up to 10 points)
  score += Math.min(coach.rating.reviewCount / 10, 10);

  // Distance penalty (up to -20 points for far coaches)
  if (distanceKm !== undefined) {
    score -= Math.min(distanceKm / 5, 20);
  }

  // Verified badge boost
  if (coach.badges?.some((b) => b.label === 'Verified')) {
    score += 10;
  }

  // Query match boost
  if (filters.query) {
    const queryLower = filters.query.toLowerCase();
    if (coach.fullName.toLowerCase().includes(queryLower)) {
      score += 15;
    }
    if (coach.footballFocuses.some((f) => f.toLowerCase().includes(queryLower))) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

function milesToKm(miles: number): number {
  return miles * 1.60934;
}

function canCoachServeDistance(
  coach: CoachProfile,
  distanceKm: number,
  filters: CoachSearchFilters,
): boolean {
  const requestedFormats = filters.formats ?? [];
  const remoteRequested = requestedFormats.includes('Virtual');
  const coachTravelRadiusKm = milesToKm(coach.travelRadius ?? 10);
  const canTravel =
    coach.acceptsTravelSessions !== false &&
    coach.sessionFormats.includes('In-person') &&
    distanceKm <= coachTravelRadiusKm;

  if (requestedFormats.length === 0) {
    return canTravel;
  }

  const canRemote =
    coach.acceptsRemoteSessions === true &&
    coach.sessionFormats.includes('Virtual') &&
    remoteRequested;

  return canTravel || canRemote;
}

type CoachOfferingSummary = {
  bookableCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  nextAvailability: string | null;
  formats: Set<TrainingFormat>;
};

const FOCUS_ALIASES: Record<string, FootballObjective> = {
  dribbling: 'Dribbling',
  passing: 'Passing',
  defending: 'Defending',
  finishing: 'Finishing',
  goalkeeping: 'Goalkeeping',
  conditioning: 'Conditioning',
  'first touch': 'Passing',
  movement: 'Finishing',
  positioning: 'Defending',
  composure: 'Passing',
  confidence: 'Conditioning',
  transition: 'Defending',
  'decision making': 'Passing',
  pressing: 'Defending',
  'recovery runs': 'Conditioning',
  assessment: 'Conditioning',
};

function normalizeCoachFocuses(rawFocuses: string[] | undefined): FootballObjective[] {
  if (!Array.isArray(rawFocuses) || rawFocuses.length === 0) {
    return [...DISCOVER_DEFAULT_FOCUS];
  }

  const normalized = new Set<FootballObjective>();
  for (const focus of rawFocuses) {
    const key = focus.trim().toLowerCase();
    const mapped = FOCUS_ALIASES[key];
    if (mapped) {
      normalized.add(mapped);
    }
  }

  return normalized.size > 0 ? Array.from(normalized) : [...DISCOVER_DEFAULT_FOCUS];
}

function toSessionFormat(offering: SessionOffering): TrainingFormat {
  return offering.sessionType === 'group' ? 'Small group' : 'In-person';
}

function isBookableOffering(offering: SessionOffering, now: number): boolean {
  if (offering.status !== 'active') return false;

  const startsAtMs = new Date(offering.scheduledAt).getTime();
  const isUpcoming = offering.isRecurring || (Number.isFinite(startsAtMs) && startsAtMs >= now);
  if (!isUpcoming) return false;

  return getSessionOfferingHeadcount(offering) < offering.maxParticipants;
}

function buildCoachOfferingSummaryMap(
  offerings: SessionOffering[],
): Map<string, CoachOfferingSummary> {
  const now = Date.now();
  const summaries = new Map<string, CoachOfferingSummary>();

  for (const offering of offerings) {
    if (!offering.coachId) continue;

    const existing = summaries.get(offering.coachId) ?? {
      bookableCount: 0,
      minPrice: null,
      maxPrice: null,
      nextAvailability: null,
      formats: new Set<TrainingFormat>(),
    };

    if (isBookableOffering(offering, now)) {
      existing.bookableCount += 1;
      existing.formats.add(toSessionFormat(offering));

      if (typeof offering.price === 'number' && Number.isFinite(offering.price) && offering.price > 0) {
        existing.minPrice =
          existing.minPrice === null ? offering.price : Math.min(existing.minPrice, offering.price);
        existing.maxPrice =
          existing.maxPrice === null ? offering.price : Math.max(existing.maxPrice, offering.price);
      }

      const startsAtMs = new Date(offering.scheduledAt).getTime();
      if (Number.isFinite(startsAtMs)) {
        if (!existing.nextAvailability) {
          existing.nextAvailability = offering.scheduledAt;
        } else {
          const currentMs = new Date(existing.nextAvailability).getTime();
          if (!Number.isFinite(currentMs) || startsAtMs < currentMs) {
            existing.nextAvailability = offering.scheduledAt;
          }
        }
      }
    }

    summaries.set(offering.coachId, existing);
  }

  return summaries;
}

function mapBadgeTone(label: string): 'success' | 'warning' | 'default' {
  const lower = label.toLowerCase();
  if (lower.includes('premium')) return 'warning';
  if (lower.includes('verified') || lower.includes('background') || lower.includes('dbs') || lower.includes('top rated')) {
    return 'success';
  }
  return 'default';
}

function mapDirectoryCoachToProfile(
  entry: CoachDirectoryEntry,
  summary: CoachOfferingSummary | undefined,
  travelRadius?: number,
  acceptsTravelSessions: boolean = true,
  acceptsRemoteSessions: boolean = false,
): CoachProfile {
  const minPrice = summary?.minPrice ?? entry.minPrice ?? 35;
  const maxPrice = summary?.maxPrice ?? entry.maxPrice ?? Math.max(minPrice + 20, minPrice);
  const nextAvailability =
    summary?.nextAvailability ?? entry.nextAvailable ?? new Date(Date.now() + DAY_MS * 2).toISOString();
  const sessionFormats: TrainingFormat[] =
    summary && summary.formats.size > 0 ? Array.from(summary.formats) : ['In-person'];
  const focuses = normalizeCoachFocuses(entry.footballFocuses);
  const shortBio = (entry.bio ?? '').trim();

  return {
    id: entry.id,
    fullName: entry.name,
    primarySport: 'Football',
    sports: ['Football'],
    city: entry.location?.city ?? 'London',
    state: entry.location?.state ?? 'Greater London',
    distanceMiles:
      typeof entry.distance === 'number' && Number.isFinite(entry.distance)
        ? entry.distance
        : 5,
    travelRadius: travelRadius ?? 10,
    rating: {
      average: entry.rating,
      reviewCount: entry.reviewCount,
    },
    priceRange: {
      min: minPrice,
      max: maxPrice,
      unitLabel: 'per session',
    },
    sessionRate: minPrice,
    nextAvailability,
    badges: (entry.badges ?? []).map((label, index) => ({
      id: `badge_${entry.id}_${index}`,
      label,
      tone: mapBadgeTone(label),
    })),
    sessionFormats,
    acceptsTravelSessions,
    acceptsRemoteSessions,
    shortBio: shortBio.length > 0 ? shortBio : `${entry.name} is currently taking bookings.`,
    profilePhotoUrl: entry.profilePhotoUrl ?? `https://i.pravatar.cc/300?u=${entry.id}`,
    coverPhotoUrl: entry.coverPhotoUrl,
    footballFocuses: focuses,
    location: {
      lat: entry.location?.lat ?? DISCOVER_DEFAULT_LOCATION.lat,
      lng: entry.location?.lng ?? DISCOVER_DEFAULT_LOCATION.lng,
    },
    bio: entry.bio,
    joinedDate: entry.joinedAt ?? new Date(Date.now() - DAY_MS * 180).toISOString(),
    totalSessions: entry.totalSessions,
    experiences: [],
    certifications: [],
    posts: [],
    photoGallery: [],
    videoGallery: [],
    languages: [{ id: 'lang_en', name: 'English', proficiency: 'Native' }],
    achievements: entry.qualifications ?? [],
  };
}

class DiscoverService {
  private coaches: CoachProfile[] = MOCK_DISCOVERY_COACHES;
  private forceMockData = process.env.NODE_ENV === 'test';
  private lastHydratedAt = 0;
  private hydrationInFlight: Promise<void> | null = null;
  private readonly hydrationTtlMs = 15_000;

  private async ensureDataset(): Promise<void> {
    if (this.forceMockData) {
      return;
    }

    const now = Date.now();
    if (now - this.lastHydratedAt < this.hydrationTtlMs) {
      return;
    }

    if (this.hydrationInFlight) {
      return this.hydrationInFlight;
    }

    this.hydrationInFlight = this.hydrateFromStorage();
    try {
      await this.hydrationInFlight;
    } finally {
      this.hydrationInFlight = null;
    }
  }

  private async hydrateFromStorage(): Promise<void> {
    try {
      if (api.useMock && preApiLive.enabled) {
        await ensureRelationalDemoSeeded();
      }

      let offerings: SessionOffering[] = [];
      if (apiClient.isMockMode) {
        [offerings] = await Promise.all([
          apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
        ]);
      } else {
        const offeringsResult = await listPublicCoachOfferingIndexFromApi(new Date().toISOString());
        if (!offeringsResult.success) {
          throw offeringsResult.error;
        }
        offerings = offeringsResult.data;
      }

      const [directory, travelSettings] = await Promise.all([
        apiClient.get<CoachDirectoryEntry[]>(COACH_DIRECTORY_KEY, []),
        apiClient.get<
          Array<{
            coachId: string;
            radiusMiles: number;
            acceptsTravelSessions: boolean;
            acceptsRemoteSessions: boolean;
          }>
        >(STORAGE_KEYS.COACH_TRAVEL_SETTINGS, []),
      ]);

      if (directory.length === 0) {
        return;
      }

      const travelSettingsByCoachId = new Map(
        travelSettings.map((setting) => [setting.coachId, setting]),
      );
      const summaryByCoachId = buildCoachOfferingSummaryMap(offerings);
      const mapped = directory.map((entry) =>
        mapDirectoryCoachToProfile(
          entry,
          summaryByCoachId.get(entry.id),
          travelSettingsByCoachId.get(entry.id)?.radiusMiles,
          travelSettingsByCoachId.get(entry.id)?.acceptsTravelSessions ?? true,
          travelSettingsByCoachId.get(entry.id)?.acceptsRemoteSessions ?? false,
        ),
      );
      const bookable = mapped.filter(
        (coach) => (summaryByCoachId.get(coach.id)?.bookableCount ?? 0) > 0,
      );
      const resolved = bookable.length > 0 ? bookable : mapped;

      if (resolved.length > 0) {
        this.coaches = resolved;
        logger.info('discover_storage_dataset_loaded', {
          coachCount: resolved.length,
          sourceCoachCount: directory.length,
          offerings: offerings.length,
        });
      }
    } catch (error) {
      logger.warn('discover_storage_hydration_failed', { error });
    } finally {
      this.lastHydratedAt = Date.now();
    }
  }

  /**
   * Search coaches with comprehensive filtering
   */
  async searchCoaches(
    filters: CoachSearchFilters = {},
    page: number = 1,
    pageSize: number = 20,
  ): Promise<Result<CoachSearchResponse, ServiceError>> {
    try {
      await this.ensureDataset();
      let results = [...this.coaches];

      // Apply text search
      if (filters.query) {
        results = results.filter((coach) => matchesQuery(coach, filters.query!));
      }

      // Apply price filter
      if (filters.priceMin !== undefined) {
        results = results.filter((coach) => coach.priceRange.max >= filters.priceMin!);
      }
      if (filters.priceMax !== undefined) {
        results = results.filter((coach) => coach.priceRange.min <= filters.priceMax!);
      }

      // Apply rating filter
      if (filters.rating !== undefined) {
        results = results.filter((coach) => coach.rating.average >= filters.rating!);
      }

      // Apply focuses filter
      if (filters.focuses && filters.focuses.length > 0) {
        results = results.filter((coach) =>
          filters.focuses!.some((focus) => coach.footballFocuses.includes(focus)),
        );
      }

      // Apply formats filter
      if (filters.formats && filters.formats.length > 0) {
        results = results.filter((coach) =>
          filters.formats!.some((format) => coach.sessionFormats.includes(format)),
        );
      }

      // Apply languages filter
      if (filters.languages && filters.languages.length > 0) {
        results = results.filter((coach) =>
          filters.languages!.some((lang) =>
            coach.languages?.some((l) => l.name.toLowerCase() === lang.toLowerCase()),
          ),
        );
      }

      // Apply location/distance filter
      let resultsWithDistance: { coach: CoachProfile; distanceKm?: number }[] = results.map(
        (coach) => ({ coach }),
      );

      if (filters.location) {
        resultsWithDistance = results.map((coach) => {
          const distanceKm = calculateDistance(
            filters.location!.lat,
            filters.location!.lng,
            coach.location.lat,
            coach.location.lng,
          );
          return { coach, distanceKm };
        });

        resultsWithDistance = resultsWithDistance.filter(({ coach, distanceKm }) => {
          if (distanceKm === undefined) return true;
          return canCoachServeDistance(coach, distanceKm, filters);
        });

        // Filter by radius
        if (filters.distance) {
          resultsWithDistance = resultsWithDistance.filter(
            (r) => r.distanceKm !== undefined && r.distanceKm <= filters.distance!,
          );
        }
      }

      // Calculate relevance scores and create search results
      const searchResults: CoachSearchResult[] = resultsWithDistance.map((r) => ({
        coach: r.distanceKm !== undefined
          ? {
              ...r.coach,
              distanceMiles: Number((r.distanceKm / 1.60934).toFixed(1)),
            }
          : r.coach,
        relevanceScore: calculateRelevanceScore(r.coach, filters, r.distanceKm),
        distanceKm: r.distanceKm,
        matchedTerms: filters.query
          ? filters.query.split(' ').filter((term) => matchesQuery(r.coach, term))
          : undefined,
      }));

      // Sort results
      switch (filters.sortBy) {
        case 'distance':
          searchResults.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
          break;
        case 'rating':
          searchResults.sort((a, b) => b.coach.rating.average - a.coach.rating.average);
          break;
        case 'price_low':
          searchResults.sort((a, b) => a.coach.priceRange.min - b.coach.priceRange.min);
          break;
        case 'price_high':
          searchResults.sort((a, b) => b.coach.priceRange.max - a.coach.priceRange.max);
          break;
        case 'reviews':
          searchResults.sort((a, b) => b.coach.rating.reviewCount - a.coach.rating.reviewCount);
          break;
        default:
          // Default: sort by relevance
          searchResults.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      // Paginate
      const totalCount = searchResults.length;
      const startIndex = (page - 1) * pageSize;
      const paginatedResults = searchResults.slice(startIndex, startIndex + pageSize);

      // Save search to recent searches
      if (filters.query) {
        await this.saveRecentSearch(filters.query);
      }

      const filterOptionsResult = await this.getFilterOptions(filters);
      if (!filterOptionsResult.success) {
        return filterOptionsResult;
      }

      return ok({
        results: paginatedResults,
        totalCount,
        page,
        pageSize,
        hasMore: startIndex + pageSize < totalCount,
        filterOptions: filterOptionsResult.data,
      });
    } catch (error) {
      logger.error('Failed to search coaches', { filters, page, pageSize, error });
      return err(storageError('Failed to search coaches'));
    }
  }

  /**
   * Get coaches near a specific location
   */
  async getCoachesNearLocation(
    lat: number,
    lng: number,
    radiusKm: number = 10,
  ): Promise<Result<CoachSearchResult[], ServiceError>> {
    try {
      await this.ensureDataset();
      const results = this.coaches
        .map((coach) => {
          const distanceKm = calculateDistance(lat, lng, coach.location.lat, coach.location.lng);
          return {
            coach: {
              ...coach,
              distanceMiles: Number((distanceKm / 1.60934).toFixed(1)),
            },
            relevanceScore: calculateRelevanceScore(coach, {}, distanceKm),
            distanceKm,
          };
        })
        .filter((r) => r.distanceKm <= radiusKm)
        .filter((r) => canCoachServeDistance(r.coach, r.distanceKm, {}))
        .sort((a, b) => a.distanceKm - b.distanceKm);

      return ok(results);
    } catch (error) {
      logger.error('Failed to get coaches near location', { lat, lng, radiusKm, error });
      return err(storageError('Failed to get nearby coaches'));
    }
  }

  /**
   * Get available filter options with counts
   */
  async getFilterOptions(
    currentFilters: CoachSearchFilters = {},
  ): Promise<Result<FilterOptions, ServiceError>> {
    try {
      await this.ensureDataset();
      // Get all coaches that match current filters (except the filter being counted)
      const matchingCoaches = this.coaches.filter((coach) => {
        if (currentFilters.query && !matchesQuery(coach, currentFilters.query)) return false;
        if (currentFilters.priceMin && coach.priceRange.max < currentFilters.priceMin)
          return false;
        if (currentFilters.priceMax && coach.priceRange.min > currentFilters.priceMax)
          return false;
        if (currentFilters.rating && coach.rating.average < currentFilters.rating) return false;
        return true;
      });

      // Collect unique values with counts
      const focusCounts = new Map<string, number>();
      const languageCounts = new Map<string, number>();
      const formatCounts = new Map<string, number>();
      let minPrice = Infinity;
      let maxPrice = 0;
      const ratingCounts = new Map<number, number>();

      matchingCoaches.forEach((coach) => {
        // Focuses
        coach.footballFocuses.forEach((focus) => {
          focusCounts.set(focus, (focusCounts.get(focus) ?? 0) + 1);
        });

        // Languages
        coach.languages?.forEach((lang) => {
          languageCounts.set(lang.name, (languageCounts.get(lang.name) ?? 0) + 1);
        });

        // Formats
        coach.sessionFormats.forEach((format) => {
          formatCounts.set(format, (formatCounts.get(format) ?? 0) + 1);
        });

        // Price range
        minPrice = Math.min(minPrice, coach.priceRange.min);
        maxPrice = Math.max(maxPrice, coach.priceRange.max);

        // Rating distribution
        const ratingBucket = Math.floor(coach.rating.average);
        ratingCounts.set(ratingBucket, (ratingCounts.get(ratingBucket) ?? 0) + 1);
      });

      // Convert to FilterOption arrays
      const focuses: FilterOption[] = Array.from(focusCounts.entries())
        .map(([value, count]) => ({
          value,
          label: value,
          count,
          selected: currentFilters.focuses?.includes(value as FootballObjective),
        }))
        .sort((a, b) => b.count - a.count);

      const languages: FilterOption[] = Array.from(languageCounts.entries())
        .map(([value, count]) => ({
          value,
          label: value,
          count,
          selected: currentFilters.languages?.includes(value),
        }))
        .sort((a, b) => b.count - a.count);

      const formats: FilterOption[] = Array.from(formatCounts.entries())
        .map(([value, count]) => ({
          value,
          label: value,
          count,
          selected: currentFilters.formats?.includes(value as TrainingFormat),
        }))
        .sort((a, b) => b.count - a.count);

      const genders: FilterOption[] = [
        { value: 'Any', label: 'Any', count: matchingCoaches.length },
        { value: 'Male', label: 'Male', count: Math.floor(matchingCoaches.length * 0.6) },
        { value: 'Female', label: 'Female', count: Math.floor(matchingCoaches.length * 0.4) },
      ];

      const verificationLevels: FilterOption[] = [
        {
          value: 'VERIFIED',
          label: 'Verified',
          count: matchingCoaches.filter((c) => c.badges?.some((b) => b.label === 'Verified'))
            .length,
        },
        {
          value: 'PREMIUM',
          label: 'Premium',
          count: matchingCoaches.filter((c) => c.badges?.some((b) => b.label === 'Premium Coach'))
            .length,
        },
      ];

      const ratingDistribution = Array.from(ratingCounts.entries())
        .map(([rating, count]) => ({ rating, count }))
        .sort((a, b) => b.rating - a.rating);

      return ok({
        sports: [{ value: 'Football', label: 'Football', count: matchingCoaches.length }],
        focuses,
        languages,
        genders,
        verificationLevels,
        formats,
        priceRange: {
          min: minPrice === Infinity ? 0 : minPrice,
          max: maxPrice === 0 ? 100 : maxPrice,
        },
        ratingDistribution,
        totalCount: matchingCoaches.length,
      });
    } catch (error) {
      logger.error('Failed to get filter options', { currentFilters, error });
      return err(storageError('Failed to load filter options'));
    }
  }

  /**
   * Get suggested coaches for a user
   */
  async getSuggestedCoaches(userId: string): Promise<Result<SuggestedCoach[], ServiceError>> {
    try {
      await this.ensureDataset();
      // For demo, return a mix of suggestions
      const suggestions: SuggestedCoach[] = [];

      // Top rated coaches
      const topRated = [...this.coaches]
        .sort((a, b) => b.rating.average - a.rating.average)
        .slice(0, 2);

      topRated.forEach((coach) => {
        suggestions.push({
          coach,
          reason: 'highly_rated',
          reasonText: `Highly rated with ${coach.rating.average.toFixed(1)} stars`,
          confidence: 0.9,
        });
      });

      // Nearby coaches
      const nearby = [...this.coaches]
        .sort((a, b) => a.distanceMiles - b.distanceMiles)
        .slice(0, 2);

      nearby.forEach((coach) => {
        if (!suggestions.find((s) => s.coach.id === coach.id)) {
          suggestions.push({
            coach,
            reason: 'nearby',
            reasonText: `Only ${coach.distanceMiles.toFixed(1)} miles away`,
            confidence: 0.85,
          });
        }
      });

      // Popular coaches (by review count)
      const popular = [...this.coaches]
        .sort((a, b) => b.rating.reviewCount - a.rating.reviewCount)
        .slice(0, 2);

      popular.forEach((coach) => {
        if (!suggestions.find((s) => s.coach.id === coach.id)) {
          suggestions.push({
            coach,
            reason: 'popular',
            reasonText: `${coach.rating.reviewCount} reviews`,
            confidence: 0.8,
          });
        }
      });

      // New coaches (by join date)
      const newCoaches = [...this.coaches]
        .sort((a, b) => new Date(b.joinedDate).getTime() - new Date(a.joinedDate).getTime())
        .slice(0, 1);

      newCoaches.forEach((coach) => {
        if (!suggestions.find((s) => s.coach.id === coach.id)) {
          suggestions.push({
            coach,
            reason: 'new',
            reasonText: 'Recently joined',
            confidence: 0.7,
          });
        }
      });

      return ok(suggestions.slice(0, 6));
    } catch (error) {
      logger.error('Failed to get suggested coaches', { userId, error });
      return err(storageError('Failed to load suggested coaches'));
    }
  }

  /**
   * Save a recent search query
   */
  private async saveRecentSearch(query: string): Promise<void> {
    const recent = await apiClient.get<string[]>(STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, []);
    const updated = [query, ...recent.filter((q) => q !== query)].slice(0, MAX_RECENT_SEARCHES);
    await apiClient.set(STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, updated);
  }

  /**
   * Get recent search queries
   */
  async getRecentSearches(): Promise<Result<string[], ServiceError>> {
    try {
      return ok(await apiClient.get<string[]>(STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, []));
    } catch (error) {
      logger.error('Failed to get recent searches', error);
      return err(storageError('Failed to load recent searches'));
    }
  }

  /**
   * Clear recent searches
   */
  async clearRecentSearches(): Promise<Result<void, ServiceError>> {
    try {
      await apiClient.set(STORAGE_KEYS.DISCOVER_RECENT_SEARCHES, []);
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to clear recent searches', error);
      return err(storageError('Failed to clear recent searches'));
    }
  }

  /**
   * Get a specific coach by ID
   */
  async getCoachById(coachId: string): Promise<Result<CoachProfile | null, ServiceError>> {
    try {
      await this.ensureDataset();
      return ok(this.coaches.find((c) => c.id === coachId) ?? null);
    } catch (error) {
      logger.error('Failed to get coach by id', { coachId, error });
      return err(storageError('Failed to load coach'));
    }
  }

  /**
   * Get all coaches (for map view)
   */
  async getAllCoaches(): Promise<Result<CoachProfile[], ServiceError>> {
    try {
      await this.ensureDataset();
      return ok(this.coaches);
    } catch (error) {
      logger.error('Failed to get all coaches', error);
      return err(storageError('Failed to load coaches'));
    }
  }

  /**
   * Count coaches matching filters (for filter count badges)
   */
  async countCoaches(filters: CoachSearchFilters): Promise<Result<number, ServiceError>> {
    const responseResult = await this.searchCoaches(filters, 1, 1);
    if (!responseResult.success) {
      return responseResult;
    }
    return ok(responseResult.data.totalCount);
  }

  /**
   * Check if any filters are active
   */
  hasActiveFilters(filters: CoachSearchFilters): boolean {
    return !!(
      filters.query ||
      filters.priceMin !== undefined ||
      filters.priceMax !== undefined ||
      filters.rating !== undefined ||
      filters.distance !== undefined ||
      (filters.focuses && filters.focuses.length > 0) ||
      (filters.formats && filters.formats.length > 0) ||
      (filters.languages && filters.languages.length > 0) ||
      filters.gender ||
      filters.verified
    );
  }

  /**
   * Get count of active filters
   */
  getActiveFilterCount(filters: CoachSearchFilters): number {
    let count = 0;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) count++;
    if (filters.rating !== undefined) count++;
    if (filters.distance !== undefined) count++;
    if (filters.focuses && filters.focuses.length > 0) count++;
    if (filters.formats && filters.formats.length > 0) count++;
    if (filters.languages && filters.languages.length > 0) count++;
    if (filters.gender) count++;
    if (filters.verified) count++;
    return count;
  }

  /**
   * Reset to mock data (for testing)
   */
  async resetToMockData(): Promise<Result<void, ServiceError>> {
    try {
      this.coaches = [...MOCK_DISCOVERY_COACHES];
      this.forceMockData = true;
      this.lastHydratedAt = 0;
      const clearResult = await this.clearRecentSearches();
      if (!clearResult.success) {
        return clearResult;
      }
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to reset discover mock data', error);
      return err(storageError('Failed to reset discover data'));
    }
  }
}

export const discoverService = new DiscoverService();
