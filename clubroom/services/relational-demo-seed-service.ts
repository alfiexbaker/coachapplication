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
  Injury,
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
  injuries: number;
  concerns: number;
  reports: number;
  problemReports: number;
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

type ConcernSeedRecord = {
  id: string;
  coachId: string;
  athleteId: string;
  parentId?: string;
  athleteName: string;
  type: 'BEHAVIORAL' | 'SAFEGUARDING' | 'MEDICAL' | 'ATTENDANCE' | 'PARENT_COMMUNICATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  description: string;
  actionTaken?: string;
  followUpDate?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ESCALATED';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolution?: string;
  escalatedAt?: string;
  escalationReason?: string;
  parentNotifiedAt?: string;
};

type UserReportSeedRecord = {
  id: string;
  reportedUserId: string;
  reportedByUserId: string;
  type: 'inappropriate' | 'safety_concern' | 'fake_profile' | 'spam' | 'other';
  description?: string;
  context: 'profile' | 'message' | 'review';
  createdAt: string;
  status: 'pending' | 'reviewed' | 'resolved';
};

type ProblemReportSeedRecord = {
  id: string;
  bookingId: string;
  category: string;
  description: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
};

interface TrustOpsSeedPayload {
  injuries: Injury[];
  concerns: ConcernSeedRecord[];
  reports: UserReportSeedRecord[];
  problemReports: ProblemReportSeedRecord[];
}

function isoAt(dayOffset: number, hour: number, minute = 0): string {
  const d = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function chooseBookingId(bookings: Booking[], preferredId: string, fallbackIndex: number): string {
  return bookings.find((booking) => booking.id === preferredId)?.id
    ?? bookings[fallbackIndex]?.id
    ?? 'book1';
}

function buildTrustOpsSeedPayload(bookings: Booking[]): TrustOpsSeedPayload {
  const safetyBookingId = chooseBookingId(bookings, 'book9_group_user1', 0);
  const qualityBookingId = chooseBookingId(bookings, 'book2', 1);
  const resolvedAt = isoAt(-2, 9, 20);

  return {
    injuries: [
      {
        id: 'injury_seed_user1_ankle',
        userId: 'user1',
        bodyPart: 'LEFT_ANKLE',
        description: 'Rolled ankle during finishing drill. Mild swelling with pain on sharp turns.',
        severity: 'MODERATE',
        occurredAt: isoAt(-6, 18, 15),
        expectedRecovery: isoAt(4, 12),
        status: 'RECOVERING',
        notes: [
          {
            id: 'note_seed_user1_1',
            injuryId: 'injury_seed_user1_ankle',
            note: 'Started mobility + band work. Swelling is down.',
            createdAt: isoAt(-5, 8, 45),
            createdBy: 'user1',
            recoveryPercent: 45,
          },
        ],
        recoveryPercent: 45,
        sharedWithCoach: true,
        createdAt: isoAt(-6, 18, 45),
        updatedAt: isoAt(-5, 8, 45),
      },
      {
        id: 'injury_seed_user2_knee',
        userId: 'user2',
        bodyPart: 'RIGHT_KNEE',
        description: 'Knock to right knee in contact drill. Tender but stable.',
        severity: 'MINOR',
        occurredAt: isoAt(-3, 17, 30),
        expectedRecovery: isoAt(3, 12),
        status: 'ACTIVE',
        notes: [],
        recoveryPercent: 10,
        sharedWithCoach: true,
        createdAt: isoAt(-3, 17, 50),
        updatedAt: isoAt(-3, 17, 50),
      },
      {
        id: 'injury_seed_athlete4_thigh',
        userId: 'athlete_4',
        bodyPart: 'LEFT_THIGH',
        description: 'Light thigh strain from sprint repetition.',
        severity: 'MINOR',
        occurredAt: isoAt(-12, 19),
        expectedRecovery: isoAt(-5, 12),
        status: 'HEALED',
        notes: [
          {
            id: 'note_seed_athlete4_1',
            injuryId: 'injury_seed_athlete4_thigh',
            note: 'Completed recovery programme and returned to full training.',
            createdAt: isoAt(-5, 10),
            createdBy: 'athlete_4',
            recoveryPercent: 100,
          },
        ],
        recoveryPercent: 100,
        sharedWithCoach: true,
        createdAt: isoAt(-12, 19, 20),
        updatedAt: isoAt(-5, 10),
        healedAt: isoAt(-5, 10),
      },
    ],
    concerns: [
      {
        id: 'concern_seed_user1_safeguarding',
        coachId: 'coach1',
        athleteId: 'user1',
        parentId: 'user4',
        athleteName: 'Alfie Barton',
        type: 'SAFEGUARDING',
        severity: 'HIGH',
        title: 'Repeated aggressive contact in drill',
        description:
          'Athlete reported repeated aggressive contact from another player during small-sided game.',
        actionTaken: 'Session paused, separated players, informed safeguarding lead.',
        followUpDate: isoAt(1, 9),
        status: 'ESCALATED',
        createdAt: isoAt(-1, 19, 10),
        updatedAt: isoAt(-1, 19, 10),
        escalatedAt: isoAt(-1, 19, 10),
        escalationReason: 'Safeguarding concern marked High',
        parentNotifiedAt: isoAt(-1, 19, 20),
      },
      {
        id: 'concern_seed_user2_attendance',
        coachId: 'coach1',
        athleteId: 'user2',
        parentId: 'user4',
        athleteName: 'Maisie Barton',
        type: 'ATTENDANCE',
        severity: 'MEDIUM',
        title: 'Pattern of late arrivals',
        description:
          'Arrived 15+ minutes late to three of last four sessions which impacts warm-up and safety checks.',
        followUpDate: isoAt(2, 17),
        status: 'OPEN',
        createdAt: isoAt(-3, 18, 30),
        updatedAt: isoAt(-3, 18, 30),
      },
      {
        id: 'concern_seed_athlete4_medical',
        coachId: 'coach2',
        athleteId: 'athlete_4',
        parentId: 'parent_3',
        athleteName: 'Priya Kapoor',
        type: 'MEDICAL',
        severity: 'LOW',
        title: 'Inhaler reminder needed before high-intensity blocks',
        description: 'Athlete forgot inhaler check-in once this week. Added reminder before drills.',
        status: 'RESOLVED',
        createdAt: isoAt(-8, 16, 45),
        updatedAt: resolvedAt,
        resolvedAt,
        resolution: 'Parent confirmed new pre-session checklist and no recurrence.',
      },
    ],
    reports: [
      {
        id: 'report_seed_safety_1',
        reportedUserId: 'coach3',
        reportedByUserId: 'user4',
        type: 'safety_concern',
        description: 'Parent reported unsafe pitch conditions and no immediate coach response.',
        context: 'profile',
        createdAt: isoAt(-2, 20, 15),
        status: 'pending',
      },
      {
        id: 'report_seed_spam_1',
        reportedUserId: 'user6',
        reportedByUserId: 'user5',
        type: 'spam',
        description: 'Repeated off-topic promotional messages in direct chat.',
        context: 'message',
        createdAt: isoAt(-7, 14, 10),
        status: 'reviewed',
      },
    ],
    problemReports: [
      {
        id: 'problem_report_seed_safety',
        bookingId: safetyBookingId,
        category: 'safety',
        description:
          'Athlete slipped on unmarked wet area near sideline. Requesting venue safety follow-up.',
        status: 'pending',
        createdAt: isoAt(-1, 20),
      },
      {
        id: 'problem_report_seed_quality',
        bookingId: qualityBookingId,
        category: 'quality',
        description: 'Session ended early without clear explanation and missed planned cooldown.',
        status: 'reviewed',
        createdAt: isoAt(-4, 11, 30),
      },
    ],
  };
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
    injuries,
    concerns,
    reports,
    problemReports,
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
    apiClient.get<Injury[]>(STORAGE_KEYS.INJURIES, []),
    apiClient.get<ConcernSeedRecord[]>(STORAGE_KEYS.CONCERNS, []),
    apiClient.get<UserReportSeedRecord[]>(STORAGE_KEYS.REPORTS, []),
    apiClient.get<ProblemReportSeedRecord[]>(STORAGE_KEYS.PROBLEM_REPORTS, []),
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
    injuries: injuries.length,
    concerns: concerns.length,
    reports: reports.length,
    problemReports: problemReports.length,
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
    snapshot.coachBookings >= 3 &&
    snapshot.injuries >= 3 &&
    snapshot.concerns >= 2 &&
    snapshot.reports >= 1 &&
    snapshot.problemReports >= 1
  );
}

