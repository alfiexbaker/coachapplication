import type { Booking, Session, User } from '@/constants/app-types';
import type {
  AppReviewRecord,
  ChildProfileSeed,
  CoachBookingSeed,
  CoachDirectoryEntry,
  ClubMemberSeed,
  PublicCoachReview,
  RateCoachStoredReview,
} from '@/constants/relational-demo-seeds';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  ChatMessage,
  ClubSquad,
  FamilyCalendarEvent,
  FamilyMember,
  FavouriteCoach,
  RosterEntry,
  SessionInvite,
  SessionOffering,
  SquadMember,
} from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { createLogger } from '@/utils/logger';

const logger = createLogger('RelationalDemoSeedService');
const ENABLE_RELATIONAL_DEMO_SEED =
  process.env.EXPO_PUBLIC_ENABLE_RELATIONAL_DEMO_SEED === 'true' ||
  process.env.EXPO_PUBLIC_ENABLE_RELATIONAL_DEMO_SEED === '1' ||
  process.env.NODE_ENV === 'test';

const RELATIONAL_DEMO_FALLBACK_CLUB_ID = 'club_lions';
const CLUB_MEMBERS_KEY = `${STORAGE_KEYS.CLUB_MEMBERS}_${RELATIONAL_DEMO_FALLBACK_CLUB_ID}`;
const RATE_COACH_REVIEWS_KEY = 'coach_reviews';
const COACH_PUBLIC_REVIEWS_KEY = 'clubroom.coach_reviews';
const COACH_DIRECTORY_KEY = STORAGE_KEYS.COACH_DIRECTORY;
const COACH_BOOKINGS_KEY = 'coach_bookings';

interface SeedHealthSnapshot {
  version: string;
  users: number;
  bookings: number;
  offerings: number;
  invites: number;
  coachSessions: number;
  roster: number;
  messageCount: number;
  reviews: number;
  coachReviews: number;
  coaches: number;
  clubMembers: number;
  coachBookings: number;
}

export interface EnsureRelationalSeedOptions {
  force?: boolean;
}

let seedInFlight: Promise<void> | null = null;
type RelationalSeedModule = typeof import('@/constants/relational-demo-seeds');
let relationalSeedModulePromise: Promise<RelationalSeedModule> | null = null;

async function loadRelationalSeedModule(): Promise<RelationalSeedModule> {
  if (!relationalSeedModulePromise) {
    relationalSeedModulePromise = import('@/constants/relational-demo-seeds');
  }
  return relationalSeedModulePromise;
}

function mergeByKey<T>(existing: T[], seeded: T[], getKey: (item: T) => string): T[] {
  const seededKeys = new Set(seeded.map((item) => getKey(item)));
  const extras = existing.filter((item) => !seededKeys.has(getKey(item)));
  return [...seeded, ...extras];
}

function mergeById<T extends { id: string }>(existing: T[], seeded: T[]): T[] {
  return mergeByKey(existing, seeded, (item) => item.id);
}

function mergeMessagesByThread(
  existing: Record<string, ChatMessage[]>,
  seeded: Record<string, ChatMessage[]>,
): Record<string, ChatMessage[]> {
  const merged: Record<string, ChatMessage[]> = { ...existing };

  for (const [threadId, seededMessages] of Object.entries(seeded)) {
    const current = existing[threadId] ?? [];
    const combined = mergeById(current, seededMessages).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    merged[threadId] = combined;
  }

  return merged;
}

async function getSeedHealthSnapshot(): Promise<SeedHealthSnapshot> {
  const [
    version,
    users,
    bookings,
    offerings,
    invites,
    coachSessions,
    roster,
    messagesByThread,
    reviews,
    coachReviews,
    coaches,
    clubMembers,
    coachBookings,
  ] = await Promise.all([
    apiClient.get<string>(STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION, ''),
    apiClient.get<User[]>(STORAGE_KEYS.USERS, []),
    apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
    apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
    apiClient.get<SessionInvite[]>(STORAGE_KEYS.SESSION_INVITES, []),
    apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
    apiClient.get<RosterEntry[]>(STORAGE_KEYS.ROSTER, []),
    apiClient.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {}),
    apiClient.get<AppReviewRecord[]>(STORAGE_KEYS.REVIEWS, []),
    apiClient.get<RateCoachStoredReview[]>(RATE_COACH_REVIEWS_KEY, []),
    apiClient.get<CoachDirectoryEntry[]>(COACH_DIRECTORY_KEY, []),
    apiClient.get<ClubMemberSeed[]>(CLUB_MEMBERS_KEY, []),
    apiClient.get<CoachBookingSeed[]>(COACH_BOOKINGS_KEY, []),
  ]);

  const messageCount = Object.values(messagesByThread).reduce(
    (sum, messages) => sum + messages.length,
    0,
  );

  return {
    version,
    users: users.length,
    bookings: bookings.length,
    offerings: offerings.length,
    invites: invites.length,
    coachSessions: coachSessions.length,
    roster: roster.length,
    messageCount,
    reviews: reviews.length,
    coachReviews: coachReviews.length,
    coaches: coaches.length,
    clubMembers: clubMembers.length,
    coachBookings: coachBookings.length,
  };
}

