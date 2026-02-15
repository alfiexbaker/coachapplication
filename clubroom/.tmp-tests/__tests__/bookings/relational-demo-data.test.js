"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const relational_demo_seeds_1 = require("@/constants/relational-demo-seeds");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const relational_demo_seed_service_1 = require("@/services/relational-demo-seed-service");
const CLUB_MEMBERS_KEY = `${storage_keys_1.STORAGE_KEYS.CLUB_MEMBERS}_${relational_demo_seeds_1.CLUB_LIONS_ID}`;
const RATE_COACH_REVIEWS_KEY = 'coach_reviews';
const COACH_PUBLIC_REVIEWS_KEY = 'clubroom.coach_reviews';
const COACH_DIRECTORY_KEY = 'clubroom.coaches';
const COACH_BOOKINGS_KEY = 'coach_bookings';
const RELATIONAL_KEYS = [
    storage_keys_1.STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION,
    storage_keys_1.STORAGE_KEYS.USERS,
    storage_keys_1.STORAGE_KEYS.BOOKINGS,
    storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS,
    storage_keys_1.STORAGE_KEYS.SESSION_INVITES,
    storage_keys_1.STORAGE_KEYS.COACH_SESSIONS,
    storage_keys_1.STORAGE_KEYS.ROSTER,
    storage_keys_1.STORAGE_KEYS.FAVOURITES,
    storage_keys_1.STORAGE_KEYS.MESSAGES,
    storage_keys_1.STORAGE_KEYS.REVIEWS,
    storage_keys_1.STORAGE_KEYS.CLUB_SQUADS,
    storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS,
    CLUB_MEMBERS_KEY,
    storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES,
    storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS,
    storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS,
    RATE_COACH_REVIEWS_KEY,
    COACH_PUBLIC_REVIEWS_KEY,
    COACH_DIRECTORY_KEY,
    COACH_BOOKINGS_KEY,
];
function totalMessageCount(messagesByThread) {
    return Object.values(messagesByThread).reduce((sum, messages) => sum + messages.length, 0);
}
function assertUniqueIds(items, label, pass) {
    const ids = items.map((item) => item.id);
    const uniqueCount = new Set(ids).size;
    strict_1.default.equal(uniqueCount, ids.length, `pass ${pass}: duplicate IDs found in ${label}`);
}
async function readSnapshot() {
    const [version, users, bookings, offerings, invites, coachSessions, roster, messagesByThread, reviews, rateCoachReviews, coachPublicReviews, coaches, squads, squadMembers, clubMembers, childrenProfiles, familyMembers, familyBookings, coachBookings,] = await Promise.all([
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION, ''),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.USERS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_SESSIONS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ROSTER, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.MESSAGES, {}),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.REVIEWS, []),
        api_client_1.apiClient.get(RATE_COACH_REVIEWS_KEY, []),
        api_client_1.apiClient.get(COACH_PUBLIC_REVIEWS_KEY, []),
        api_client_1.apiClient.get(COACH_DIRECTORY_KEY, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS, []),
        api_client_1.apiClient.get(CLUB_MEMBERS_KEY, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS, []),
        api_client_1.apiClient.get(COACH_BOOKINGS_KEY, []),
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
(0, node_test_1.describe)('relational demo data seeding', () => {
    (0, node_test_1.beforeEach)(async () => {
        await Promise.all(RELATIONAL_KEYS.map((key) => api_client_1.apiClient.remove(key)));
    });
    (0, node_test_1.it)('maintains linked integrity across 20 seed passes', async () => {
        let baselineCounts = null;
        for (let pass = 1; pass <= 20; pass++) {
            await (0, relational_demo_seed_service_1.ensureRelationalDemoSeeded)({ force: true });
            const snapshot = await readSnapshot();
            strict_1.default.equal(snapshot.version, relational_demo_seeds_1.RELATIONAL_DEMO_SEED_VERSION, `pass ${pass}: incorrect seed version marker`);
            strict_1.default.ok(snapshot.users.length >= 10, `pass ${pass}: expected seeded users`);
            strict_1.default.ok(snapshot.bookings.length >= 10, `pass ${pass}: expected seeded bookings`);
            strict_1.default.ok(snapshot.offerings.length >= 3, `pass ${pass}: expected seeded offerings`);
            strict_1.default.ok(snapshot.invites.length >= 4, `pass ${pass}: expected seeded invites`);
            strict_1.default.ok(snapshot.coachSessions.length >= 6, `pass ${pass}: expected seeded sessions`);
            strict_1.default.ok(snapshot.roster.length >= 4, `pass ${pass}: expected seeded roster entries`);
            strict_1.default.ok(totalMessageCount(snapshot.messagesByThread) >= 4, `pass ${pass}: expected seeded messages`);
            strict_1.default.ok(snapshot.reviews.length >= 2, `pass ${pass}: expected seeded app reviews`);
            strict_1.default.ok(snapshot.rateCoachReviews.length >= 1, `pass ${pass}: expected seeded rate-coach reviews`);
            strict_1.default.ok(snapshot.coaches.length >= 3, `pass ${pass}: expected seeded coaches`);
            strict_1.default.ok(snapshot.clubMembers.length >= 4, `pass ${pass}: expected seeded club members`);
            strict_1.default.ok(snapshot.coachBookings.length >= 3, `pass ${pass}: expected seeded coach bookings`);
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
                strict_1.default.ok(userIds.has(booking.coachId), `pass ${pass}: booking ${booking.id} missing coach`);
                if (booking.athleteId) {
                    strict_1.default.ok(userIds.has(booking.athleteId), `pass ${pass}: booking ${booking.id} missing athlete`);
                }
                for (const athleteId of booking.athleteIds ?? []) {
                    strict_1.default.ok(userIds.has(athleteId), `pass ${pass}: booking ${booking.id} athlete ${athleteId} missing`);
                }
                if (booking.bookedById) {
                    strict_1.default.ok(userIds.has(booking.bookedById), `pass ${pass}: booking ${booking.id} bookedBy missing`);
                }
                if (booking.sessionInviteId) {
                    strict_1.default.ok(inviteById.has(booking.sessionInviteId), `pass ${pass}: booking ${booking.id} invite link missing`);
                }
            }
            for (const invite of snapshot.invites) {
                strict_1.default.ok(userIds.has(invite.coachId), `pass ${pass}: invite ${invite.id} missing coach`);
                strict_1.default.ok(coachIds.has(invite.coachId), `pass ${pass}: invite ${invite.id} coach not in coach directory`);
                strict_1.default.ok(userIds.has(invite.parentId), `pass ${pass}: invite ${invite.id} missing parent`);
                for (const athleteId of invite.athleteIds) {
                    strict_1.default.ok(userIds.has(athleteId), `pass ${pass}: invite ${invite.id} athlete ${athleteId} missing`);
                }
                if (invite.bookingId) {
                    strict_1.default.ok(bookingById.has(invite.bookingId), `pass ${pass}: invite ${invite.id} missing linked booking`);
                }
                if (invite.existingSessionId) {
                    strict_1.default.ok(offeringById.has(invite.existingSessionId), `pass ${pass}: invite ${invite.id} missing linked session offering`);
                }
            }
            for (const offering of snapshot.offerings) {
                strict_1.default.ok(userIds.has(offering.coachId), `pass ${pass}: offering ${offering.id} missing coach`);
                strict_1.default.ok(coachIds.has(offering.coachId), `pass ${pass}: offering ${offering.id} coach not in directory`);
                for (const registration of offering.registrations) {
                    strict_1.default.ok(userIds.has(registration.userId), `pass ${pass}: offering ${offering.id} registration has missing user`);
                }
                for (const athleteId of offering.invitedAthleteIds ?? []) {
                    strict_1.default.ok(userIds.has(athleteId), `pass ${pass}: offering ${offering.id} invited athlete missing`);
                }
            }
            const seenMessageIds = new Set();
            for (const [threadId, messages] of Object.entries(snapshot.messagesByThread)) {
                for (const message of messages) {
                    strict_1.default.equal(message.threadId, threadId, `pass ${pass}: message ${message.id} has mismatched thread id`);
                    strict_1.default.ok(!seenMessageIds.has(message.id), `pass ${pass}: duplicate message id ${message.id} across threads`);
                    seenMessageIds.add(message.id);
                }
            }
            for (const session of snapshot.coachSessions) {
                strict_1.default.ok(userIds.has(session.coachId), `pass ${pass}: session ${session.id} missing coach`);
                strict_1.default.ok(userIds.has(session.athleteId), `pass ${pass}: session ${session.id} missing athlete`);
                strict_1.default.ok(bookingById.has(session.bookingId), `pass ${pass}: session ${session.id} missing linked booking`);
            }
            for (const review of snapshot.reviews) {
                strict_1.default.ok(coachIds.has(review.coachId), `pass ${pass}: review ${review.id} missing coach`);
                if (review.parentId) {
                    strict_1.default.ok(userIds.has(review.parentId), `pass ${pass}: review ${review.id} missing parent`);
                }
                if (review.athleteId) {
                    strict_1.default.ok(userIds.has(review.athleteId), `pass ${pass}: review ${review.id} missing athlete`);
                }
                if (review.bookingId) {
                    strict_1.default.ok(bookingById.has(review.bookingId), `pass ${pass}: review ${review.id} missing linked booking`);
                }
            }
            for (const review of snapshot.rateCoachReviews) {
                strict_1.default.ok(coachIds.has(review.coachId), `pass ${pass}: coach review ${review.id} missing coach`);
                if (review.userId) {
                    strict_1.default.ok(userIds.has(review.userId), `pass ${pass}: coach review ${review.id} missing user`);
                }
            }
            for (const review of snapshot.coachPublicReviews) {
                strict_1.default.ok(coachIds.has(review.coachId), `pass ${pass}: public review ${review.id} missing coach`);
                if (review.reviewerId) {
                    strict_1.default.ok(userIds.has(review.reviewerId), `pass ${pass}: public review ${review.id} missing reviewer`);
                }
            }
            for (const entry of snapshot.roster) {
                strict_1.default.ok(userIds.has(entry.coachId), `pass ${pass}: roster ${entry.id} missing coach`);
                strict_1.default.ok(userIds.has(entry.athleteId), `pass ${pass}: roster ${entry.id} missing athlete`);
                strict_1.default.ok(userIds.has(entry.parentId), `pass ${pass}: roster ${entry.id} missing parent`);
            }
            const seenClubMemberIds = new Set();
            for (const member of snapshot.clubMembers) {
                strict_1.default.ok(userIds.has(member.userId), `pass ${pass}: club member ${member.userId} missing user`);
                strict_1.default.ok(!seenClubMemberIds.has(member.userId), `pass ${pass}: duplicate club member ${member.userId}`);
                seenClubMemberIds.add(member.userId);
            }
            for (const member of snapshot.squadMembers) {
                strict_1.default.ok(squadIds.has(member.squadId), `pass ${pass}: squad member ${member.id} missing squad`);
                strict_1.default.ok(userIds.has(member.athleteId), `pass ${pass}: squad member ${member.id} missing athlete`);
                strict_1.default.ok(userIds.has(member.parentId), `pass ${pass}: squad member ${member.id} missing parent`);
            }
            for (const child of snapshot.childrenProfiles) {
                strict_1.default.ok(userIds.has(child.parentId), `pass ${pass}: child ${child.id} missing parent`);
            }
            for (const member of snapshot.familyMembers) {
                strict_1.default.ok(childrenProfileIds.has(member.id), `pass ${pass}: family member ${member.id} not found in children profiles`);
            }
            for (const booking of snapshot.familyBookings) {
                strict_1.default.ok(familyMemberIds.has(booking.childId), `pass ${pass}: family booking ${booking.id} has unknown child`);
            }
            for (const booking of snapshot.coachBookings) {
                strict_1.default.ok(userIds.has(booking.coachId ?? ''), `pass ${pass}: coach booking ${booking.id} missing coach`);
                for (const athleteId of booking.athleteIds ?? []) {
                    strict_1.default.ok(userIds.has(athleteId), `pass ${pass}: coach booking ${booking.id} has unknown athlete`);
                }
            }
            const acceptedWithBooking = snapshot.invites.filter((invite) => invite.status === 'ACCEPTED' && Boolean(invite.bookingId));
            strict_1.default.ok(acceptedWithBooking.length > 0, `pass ${pass}: expected accepted invite converted to booking`);
            const completedWithInvite = snapshot.bookings.some((booking) => booking.status === 'COMPLETED' && Boolean(booking.sessionInviteId));
            strict_1.default.ok(completedWithInvite, `pass ${pass}: expected completed booking linked to invite`);
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
            }
            else {
                strict_1.default.deepEqual(currentCounts, baselineCounts, `pass ${pass}: seeded counts changed across repeated runs`);
            }
        }
    });
});