async function seedRelationalDemoDataInternal(): Promise<void> {
  const seedModule = await loadRelationalSeedModule();
  const payload = seedModule.buildRelationalDemoSeedPayload();
  const trustOpsPayload = buildTrustOpsSeedPayload(payload.bookings);

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
    existingInjuries,
    existingConcerns,
    existingReports,
    existingProblemReports,
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
    apiClient.get<Injury[]>(STORAGE_KEYS.INJURIES, []),
    apiClient.get<ConcernSeedRecord[]>(STORAGE_KEYS.CONCERNS, []),
    apiClient.get<UserReportSeedRecord[]>(STORAGE_KEYS.REPORTS, []),
    apiClient.get<ProblemReportSeedRecord[]>(STORAGE_KEYS.PROBLEM_REPORTS, []),
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
  const injuries = mergeById(existingInjuries, trustOpsPayload.injuries);
  const concerns = mergeById(existingConcerns, trustOpsPayload.concerns);
  const reports = mergeById(existingReports, trustOpsPayload.reports);
  const problemReports = mergeById(existingProblemReports, trustOpsPayload.problemReports);

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
    apiClient.set(STORAGE_KEYS.INJURIES, injuries),
    apiClient.set(STORAGE_KEYS.CONCERNS, concerns),
    apiClient.set(STORAGE_KEYS.REPORTS, reports),
    apiClient.set(STORAGE_KEYS.PROBLEM_REPORTS, problemReports),
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
