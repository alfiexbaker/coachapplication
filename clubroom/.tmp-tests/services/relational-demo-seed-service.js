"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureRelationalDemoSeeded = ensureRelationalDemoSeeded;
const relational_demo_seeds_1 = require("@/constants/relational-demo-seeds");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('RelationalDemoSeedService');
const CLUB_MEMBERS_KEY = `${storage_keys_1.STORAGE_KEYS.CLUB_MEMBERS}_${relational_demo_seeds_1.CLUB_LIONS_ID}`;
const RATE_COACH_REVIEWS_KEY = 'coach_reviews';
const COACH_PUBLIC_REVIEWS_KEY = 'clubroom.coach_reviews';
const COACH_DIRECTORY_KEY = 'clubroom.coaches';
const COACH_BOOKINGS_KEY = 'coach_bookings';
let seedInFlight = null;
function mergeByKey(existing, seeded, getKey) {
    const seededKeys = new Set(seeded.map((item) => getKey(item)));
    const extras = existing.filter((item) => !seededKeys.has(getKey(item)));
    return [...seeded, ...extras];
}
function mergeById(existing, seeded) {
    return mergeByKey(existing, seeded, (item) => item.id);
}
function mergeMessagesByThread(existing, seeded) {
    const merged = { ...existing };
    for (const [threadId, seededMessages] of Object.entries(seeded)) {
        const current = existing[threadId] ?? [];
        const combined = mergeById(current, seededMessages).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        merged[threadId] = combined;
    }
    return merged;
}
async function getSeedHealthSnapshot() {
    const [version, users, bookings, offerings, invites, coachSessions, roster, messagesByThread, reviews, coachReviews, coaches, clubMembers, coachBookings,] = await Promise.all([
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
        api_client_1.apiClient.get(COACH_DIRECTORY_KEY, []),
        api_client_1.apiClient.get(CLUB_MEMBERS_KEY, []),
        api_client_1.apiClient.get(COACH_BOOKINGS_KEY, []),
    ]);
    const messageCount = Object.values(messagesByThread).reduce((sum, messages) => sum + messages.length, 0);
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
function isHealthy(snapshot) {
    return (snapshot.version === relational_demo_seeds_1.RELATIONAL_DEMO_SEED_VERSION &&
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
        snapshot.coachBookings >= 3);
}
async function seedRelationalDemoDataInternal() {
    const payload = (0, relational_demo_seeds_1.buildRelationalDemoSeedPayload)();
    const [existingUsers, existingBookings, existingOfferings, existingInvites, existingCoachSessions, existingRoster, existingFavourites, existingMessagesByThread, existingReviews, existingRateCoachReviews, existingCoachPublicReviews, existingCoaches, existingSquads, existingSquadMembers, existingClubMembers, existingChildrenProfiles, existingFamilyMembers, existingFamilyBookings, existingCoachBookings,] = await Promise.all([
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.USERS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.BOOKINGS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.COACH_SESSIONS, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.ROSTER, []),
        api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.FAVOURITES, []),
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
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, users),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.BOOKINGS, bookings),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_OFFERINGS, offerings),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_INVITES, invites),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.COACH_SESSIONS, coachSessions),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.ROSTER, roster),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAVOURITES, favourites),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.MESSAGES, messagesByThread),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.REVIEWS, reviews),
        api_client_1.apiClient.set(RATE_COACH_REVIEWS_KEY, rateCoachReviews),
        api_client_1.apiClient.set(COACH_PUBLIC_REVIEWS_KEY, coachPublicReviews),
        api_client_1.apiClient.set(COACH_DIRECTORY_KEY, coaches),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS, squads),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS, squadMembers),
        api_client_1.apiClient.set(CLUB_MEMBERS_KEY, clubMembers),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES, childrenProfiles),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_MEMBERS, familyMembers),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.FAMILY_BOOKINGS, familyBookings),
        api_client_1.apiClient.set(COACH_BOOKINGS_KEY, coachBookings),
        api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.RELATIONAL_DEMO_SEED_VERSION, relational_demo_seeds_1.RELATIONAL_DEMO_SEED_VERSION),
    ]);
}
async function ensureRelationalDemoSeeded(options = {}) {
    if (seedInFlight) {
        return seedInFlight;
    }
    seedInFlight = (async () => {
        try {
            if (!options.force) {
                const health = await getSeedHealthSnapshot();
                if (isHealthy(health)) {
                    return;
                }
            }
            await seedRelationalDemoDataInternal();
            const finalHealth = await getSeedHealthSnapshot();
            if (!isHealthy(finalHealth)) {
                logger.warn('relational_demo_seed_health_check_incomplete', finalHealth);
            }
            else {
                logger.info('relational_demo_seeded', finalHealth);
            }
        }
        catch (error) {
            logger.error('failed_to_seed_relational_demo_data', error);
            throw error;
        }
        finally {
            seedInFlight = null;
        }
    })();
    return seedInFlight;
}