function isHealthy(snapshot: SeedHealthSnapshot, expectedVersion: string): boolean {
  return (
    snapshot.version === expectedVersion &&
    snapshot.users >= 10 &&
    snapshot.bookings >= 10 &&
    snapshot.offerings >= 3 &&
    snapshot.invites >= 4 &&
    snapshot.coachSessions >= 6 &&
    snapshot.roster >= 4 &&
    snapshot.messageCount >= 4 &&
    snapshot.reviews >= 2 &&
    snapshot.coachReviews >= 1 &&
    snapshot.coaches >= 3 &&
    snapshot.clubMembers >= 4 &&
    snapshot.coachBookings >= 3
  );
}

async function seedRelationalDemoDataInternal(): Promise<void> {
  const seedModule = await loadRelationalSeedModule();
  const payload = seedModule.buildRelationalDemoSeedPayload();

  const [
    existingUsers,
    existingBookings,
    existingOfferings,
    existingInvites,
    existingCoachSessions,
    existingRoster,
    existingFavourites,
    existingMessagesByThread,
    existingReviews,
    existingRateCoachReviews,
    existingCoachPublicReviews,
    existingCoaches,
    existingSquads,
    existingSquadMembers,
    existingClubMembers,
    existingChildrenProfiles,
    existingFamilyMembers,
    existingFamilyBookings,
    existingCoachBookings,
  ] = await Promise.all([
    apiClient.get<User[]>(STORAGE_KEYS.USERS, []),
    apiClient.get<Booking[]>(STORAGE_KEYS.BOOKINGS, []),
    apiClient.get<SessionOffering[]>(STORAGE_KEYS.SESSION_OFFERINGS, []),
    apiClient.get<SessionInvite[]>(STORAGE_KEYS.SESSION_INVITES, []),
    apiClient.get<Session[]>(STORAGE_KEYS.COACH_SESSIONS, []),
    apiClient.get<RosterEntry[]>(STORAGE_KEYS.ROSTER, []),
    apiClient.get<FavouriteCoach[]>(STORAGE_KEYS.FAVOURITES, []),
    apiClient.get<Record<string, ChatMessage[]>>(STORAGE_KEYS.MESSAGES, {}),
    apiClient.get<AppReviewRecord[]>(STORAGE_KEYS.REVIEWS, []),
    apiClient.get<RateCoachStoredReview[]>(RATE_COACH_REVIEWS_KEY, []),
    apiClient.get<PublicCoachReview[]>(COACH_PUBLIC_REVIEWS_KEY, []),
    apiClient.get<CoachDirectoryEntry[]>(COACH_DIRECTORY_KEY, []),
    apiClient.get<ClubSquad[]>(STORAGE_KEYS.CLUB_SQUADS, []),
    apiClient.get<SquadMember[]>(STORAGE_KEYS.SQUAD_MEMBERS, []),
    apiClient.get<ClubMemberSeed[]>(CLUB_MEMBERS_KEY, []),
    apiClient.get<ChildProfileSeed[]>(STORAGE_KEYS.CHILDREN_PROFILES, []),
    apiClient.get<FamilyMember[]>(STORAGE_KEYS.FAMILY_MEMBERS, []),
    apiClient.get<FamilyCalendarEvent[]>(STORAGE_KEYS.FAMILY_BOOKINGS, []),
    apiClient.get<CoachBookingSeed[]>(COACH_BOOKINGS_KEY, []),
  ]);

  const users = mergeById(existingUsers, payload.users);
  const bookings = mergeById(existingBookings, payload.bookings);
  const offerings = mergeById(existingOfferings, payload.offerings);
  const invites = mergeById(existingInvites, payload.invites);
  const coachSessions = mergeById(existingCoachSessions, payload.coachSessions);
  const roster = mergeById(existingRoster, payload.roster);
  const favourites = mergeById(existingFavourites, payload.favourites);
  const messagesByThread = mergeMessagesByThread(existingMessagesByThread, payload.messagesByThread);
  const reviews = mergeById(existingReviews, payload.reviews);
  const rateCoachReviews = mergeById(existingRateCoachReviews, payload.rateCoachReviews);
  const coachPublicReviews = mergeById(existingCoachPublicReviews, payload.coachPublicReviews);
  const coaches = mergeById(existingCoaches, payload.coaches);
  const squads = mergeById(existingSquads, payload.squads);
  const squadMembers = mergeById(existingSquadMembers, payload.squadMembers);
  const clubMembers = mergeByKey(existingClubMembers, payload.clubMembers, (item) => item.userId);
  const childrenProfiles = mergeById(existingChildrenProfiles, payload.childrenProfiles);
  const familyMembers = mergeById(existingFamilyMembers, payload.familyMembers);
  const familyBookings = mergeById(existingFamilyBookings, payload.familyBookings);
  const coachBookings = mergeById(existingCoachBookings, payload.coachBookings);

  await Promise.all([
    apiClient.set(STORAGE_KEYS.USERS, users),
    apiClient.set(STORAGE_KEYS.BOOKINGS, bookings),
    apiClient.set(STORAGE_KEYS.SESSION_OFFERINGS, offerings),
    apiClient.set(STORAGE_KEYS.SESSION_INVITES, invites),
    apiClient.set(STORAGE_KEYS.COACH_SESSIONS, coachSessions),
    apiClient.set(STORAGE_KEYS.ROSTER, roster),
    apiClient.set(STORAGE_KEYS.FAVOURITES, favourites),
    apiClient.set(STORAGE_KEYS.MESSAGES, messagesByThread),
    apiClient.set(STORAGE_KEYS.REVIEWS, reviews),
    apiClient.set(RATE_COACH_REVIEWS_KEY, rateCoachReviews),
    apiClient.set(COACH_PUBLIC_REVIEWS_KEY, coachPublicReviews),
    apiClient.set(COACH_DIRECTORY_KEY, coaches),
    apiClient.set(STORAGE_KEYS.CLUB_SQUADS, squads),
    apiClient.set(STORAGE_KEYS.SQUAD_MEMBERS, squadMembers),
    apiClient.set(CLUB_MEMBERS_KEY, clubMembers),
    apiClient.set(STORAGE_KEYS.CHILDREN_PROFILES, childrenProfiles),
    apiClient.set(STORAGE_KEYS.FAMILY_MEMBERS, familyMembers),
    apiClient.set(STORAGE_KEYS.FAMILY_BOOKINGS, familyBookings),
    apiClient.set(COACH_BOOKINGS_KEY, coachBookings),
    apiClient.set(
      STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION,
      seedModule.RELATIONAL_DEMO_SEED_VERSION,
    ),
  ]);
}

export async function ensureRelationalDemoSeeded(
  options: EnsureRelationalSeedOptions = {},
): Promise<void> {
  if (!options.force && !ENABLE_RELATIONAL_DEMO_SEED) {
    return;
  }

  if (seedInFlight) {
    return seedInFlight;
  }

  seedInFlight = (async () => {
    try {
      const seedModule = await loadRelationalSeedModule();
      if (!options.force) {
        const health = await getSeedHealthSnapshot();
        if (isHealthy(health, seedModule.RELATIONAL_DEMO_SEED_VERSION)) {
          return;
        }
      }

      await seedRelationalDemoDataInternal();

      const finalHealth = await getSeedHealthSnapshot();
      if (!isHealthy(finalHealth, seedModule.RELATIONAL_DEMO_SEED_VERSION)) {
        logger.warn('relational_demo_seed_health_check_incomplete', finalHealth);
      } else {
        logger.info('relational_demo_seeded', finalHealth);
      }
    } catch (error) {
      logger.error('failed_to_seed_relational_demo_data', error);
      throw error;
    } finally {
      seedInFlight = null;
    }
  })();

  return seedInFlight;
}
