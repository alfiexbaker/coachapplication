/**
 * Squad Service
 *
 * Handles squad-related operations including member management and squad queries.
 * Provides functionality for getting squad members, filtering, and squad info.
 *
 * API Integration Notes:
 * - GET /v1/squads/:id - Get squad details
 * - GET /v1/clubs/:clubId/squads - Get all squads for a club
 * - POST /v1/clubs/:clubId/squads - Create a squad
 * - PATCH /v1/clubs/:clubId/squads/:squadId - Update a squad
 * - DELETE /v1/clubs/:clubId/squads/:squadId - Archive an empty squad
 * - GET /v1/squads/:id/members - Get governed squad roster
 */

import { apiClient, apiFetch } from './api-client';
import { api } from '@/constants/config';
import type { ClubSquad, SquadMember } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';
import { userService } from './user-service';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('SquadService');

const USE_MOCK = api.useMock;

interface ApiClubSquadsResponse {
  squads: ClubSquad[];
}

interface ApiClubSquadResponse {
  squad: ClubSquad;
}

interface ApiSquadMembersResponse {
  members: SquadMember[];
}

function resolveInputLevel(input: {
  level?: string;
  ageGroup?: string;
  skillLevel?: string;
}): string | undefined {
  if (input.level?.trim()) return input.level.trim();
  if (input.ageGroup?.trim() && input.skillLevel?.trim()) {
    return `${input.ageGroup.trim()} · ${input.skillLevel.trim()}`;
  }
  return input.ageGroup?.trim() || input.skillLevel?.trim() || undefined;
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

async function resolveUserEmail(userId: string): Promise<string | undefined> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return undefined;
  return userResult.data.email;
}

const BASE_CLUB_SQUADS: ClubSquad[] = [
  {
    id: 'squad_u15',
    clubId: 'club_lions',
    name: 'U15 Performance',
    level: 'U15 · Competitive',
    memberCount: 18,
    primaryCoach: 'coach1',
    meetLocation: 'Pitch 2',
    tags: ['Pressing', 'Finishing'],
  },
  {
    id: 'squad_juniors',
    clubId: 'club_lions',
    name: 'Junior Skills',
    level: 'U11 · Development',
    memberCount: 22,
    primaryCoach: 'coach2',
    meetLocation: 'Sports Hall',
    tags: ['Ball Mastery', 'Confidence'],
  },
  {
    id: 'squad_staff',
    clubId: 'club_lions',
    name: 'Staff Room',
    level: 'Coaches & Admins',
    memberCount: 8,
    primaryCoach: 'coach1',
    meetLocation: 'Clubhouse',
    tags: ['Approvals', 'Safeguarding'],
  },
  {
    id: 'squad_warriors_u12',
    clubId: 'club_warriors',
    name: 'U12 Development',
    level: 'U12 · Grassroots',
    memberCount: 16,
    primaryCoach: 'coach3',
    meetLocation: 'Southbank Fields',
  },
  {
    id: 'squad_warriors_u14',
    clubId: 'club_warriors',
    name: 'U14 Competitive',
    level: 'U14 · League',
    memberCount: 20,
    primaryCoach: 'coach4',
    meetLocation: 'Southbank Stadium',
  },
  {
    id: 'squad_warriors_girls',
    clubId: 'club_warriors',
    name: 'Girls Team',
    level: 'U16 · Development',
    memberCount: 14,
    primaryCoach: 'coach4',
    meetLocation: 'Southbank Fields',
  },
  {
    id: 'squad_phoenix_elite',
    clubId: 'club_phoenix',
    name: 'Elite Academy',
    level: 'U15 · Performance',
    memberCount: 18,
    primaryCoach: 'coach5',
    meetLocation: 'Phoenix Training Ground',
  },
  {
    id: 'squad_phoenix_dev',
    clubId: 'club_phoenix',
    name: 'Development Squad',
    level: 'U13 · Foundation',
    memberCount: 22,
    primaryCoach: 'coach7',
    meetLocation: 'Phoenix Training Ground',
  },
  {
    id: 'squad_nlu_elite',
    clubId: 'club_united',
    name: 'Elite First Team',
    level: 'U16 · Competitive',
    memberCount: 18,
    primaryCoach: 'coach6',
    meetLocation: 'United Stadium',
  },
  {
    id: 'squad_nlu_academy',
    clubId: 'club_united',
    name: 'Academy Pathway',
    level: 'U14 · Development',
    memberCount: 24,
    primaryCoach: 'coach1',
    meetLocation: 'United Training Pitch',
  },
  {
    id: 'squad_nlu_tots',
    clubId: 'club_united',
    name: 'Mini Kickers',
    level: 'U8 · Fun Football',
    memberCount: 30,
    primaryCoach: 'coach2',
    meetLocation: 'Community Centre',
  },
];

