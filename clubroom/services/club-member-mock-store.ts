import { api } from '@/constants/config';
import type { ClubRole } from '@/constants/types';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';

export interface ClubMember {
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  role: ClubRole;
  status: 'active' | 'pending' | 'banned';
  joinedAt: string;
  squadIds?: string[];
  bannedAt?: string;
  bannedBy?: string;
  banReason?: string;
}

const MOCK_MEMBERS: ClubMember[] = normalizeLegacyMockDates([
  {
    userId: 'coach1',
    userName: 'Director Kelly',
    role: 'OWNER',
    status: 'active',
    joinedAt: '2024-01-15',
    squadIds: ['squad_u15', 'squad_juniors'],
  },
  {
    userId: 'coach2',
    userName: 'Jess Okafor',
    role: 'COACH',
    status: 'active',
    joinedAt: '2024-03-20',
    squadIds: ['squad_u15'],
  },
  {
    userId: 'coach3',
    userName: 'Reuben Carr',
    role: 'COACH',
    status: 'pending',
    joinedAt: '2024-11-10',
    squadIds: ['squad_juniors'],
  },
  {
    userId: 'parent1',
    userName: 'Sarah Baker',
    role: 'MEMBER',
    status: 'active',
    joinedAt: '2024-06-01',
  },
  {
    userId: 'parent2',
    userName: 'Dan Mensah',
    role: 'MEMBER',
    status: 'active',
    joinedAt: '2024-07-15',
  },
]);

const membersCache = new Map<string, ClubMember[]>();

function cloneMembers(members: ClubMember[]): ClubMember[] {
  return members.map((member) => ({
    ...member,
    squadIds: member.squadIds ? [...member.squadIds] : undefined,
  }));
}

export async function loadMockClubMembers(clubId: string): Promise<ClubMember[]> {
  if (!api.useMock) {
    return [];
  }

  const cached = membersCache.get(clubId);
  if (cached) {
    return cloneMembers(cached);
  }

  const seededMembers = cloneMembers(MOCK_MEMBERS);
  membersCache.set(clubId, seededMembers);
  return cloneMembers(seededMembers);
}

export async function saveMockClubMembers(clubId: string, members: ClubMember[]): Promise<void> {
  membersCache.set(clubId, cloneMembers(members));
}

export function seedMockClubMembers(clubId: string, members: ClubMember[]): void {
  membersCache.set(clubId, cloneMembers(members));
}

export function resetMockClubMembers(clubId?: string): void {
  if (clubId) {
    membersCache.delete(clubId);
    return;
  }
  membersCache.clear();
}
