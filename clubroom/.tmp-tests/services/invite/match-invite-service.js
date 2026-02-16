"use strict";
/**
 * Match Invite Service
 *
 * Handles match-specific invitation functionality including:
 * - Inviting squads to matches
 * - Match availability requests
 * - Match RSVP tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchInviteService = void 0;
const notification_service_1 = require("../notification-service");
const squad_service_1 = require("../squad-service");
const match_service_1 = require("../match-service");
const logger_1 = require("@/utils/logger");
const user_service_1 = require("../user-service");
const squad_invite_service_1 = require("./squad-invite-service");
const logger = (0, logger_1.createLogger)('MatchInviteService');
async function resolveUserName(userId, fallback) {
    const userResult = await user_service_1.userService.getUserById(userId);
    if (!userResult.success)
        return fallback;
    return userResult.data.name || fallback;
}
// ============================================================================
// MATCH INVITE SERVICE
// ============================================================================
exports.matchInviteService = {
    /**
     * Invite squad to a match - creates match and sends invites to all members
     */
    async inviteSquadToMatch(input) {
        const members = await squad_service_1.squadService.getSquadMembers(input.squadId);
        // Filter out excluded members
        const eligibleMembers = input.excludeMemberIds
            ? members.filter((m) => !input.excludeMemberIds.includes(m.athleteId))
            : members;
        // Create match using match service
        const match = await match_service_1.matchService.createMatch({
            clubId: input.clubId,
            clubName: input.clubName,
            squadId: input.squadId,
            squadName: input.squadName,
            coachId: input.coachId,
            coachName: input.coachName,
            title: input.matchTitle,
            matchType: input.matchType || 'FRIENDLY',
            opponent: input.opponent,
            isHome: input.isHome,
            date: input.date,
            kickoffTime: input.kickoffTime,
            venue: input.venue,
            maxPlayers: eligibleMembers.length,
            notes: input.notes,
        });
        // Invite all squad members
        if (match) {
            const players = await Promise.all(eligibleMembers.map(async (member, index) => ({
                athleteId: member.athleteId,
                athleteName: await resolveUserName(member.athleteId, `Athlete ${index + 1}`),
                parentId: member.parentId,
                parentName: await resolveUserName(member.parentId, 'Parent'),
            })));
            await match_service_1.matchService.invitePlayers({
                matchId: match.id,
                players,
            });
        }
        // Track squad invite
        const groupId = `squad_match_${match.id}`;
        const squadInvite = {
            id: groupId,
            squadId: input.squadId,
            targetType: 'MATCH',
            targetId: match.id,
            invitedBy: input.coachId,
            invitedAt: new Date().toISOString(),
            memberCount: eligibleMembers.length,
            excludedMemberIds: input.excludeMemberIds,
            responses: {
                accepted: 0,
                declined: 0,
                pending: eligibleMembers.length,
            },
        };
        let squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        squadInvitesCache.push(squadInvite);
        await (0, squad_invite_service_1.saveSquadInvites)(squadInvitesCache);
        // Send notifications to all parents
        const parentMap = new Map();
        eligibleMembers.forEach((m) => {
            const existing = parentMap.get(m.parentId) || [];
            parentMap.set(m.parentId, [...existing, m]);
        });
        let sent = 0;
        let failed = 0;
        const errors = [];
        for (const [parentId, athletes] of parentMap.entries()) {
            try {
                const athleteNames = (await Promise.all(athletes.map((athlete, index) => resolveUserName(athlete.athleteId, `Athlete ${index + 1}`)))).join(', ');
                await notification_service_1.notificationService.create({
                    id: `notif_match_${Date.now()}_${parentId}`,
                    type: 'booking',
                    title: 'Match Availability Request',
                    body: `${athleteNames} invited to match ${input.isHome ? 'vs' : '@'} ${input.opponent} on ${input.date}`,
                    recipientId: parentId,
                    recipientRole: 'parent',
                    deepLink: `/matches/${match.id}`,
                    data: {
                        matchId: match.id,
                        squadName: input.squadName,
                    },
                    timeLabel: 'Just now',
                });
                sent++;
            }
            catch (error) {
                failed++;
                errors.push({
                    memberId: athletes[0].athleteId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }
        return {
            match,
            inviteResult: {
                sent,
                successful: sent,
                failed,
                skipped: 0,
                totalAttempted: eligibleMembers.length,
                errors,
                groupId,
            },
        };
    },
    /**
     * Get match invites for a specific match
     */
    async getMatchInvites(matchId) {
        const squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        return squadInvitesCache.filter((si) => si.targetType === 'MATCH' && si.targetId === matchId);
    },
    /**
     * Get all match invites by coach
     */
    async getCoachMatchInvites(coachId) {
        const squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        return squadInvitesCache.filter((si) => si.targetType === 'MATCH' && si.invitedBy === coachId);
    },
    /**
     * Update match invite responses
     */
    async updateMatchInviteResponse(matchId, squadId, accepted, declined) {
        let squadInvitesCache = await (0, squad_invite_service_1.loadSquadInvites)();
        const index = squadInvitesCache.findIndex((si) => si.targetType === 'MATCH' && si.targetId === matchId && si.squadId === squadId);
        if (index !== -1) {
            const invite = squadInvitesCache[index];
            squadInvitesCache[index] = {
                ...invite,
                responses: {
                    accepted,
                    declined,
                    pending: invite.memberCount - accepted - declined,
                },
            };
            await (0, squad_invite_service_1.saveSquadInvites)(squadInvitesCache);
        }
    },
};
