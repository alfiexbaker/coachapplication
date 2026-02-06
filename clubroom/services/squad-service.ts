/**
 * Squad Service
 *
 * Handles squad-related operations including member management and squad queries.
 * Provides functionality for getting squad members, filtering, and squad info.
 *
 * API Integration Notes:
 * - GET /api/squads/:id - Get squad details
 * - GET /api/squads/:id/members - Get squad members
 * - GET /api/clubs/:clubId/squads - Get all squads for a club
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import type { ClubSquad, SquadMember } from '@/constants/types';
import { clubSquads } from '@/constants/mock-data';
import { createLogger } from '@/utils/logger';

import { STORAGE_KEYS } from '@/constants/storage-keys';

const logger = createLogger('SquadService');

const USE_MOCK = api.useMock;

// Cache for custom squads (created by users)
let customSquadsCache: ClubSquad[] = [];

async function loadCustomSquads(): Promise<ClubSquad[]> {
  try {
    const stored = await apiClient.get<ClubSquad[] | null>(STORAGE_KEYS.CLUB_SQUADS, null);
    if (stored) {
      customSquadsCache = stored;
      return customSquadsCache;
    }
  } catch (error) {
    logger.error('Failed to load custom squads', error);
  }
  return [];
}

async function saveCustomSquads(squads: ClubSquad[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.CLUB_SQUADS, squads);
    customSquadsCache = squads;
  } catch (error) {
    logger.error('Failed to save custom squads', error);
  }
}

// Mock squad members data
const MOCK_SQUAD_MEMBERS: SquadMember[] = [
  // U15 Performance Squad members
  {
    id: 'sm_1',
    squadId: 'squad_u15',
    athleteId: 'athlete_tom',
    athleteName: 'Tom Baker',
    athleteAge: 14,
    parentId: 'parent1',
    parentName: 'Sarah Baker',
    parentEmail: 'sarah.baker@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Midfielder',
    jerseyNumber: 10,
  },
  {
    id: 'sm_2',
    squadId: 'squad_u15',
    athleteId: 'athlete_james',
    athleteName: 'James Wilson',
    athleteAge: 14,
    parentId: 'parent2',
    parentName: 'Mike Wilson',
    parentEmail: 'mike.wilson@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Forward',
    jerseyNumber: 9,
  },
  {
    id: 'sm_3',
    squadId: 'squad_u15',
    athleteId: 'athlete_maya',
    athleteName: 'Maya Chen',
    athleteAge: 14,
    parentId: 'parent3',
    parentName: 'Lucy Chen',
    parentEmail: 'lucy.chen@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-15',
    position: 'Defender',
    jerseyNumber: 4,
  },
  {
    id: 'sm_4',
    squadId: 'squad_u15',
    athleteId: 'athlete_ethan',
    athleteName: 'Ethan Brown',
    athleteAge: 15,
    parentId: 'parent4',
    parentName: 'David Brown',
    parentEmail: 'david.brown@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Goalkeeper',
    jerseyNumber: 1,
  },
  {
    id: 'sm_5',
    squadId: 'squad_u15',
    athleteId: 'athlete_sophie',
    athleteName: 'Sophie Taylor',
    athleteAge: 14,
    parentId: 'parent5',
    parentName: 'Emma Taylor',
    parentEmail: 'emma.taylor@email.com',
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
    athleteName: 'Lucy Baker',
    athleteAge: 10,
    parentId: 'parent1',
    parentName: 'Sarah Baker',
    parentEmail: 'sarah.baker@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Forward',
    jerseyNumber: 7,
  },
  {
    id: 'sm_7',
    squadId: 'squad_juniors',
    athleteId: 'athlete_jack',
    athleteName: 'Jack Martinez',
    athleteAge: 10,
    parentId: 'parent6',
    parentName: 'Maria Martinez',
    parentEmail: 'maria.martinez@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Midfielder',
    jerseyNumber: 11,
  },
  {
    id: 'sm_8',
    squadId: 'squad_juniors',
    athleteId: 'athlete_olivia',
    athleteName: 'Olivia Johnson',
    athleteAge: 11,
    parentId: 'parent7',
    parentName: 'Rachel Johnson',
    parentEmail: 'rachel.johnson@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-15',
    position: 'Defender',
    jerseyNumber: 3,
  },
  {
    id: 'sm_9',
    squadId: 'squad_juniors',
    athleteId: 'athlete_noah',
    athleteName: 'Noah Williams',
    athleteAge: 10,
    parentId: 'parent8',
    parentName: 'Jennifer Williams',
    parentEmail: 'jennifer.williams@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-10-01',
    position: 'Goalkeeper',
    jerseyNumber: 1,
  },
  {
    id: 'sm_10',
    squadId: 'squad_juniors',
    athleteId: 'athlete_ava',
    athleteName: 'Ava Thompson',
    athleteAge: 11,
    parentId: 'parent9',
    parentName: 'Lisa Thompson',
    parentEmail: 'lisa.thompson@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-09-01',
    position: 'Forward',
    jerseyNumber: 10,
  },
  {
    id: 'sm_11',
    squadId: 'squad_juniors',
    athleteId: 'athlete_liam',
    athleteName: 'Liam Davis',
    athleteAge: 10,
    parentId: 'parent10',
    parentName: 'Karen Davis',
    parentEmail: 'karen.davis@email.com',
    status: 'ACTIVE',
    joinedAt: '2024-10-15',
    position: 'Midfielder',
    jerseyNumber: 6,
  },
];

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
      const mockSquads = clubSquads.filter((s) => s.clubId === clubId);
      const customForClub = custom.filter((s) => s.clubId === clubId);
      return [...mockSquads, ...customForClub];
    }

    const response = await fetch(`/api/clubs/${clubId}/squads`);
    return response.json();
  },

  /**
   * Get a single squad by ID
   */
  async getSquad(squadId: string): Promise<ClubSquad | null> {
    if (USE_MOCK) {
      const fromMock = clubSquads.find((s) => s.id === squadId);
      if (fromMock) return fromMock;

      const custom = await loadCustomSquads();
      return custom.find((s) => s.id === squadId) || null;
    }

    const response = await fetch(`/api/squads/${squadId}`);
    if (!response.ok) return null;
    return response.json();
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
      return newSquad;
    }

    const response = await fetch('/api/squads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSquad),
    });
    return response.json();
  },

  /**
   * Get all members of a squad
   */
  async getSquadMembers(squadId: string): Promise<SquadMember[]> {
    if (USE_MOCK) {
      membersCache = await loadMembers();
      return membersCache.filter(
        (m) => m.squadId === squadId && m.status === 'ACTIVE'
      );
    }

    const response = await fetch(`/api/squads/${squadId}/members`);
    return response.json();
  },

  /**
   * Get members of multiple squads
   */
  async getMembersForSquads(squadIds: string[]): Promise<SquadMember[]> {
    if (USE_MOCK) {
      membersCache = await loadMembers();
      return membersCache.filter(
        (m) => squadIds.includes(m.squadId) && m.status === 'ACTIVE'
      );
    }

    const response = await fetch(
      `/api/squads/members?squadIds=${squadIds.join(',')}`
    );
    return response.json();
  },

  /**
   * Get all unique parents for a squad (for sending notifications)
   */
  async getSquadParents(
    squadId: string
  ): Promise<{ parentId: string; parentName: string; parentEmail?: string; athletes: string[] }[]> {
    const members = await this.getSquadMembers(squadId);

    const parentMap = new Map<
      string,
      { parentId: string; parentName: string; parentEmail?: string; athletes: string[] }
    >();

    members.forEach((m) => {
      const existing = parentMap.get(m.parentId);
      if (existing) {
        existing.athletes.push(m.athleteName);
      } else {
        parentMap.set(m.parentId, {
          parentId: m.parentId,
          parentName: m.parentName,
          parentEmail: m.parentEmail,
          athletes: [m.athleteName],
        });
      }
    });

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
    return squads.filter((s) =>
      s.id !== 'squad_staff' &&
      (s.primaryCoach === coachId || !s.primaryCoach)
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
};
