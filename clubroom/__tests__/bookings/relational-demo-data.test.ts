import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import type { Booking, Session, User } from '@/constants/app-types';
import {
  CLUB_LIONS_ID,
  RELATIONAL_DEMO_SEED_VERSION,
  type AppReviewRecord,
  type ChildProfileSeed,
  type CoachBookingSeed,
  type CoachDirectoryEntry,
  type ClubMemberSeed,
  type PublicCoachReview,
  type RateCoachStoredReview,
} from '@/constants/relational-demo-seeds';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type {
  ChatMessage,
  ClubSquad,
  FamilyCalendarEvent,
  FamilyMember,
  RosterEntry,
  SessionInvite,
  SessionOffering,
  SquadMember,
} from '@/constants/types';
import { apiClient } from '@/services/api-client';
import { ensureRelationalDemoSeeded } from '@/services/relational-demo-seed-service';

const CLUB_MEMBERS_KEY = `${STORAGE_KEYS.CLUB_MEMBERS}_${CLUB_LIONS_ID}`;
const RATE_COACH_REVIEWS_KEY = 'coach_reviews';
const COACH_PUBLIC_REVIEWS_KEY = 'clubroom.coach_reviews';
const COACH_DIRECTORY_KEY = 'clubroom.coaches';
const COACH_BOOKINGS_KEY = 'coach_bookings';

const RELATIONAL_KEYS = [
  STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION,
  STORAGE_KEYS.USERS,
  STORAGE_KEYS.BOOKINGS,
  STORAGE_KEYS.SESSION_OFFERINGS,
  STORAGE_KEYS.SESSION_INVITES,
  STORAGE_KEYS.COACH_SESSIONS,
  STORAGE_KEYS.ROSTER,
  STORAGE_KEYS.FAVOURITES,
  STORAGE_KEYS.MESSAGES,
  STORAGE_KEYS.REVIEWS,
  STORAGE_KEYS.CLUB_SQUADS,
  STORAGE_KEYS.SQUAD_MEMBERS,
  CLUB_MEMBERS_KEY,
  STORAGE_KEYS.CHILDREN_PROFILES,
  STORAGE_KEYS.FAMILY_MEMBERS,
  STORAGE_KEYS.FAMILY_BOOKINGS,
  RATE_COACH_REVIEWS_KEY,
  COACH_PUBLIC_REVIEWS_KEY,
  COACH_DIRECTORY_KEY,
  COACH_BOOKINGS_KEY,
] as const;

interface SeedSnapshot {
  version: string;
  users: User[];
  bookings: Booking[];
  offerings: SessionOffering[];
  invites: SessionInvite[];
  coachSessions: Session[];
  roster: RosterEntry[];
  messagesByThread: Record<string, ChatMessage[]>;
  reviews: AppReviewRecord[];
  rateCoachReviews: RateCoachStoredReview[];
  coachPublicReviews: PublicCoachReview[];
  coaches: CoachDirectoryEntry[];
  squads: ClubSquad[];
  squadMembers: SquadMember[];
  clubMembers: ClubMemberSeed[];
  childrenProfiles: ChildProfileSeed[];
  familyMembers: FamilyMember[];
  familyBookings: FamilyCalendarEvent[];
  coachBookings: CoachBookingSeed[];
}

function totalMessageCount(messagesByThread: Record<string, ChatMessage[]>): number {
  return Object.values(messagesByThread).reduce((sum, messages) => sum + messages.length, 0);
}

function assertUniqueIds<T extends { id: string }>(items: T[], label: string, pass: number): void {
  const ids = items.map((item) => item.id);
  const uniqueCount = new Set(ids).size;
  assert.equal(uniqueCount, ids.length, `pass ${pass}: duplicate IDs found in ${label}`);
}

async function readSnapshot(): Promise<SeedSnapshot> {
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
    rateCoachReviews,
    coachPublicReviews,
    coaches,
    squads,
    squadMembers,
    clubMembers,
    childrenProfiles,
    familyMembers,
    familyBookings,
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

  return {
    version,
    users,
    bookings,
    offerings,
    invites,
    coachSessions,
    roster,
    messagesByThread,
    reviews,
    rateCoachReviews,
    coachPublicReviews,
    coaches,
    squads,
    squadMembers,
    clubMembers,
    childrenProfiles,
    familyMembers,
    familyBookings,
    coachBookings,
  };
}