// Cache for custom squads (created by users)
let customSquadsCache: ClubSquad[] = [];

function cloneSquad(squad: ClubSquad): ClubSquad {
  return {
    ...squad,
    tags: squad.tags ? [...squad.tags] : undefined,
  };
}

function mergeSquads(baseSquads: ClubSquad[], customSquads: ClubSquad[]): ClubSquad[] {
  const byId = new Map<string, ClubSquad>();
  for (const squad of baseSquads) {
    byId.set(squad.id, squad);
  }
  for (const squad of customSquads) {
    const current = byId.get(squad.id);
    byId.set(squad.id, current ? { ...current, ...squad } : squad);
  }
  return Array.from(byId.values());
}

async function loadCustomSquads(): Promise<ClubSquad[]> {
  return customSquadsCache.map(cloneSquad);
}

async function saveCustomSquads(squads: ClubSquad[]): Promise<void> {
  customSquadsCache = squads.map(cloneSquad);
}

// Mock squad members data
const MOCK_SQUAD_MEMBERS: SquadMember[] = normalizeLegacyMockDates([
  // U15 Performance Squad members
  {
    id: 'sm_1',
    squadId: 'squad_u15',
    athleteId: 'athlete_tom',
    parentId: 'parent1',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Midfielder',
    jerseyNumber: 10,
  },
  {
    id: 'sm_2',
    squadId: 'squad_u15',
    athleteId: 'athlete_james',
    parentId: 'parent2',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Forward',
    jerseyNumber: 9,
  },
  {
    id: 'sm_3',
    squadId: 'squad_u15',
    athleteId: 'athlete_maya',
    parentId: 'parent3',
    status: 'ACTIVE',
    joinedAt: '2024-09-15',
    position: 'Defender',
    jerseyNumber: 4,
  },
  {
    id: 'sm_4',
    squadId: 'squad_u15',
    athleteId: 'athlete_ethan',
    parentId: 'parent4',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Goalkeeper',
    jerseyNumber: 1,
  },
  {
    id: 'sm_5',
    squadId: 'squad_u15',
    athleteId: 'athlete_sophie',
    parentId: 'parent5',
    status: 'ACTIVE',
    joinedAt: '2024-10-01',
    position: 'Midfielder',
    jerseyNumber: 8,
  },
  // Junior Skills Squad members
  {
    id: 'sm_6',
    squadId: 'squad_juniors',
    athleteId: 'athlete_lucy',
    parentId: 'parent1',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Forward',
    jerseyNumber: 7,
  },
  {
    id: 'sm_7',
    squadId: 'squad_juniors',
    athleteId: 'athlete_jack',
    parentId: 'parent6',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Midfielder',
    jerseyNumber: 11,
  },
  {
    id: 'sm_8',
    squadId: 'squad_juniors',
    athleteId: 'athlete_olivia',
    parentId: 'parent7',
    status: 'ACTIVE',
    joinedAt: '2024-09-15',
    position: 'Defender',
    jerseyNumber: 3,
  },
  {
    id: 'sm_9',
    squadId: 'squad_juniors',
    athleteId: 'athlete_noah',
    parentId: 'parent8',
    status: 'ACTIVE',
    joinedAt: '2024-10-01',
    position: 'Goalkeeper',
    jerseyNumber: 1,
  },
  {
    id: 'sm_10',
    squadId: 'squad_juniors',
    athleteId: 'athlete_ava',
    parentId: 'parent9',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Forward',
    jerseyNumber: 10,
  },
  {
    id: 'sm_11',
    squadId: 'squad_juniors',
    athleteId: 'athlete_liam',
    parentId: 'parent10',
    status: 'ACTIVE',
    joinedAt: '2024-10-15',
    position: 'Midfielder',
    jerseyNumber: 6,
  },
]);

let membersCache: SquadMember[] = [...MOCK_SQUAD_MEMBERS];