describe('relational demo data seeding', () => {
  beforeEach(async () => {
    await Promise.all(RELATIONAL_KEYS.map((key) => apiClient.remove(key)));
  });

  it('maintains linked integrity across 20 seed passes', async () => {
    let baselineCounts: Record<string, number> | null = null;

    for (let pass = 1; pass <= 20; pass++) {
      await ensureRelationalDemoSeeded({ force: true });
      const snapshot = await readSnapshot();

      assert.equal(
        snapshot.version,
        RELATIONAL_DEMO_SEED_VERSION,
        `pass ${pass}: incorrect seed version marker`,
      );
      assert.ok(snapshot.users.length >= 10, `pass ${pass}: expected seeded users`);
      assert.ok(snapshot.bookings.length >= 10, `pass ${pass}: expected seeded bookings`);
      assert.ok(snapshot.offerings.length >= 3, `pass ${pass}: expected seeded offerings`);
      assert.ok(snapshot.invites.length >= 4, `pass ${pass}: expected seeded invites`);
      assert.ok(snapshot.coachSessions.length >= 6, `pass ${pass}: expected seeded sessions`);
      assert.ok(snapshot.roster.length >= 4, `pass ${pass}: expected seeded roster entries`);
      assert.ok(
        totalMessageCount(snapshot.messagesByThread) >= 4,
        `pass ${pass}: expected seeded messages`,
      );
      assert.ok(snapshot.reviews.length >= 2, `pass ${pass}: expected seeded app reviews`);
      assert.ok(
        snapshot.rateCoachReviews.length >= 1,
        `pass ${pass}: expected seeded rate-coach reviews`,
      );
      assert.ok(snapshot.coaches.length >= 3, `pass ${pass}: expected seeded coaches`);
      assert.ok(snapshot.clubMembers.length >= 4, `pass ${pass}: expected seeded club members`);
      assert.ok(snapshot.coachBookings.length >= 3, `pass ${pass}: expected seeded coach bookings`);

      assertUniqueIds(snapshot.users, 'users', pass);
      assertUniqueIds(snapshot.bookings, 'bookings', pass);
      assertUniqueIds(snapshot.offerings, 'offerings', pass);
      assertUniqueIds(snapshot.invites, 'invites', pass);
      assertUniqueIds(snapshot.coachSessions, 'coach sessions', pass);
      assertUniqueIds(snapshot.reviews, 'reviews', pass);
      assertUniqueIds(snapshot.rateCoachReviews, 'coach_reviews', pass);
      assertUniqueIds(snapshot.coachPublicReviews, 'clubroom.coach_reviews', pass);
      assertUniqueIds(snapshot.coaches, 'coach directory', pass);
      assertUniqueIds(snapshot.squads, 'squads', pass);
      assertUniqueIds(snapshot.squadMembers, 'squad members', pass);
      assertUniqueIds(snapshot.childrenProfiles, 'children profiles', pass);
      assertUniqueIds(snapshot.familyMembers, 'family members', pass);
      assertUniqueIds(snapshot.familyBookings, 'family bookings', pass);
      assertUniqueIds(snapshot.coachBookings, 'coach bookings', pass);

      const userIds = new Set(snapshot.users.map((user) => user.id));
      const coachIds = new Set(snapshot.coaches.map((coach) => coach.id));
      const bookingById = new Map(snapshot.bookings.map((booking) => [booking.id, booking]));
      const offeringById = new Map(snapshot.offerings.map((offering) => [offering.id, offering]));
      const inviteById = new Map(snapshot.invites.map((invite) => [invite.id, invite]));
      const squadIds = new Set(snapshot.squads.map((squad) => squad.id));
      const childrenProfileIds = new Set(snapshot.childrenProfiles.map((child) => child.id));
      const familyMemberIds = new Set(snapshot.familyMembers.map((member) => member.id));

      for (const booking of snapshot.bookings) {
        assert.ok(userIds.has(booking.coachId), `pass ${pass}: booking ${booking.id} missing coach`);
        if (booking.athleteId) {
          assert.ok(
            userIds.has(booking.athleteId),
            `pass ${pass}: booking ${booking.id} missing athlete`,
          );
        }
        for (const athleteId of booking.athleteIds ?? []) {
          assert.ok(
            userIds.has(athleteId),
            `pass ${pass}: booking ${booking.id} athlete ${athleteId} missing`,
          );
        }
        if (booking.bookedById) {
          assert.ok(
            userIds.has(booking.bookedById),
            `pass ${pass}: booking ${booking.id} bookedBy missing`,
          );
        }
        if (booking.sessionInviteId) {
          assert.ok(
            inviteById.has(booking.sessionInviteId),
            `pass ${pass}: booking ${booking.id} invite link missing`,
          );
        }
      }

      for (const invite of snapshot.invites) {
        assert.ok(userIds.has(invite.coachId), `pass ${pass}: invite ${invite.id} missing coach`);
        assert.ok(
          coachIds.has(invite.coachId),
          `pass ${pass}: invite ${invite.id} coach not in coach directory`,
        );
        assert.ok(userIds.has(invite.parentId), `pass ${pass}: invite ${invite.id} missing parent`);
        for (const athleteId of invite.athleteIds) {
          assert.ok(
            userIds.has(athleteId),
            `pass ${pass}: invite ${invite.id} athlete ${athleteId} missing`,
          );
        }
        if (invite.bookingId) {
          assert.ok(
            bookingById.has(invite.bookingId),
            `pass ${pass}: invite ${invite.id} missing linked booking`,
          );
        }
        if (invite.existingSessionId) {
          assert.ok(
            offeringById.has(invite.existingSessionId),
            `pass ${pass}: invite ${invite.id} missing linked session offering`,
          );
        }
      }

      for (const offering of snapshot.offerings) {
        assert.ok(
          userIds.has(offering.coachId),
          `pass ${pass}: offering ${offering.id} missing coach`,
        );
        assert.ok(
          coachIds.has(offering.coachId),
          `pass ${pass}: offering ${offering.id} coach not in directory`,
        );
        for (const registration of offering.registrations) {
          assert.ok(
            userIds.has(registration.userId),
            `pass ${pass}: offering ${offering.id} registration has missing user`,
          );
        }
        for (const athleteId of offering.invitedAthleteIds ?? []) {
          assert.ok(
            userIds.has(athleteId),
            `pass ${pass}: offering ${offering.id} invited athlete missing`,
          );
        }
      }

      const seenMessageIds = new Set<string>();
      for (const [threadId, messages] of Object.entries(snapshot.messagesByThread)) {
        for (const message of messages) {
          assert.equal(
            message.threadId,
            threadId,
            `pass ${pass}: message ${message.id} has mismatched thread id`,
          );
          assert.ok(
            !seenMessageIds.has(message.id),
            `pass ${pass}: duplicate message id ${message.id} across threads`,
          );
          seenMessageIds.add(message.id);
        }
      }

      for (const session of snapshot.coachSessions) {
        assert.ok(userIds.has(session.coachId), `pass ${pass}: session ${session.id} missing coach`);
        assert.ok(
          userIds.has(session.athleteId),
          `pass ${pass}: session ${session.id} missing athlete`,
        );
        assert.ok(
          bookingById.has(session.bookingId),
          `pass ${pass}: session ${session.id} missing linked booking`,
        );
      }

      for (const review of snapshot.reviews) {
        assert.ok(coachIds.has(review.coachId), `pass ${pass}: review ${review.id} missing coach`);
        if (review.parentId) {
          assert.ok(userIds.has(review.parentId), `pass ${pass}: review ${review.id} missing parent`);
        }
        if (review.athleteId) {
          assert.ok(
            userIds.has(review.athleteId),
            `pass ${pass}: review ${review.id} missing athlete`,
          );
        }
        if (review.bookingId) {
          assert.ok(
            bookingById.has(review.bookingId),
            `pass ${pass}: review ${review.id} missing linked booking`,
          );
        }
      }

      for (const review of snapshot.rateCoachReviews) {
        assert.ok(coachIds.has(review.coachId), `pass ${pass}: coach review ${review.id} missing coach`);
        if (review.userId) {
          assert.ok(userIds.has(review.userId), `pass ${pass}: coach review ${review.id} missing user`);
        }
      }

      for (const review of snapshot.coachPublicReviews) {
        assert.ok(coachIds.has(review.coachId), `pass ${pass}: public review ${review.id} missing coach`);
        if (review.reviewerId) {
          assert.ok(
            userIds.has(review.reviewerId),
            `pass ${pass}: public review ${review.id} missing reviewer`,
          );
        }
      }

      for (const entry of snapshot.roster) {
        assert.ok(userIds.has(entry.coachId), `pass ${pass}: roster ${entry.id} missing coach`);
        assert.ok(userIds.has(entry.athleteId), `pass ${pass}: roster ${entry.id} missing athlete`);
        assert.ok(userIds.has(entry.parentId), `pass ${pass}: roster ${entry.id} missing parent`);
      }

      const seenClubMemberIds = new Set<string>();
      for (const member of snapshot.clubMembers) {
        assert.ok(userIds.has(member.userId), `pass ${pass}: club member ${member.userId} missing user`);
        assert.ok(
          !seenClubMemberIds.has(member.userId),
          `pass ${pass}: duplicate club member ${member.userId}`,
        );
        seenClubMemberIds.add(member.userId);
      }

      for (const member of snapshot.squadMembers) {
        assert.ok(
          squadIds.has(member.squadId),
          `pass ${pass}: squad member ${member.id} missing squad`,
        );
        assert.ok(
          userIds.has(member.athleteId),
          `pass ${pass}: squad member ${member.id} missing athlete`,
        );
        assert.ok(
          userIds.has(member.parentId),
          `pass ${pass}: squad member ${member.id} missing parent`,
        );
      }

      for (const child of snapshot.childrenProfiles) {
        assert.ok(userIds.has(child.parentId), `pass ${pass}: child ${child.id} missing parent`);
      }

      for (const member of snapshot.familyMembers) {
        assert.ok(
          childrenProfileIds.has(member.id),
          `pass ${pass}: family member ${member.id} not found in children profiles`,
        );
      }

      for (const booking of snapshot.familyBookings) {
        assert.ok(
          familyMemberIds.has(booking.childId),
          `pass ${pass}: family booking ${booking.id} has unknown child`,
        );
      }

      for (const booking of snapshot.coachBookings) {
        assert.ok(userIds.has(booking.coachId ?? ''), `pass ${pass}: coach booking ${booking.id} missing coach`);
        for (const athleteId of booking.athleteIds ?? []) {
          assert.ok(
            userIds.has(athleteId),
            `pass ${pass}: coach booking ${booking.id} has unknown athlete`,
          );
        }
      }

      const acceptedWithBooking = snapshot.invites.filter(
        (invite) => invite.status === 'ACCEPTED' && Boolean(invite.bookingId),
      );
      assert.ok(
        acceptedWithBooking.length > 0,
        `pass ${pass}: expected accepted invite converted to booking`,
      );

      const completedWithInvite = snapshot.bookings.some(
        (booking) => booking.status === 'COMPLETED' && Boolean(booking.sessionInviteId),
      );
      assert.ok(
        completedWithInvite,
        `pass ${pass}: expected completed booking linked to invite`,
      );

      const currentCounts = {
        users: snapshot.users.length,
        bookings: snapshot.bookings.length,
        offerings: snapshot.offerings.length,
        invites: snapshot.invites.length,
        coachSessions: snapshot.coachSessions.length,
        roster: snapshot.roster.length,
        messages: totalMessageCount(snapshot.messagesByThread),
        reviews: snapshot.reviews.length,
        rateCoachReviews: snapshot.rateCoachReviews.length,
        coachPublicReviews: snapshot.coachPublicReviews.length,
        coaches: snapshot.coaches.length,
        squads: snapshot.squads.length,
        squadMembers: snapshot.squadMembers.length,
        clubMembers: snapshot.clubMembers.length,
        childrenProfiles: snapshot.childrenProfiles.length,
        familyMembers: snapshot.familyMembers.length,
        familyBookings: snapshot.familyBookings.length,
        coachBookings: snapshot.coachBookings.length,
      };

      if (!baselineCounts) {
        baselineCounts = currentCounts;
      } else {
        assert.deepEqual(
          currentCounts,
          baselineCounts,
          `pass ${pass}: seeded counts changed across repeated runs`,
        );
      }
    }
  });
});