async function loadMembers(): Promise<SquadMember[]> {
  try {
    const stored = await apiClient.get<SquadMember[] | null>(STORAGE_KEYS.SQUAD_MEMBERS, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load members', error);
  }
  return [...MOCK_SQUAD_MEMBERS];
}

export const squadService = {
  /**
   * Get all squads for a club
   */
  async getSquads(clubId: string): Promise<ClubSquad[]> {
    if (USE_MOCK) {
      const custom = await loadCustomSquads();
      const mockSquads = BASE_CLUB_SQUADS.filter((s) => s.clubId === clubId);
      const customForClub = custom.filter((s) => s.clubId === clubId);
      return mergeSquads(mockSquads, customForClub);
    }

    const response = await apiFetch<ApiClubSquadsResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/squads`,
    );
    if (!response.success) {
      logger.error('Failed to load club squads', response.error);
      return [];
    }
    return response.data.squads;
  },

  /**
   * Get a single squad by ID
   */
  async getSquad(squadId: string): Promise<ClubSquad | null> {
    if (USE_MOCK) {
      const custom = await loadCustomSquads();
      const fromCustom = custom.find((s) => s.id === squadId);
      if (fromCustom) return fromCustom;

      const fromMock = BASE_CLUB_SQUADS.find((s) => s.id === squadId);
      if (fromMock) return fromMock;
      return null;
    }

    const response = await apiFetch<ApiClubSquadResponse>(
      `/v1/squads/${encodeURIComponent(squadId)}`,
    );
    if (!response.success) {
      logger.error('Failed to load squad', response.error);
      return null;
    }
    return response.data.squad;
  },

  /**
   * Create a new squad
   */
  async createSquad(input: {
    clubId: string;
    name: string;
    level: string;
    description?: string;
    meetingLocation?: string;
    ageGroup?: string;
    skillLevel?: string;
    focusAreas?: string[];
  }): Promise<ClubSquad> {
    const newSquad: ClubSquad = {
      id: `squad_${Date.now()}`,
      clubId: input.clubId,
      name: input.name,
      level: input.level,
      memberCount: 0,
      description: input.description,
      meetLocation: input.meetingLocation ?? 'TBD',
      primaryCoach: 'coach1',
    };

    if (USE_MOCK) {
      const custom = await loadCustomSquads();
      custom.push(newSquad);
      await saveCustomSquads(custom);
      logger.info('Squad created', { squadId: newSquad.id, name: newSquad.name });

      emitTyped(ServiceEvents.SQUAD_CREATED, {
        squadId: newSquad.id,
        clubId: newSquad.clubId,
        squadName: newSquad.name,
        createdBy: newSquad.primaryCoach,
      });

      return newSquad;
    }

    const response = await apiFetch<ApiClubSquadResponse>(
      `/v1/clubs/${encodeURIComponent(input.clubId)}/squads`,
      {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          level: input.level,
          description: input.description,
          meetingLocation: input.meetingLocation,
          ageGroup: input.ageGroup,
          skillLevel: input.skillLevel,
          focusAreas: input.focusAreas,
        }),
      },
    );
    if (!response.success) {
      logger.error('Failed to create squad', response.error);
      throw new Error(response.error.message);
    }
    const created = response.data.squad;

    emitTyped(ServiceEvents.SQUAD_CREATED, {
      squadId: created.id,
      clubId: created.clubId,
      squadName: created.name,
      createdBy: created.primaryCoach,
    });

    return created;
  },

  /**
   * Update a squad
   */
  async updateSquad(
    clubId: string,
    squadId: string,
    input: {
      name?: string;
      level?: string;
      ageGroup?: string;
      skillLevel?: string;
    },
  ): Promise<ClubSquad> {
    if (USE_MOCK) {
      const custom = await loadCustomSquads();
      const allSquads = mergeSquads(
        BASE_CLUB_SQUADS.filter((s) => s.clubId === clubId),
        custom.filter((s) => s.clubId === clubId),
      );
      const existing = allSquads.find((squad) => squad.id === squadId);
      if (!existing) {
        throw new Error('Squad not found');
      }
      const level = resolveInputLevel(input);
      const updated: ClubSquad = {
        ...existing,
        name: input.name?.trim() || existing.name,
        level: level ?? existing.level,
      };
      const nextCustom = custom.filter((squad) => squad.id !== squadId);
      nextCustom.push(updated);
      await saveCustomSquads(nextCustom);
      return updated;
    }

    const response = await apiFetch<ApiClubSquadResponse>(
      `/v1/clubs/${encodeURIComponent(clubId)}/squads/${encodeURIComponent(squadId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(input),
      },
    );
    if (!response.success) {
      logger.error('Failed to update squad', response.error);
      throw new Error(response.error.message);
    }
    return response.data.squad;
  },

  /**
   * Archive a squad after backend dependency checks.
   */
  async deleteSquad(clubId: string, squadId: string): Promise<void> {
    if (USE_MOCK) {
      const custom = await loadCustomSquads();
      await saveCustomSquads(custom.filter((squad) => squad.id !== squadId));
      emitTyped(ServiceEvents.SQUAD_DELETED, {
        squadId,
        clubId,
      });
      return;
    }

    const response = await apiFetch<void>(
      `/v1/clubs/${encodeURIComponent(clubId)}/squads/${encodeURIComponent(squadId)}`,
      {
        method: 'DELETE',
      },
    );
    if (!response.success) {
      logger.error('Failed to delete squad', response.error);
      throw new Error(response.error.message);
    }
    emitTyped(ServiceEvents.SQUAD_DELETED, {
      squadId,
      clubId,
    });
  },

  /**
   * Get all members of a squad
   */
  async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    if (USE_MOCK) {
      membersCache = await loadMembers();
      return membersCache.filter((m) => m.squadId === squadId && m.status === 'ACTIVE');
    }

    const response = await apiFetch<ApiSquadMembersResponse>(
      `/v1/squads/${encodeURIComponent(squadId)}/members`,
    );
    if (!response.success) {
      logger.error('Failed to load squad members', response.error);
      throw new Error(response.error.message);
    }
    return response.data.members;
  },

  /**
   * Get members of multiple squads
   */
  async getMembersForSquads(squadIds: string[]): Promise<SquadMember[]> {
    if (USE_MOCK) {
      membersCache = await loadMembers();
      return membersCache.filter((m) => squadIds.includes(m.squadId) && m.status === 'ACTIVE');
    }

    const uniqueSquadIds = Array.from(new Set(squadIds));
    const members = await Promise.all(
      uniqueSquadIds.map((squadId) => this.getSquadMembers(squadId)),
    );
    return members.flat();
  },

  /**
   * Get all unique parents for a squad (for sending notifications)
   */
  async getSquadParents(
    squadId: string,
  ): Promise<{ parentId: string; parentName: string; parentEmail?: string; athletes: string[] }[]> {
    const members = await this.getSquadMembers(squadId);

    const parentMap = new Map<
      string,
      { parentId: string; parentName: string; parentEmail?: string; athletes: string[] }
    >();

    const memberProfiles = await Promise.all(
      members.map(async (member) => {
        const [athleteName, parentName, parentEmail] = await Promise.all([
          resolveUserName(member.athleteId, 'Athlete'),
          resolveUserName(member.parentId, 'Parent'),
          resolveUserEmail(member.parentId),
        ]);
        return { member, athleteName, parentName, parentEmail };
      }),
    );

    for (const { member: m, athleteName, parentName, parentEmail } of memberProfiles) {
      const existing = parentMap.get(m.parentId);
      if (existing) {
        existing.athletes.push(athleteName);
      } else {
        parentMap.set(m.parentId, {
          parentId: m.parentId,
          parentName,
          parentEmail,
          athletes: [athleteName],
        });
      }
    }

    return Array.from(parentMap.values());
  },

  /**
   * Get squad member count
   */
  async getSquadMemberCount(squadId: string): Promise<number> {
    const members = await this.getSquadMembers(squadId);
    return members.length;
  },

  /**
   * Get squads that a user coaches
   */
  async getCoachSquads(coachId: string, clubId: string): Promise<ClubSquad[]> {
    const squads = await this.getSquads(clubId);
    // Filter by coach assignment - show squads where coach is primary coach
    // Also include squads without a coach assigned (for assignment)
    return squads.filter(
      (s) => s.id !== 'squad_staff' && (s.primaryCoach === coachId || !s.primaryCoach),
    );
  },

  /**
   * Get squad summary for display
   */
  async getSquadSummary(squadId: string): Promise<{
    squad: ClubSquad | null;
    memberCount: number;
    parentCount: number;
  }> {
    const [squad, members] = await Promise.all([
      this.getSquad(squadId),
      this.getSquadMembers(squadId),
    ]);

    const uniqueParents = new Set(members.map((m) => m.parentId));

    return {
      squad,
      memberCount: members.length,
      parentCount: uniqueParents.size,
    };
  },

  /**
   * Format squad name with member count for display
   */
  formatSquadLabel(squad: ClubSquad): string {
    return `${squad.name} (${squad.memberCount} athletes)`;
  },

  /**
   * Get age group label from squad level
   */
  getAgeGroupLabel(squad: ClubSquad): string {
    // Extract age group from level string (e.g., "U15 · Competitive" -> "U15")
    const match = squad.level.match(/U\d+/);
    return match ? match[0] : squad.level.split('·')[0].trim();
  },

  __resetMockSquads(): void {
    customSquadsCache = [];
  },

  __seedMockSquads(squads: ClubSquad[]): void {
    customSquadsCache = squads.map(cloneSquad);
  },
};
