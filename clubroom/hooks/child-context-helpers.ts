import type { ClubSquad, SquadMember } from '@/constants/types';
import type { ChildReference } from '@/constants/user-types';
import type { ChildProfile, ChildSquadMembership } from '@/services/child-service';
import type { ChildInfo } from '@/types/child-context';
import { CHILD_COLORS } from '@/types/child-context';

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function reconcileChildren(
  refs: ChildReference[],
  profiles: ChildProfile[],
): ChildInfo[] {
  const profileById = new Map<string, ChildProfile>();
  const profileByFullName = new Map<string, ChildProfile>();
  const profileByFirstName = new Map<string, ChildProfile>();
  for (const p of profiles) {
    profileById.set(p.id, p);
    profileByFullName.set(`${p.firstName} ${p.lastName}`.toLowerCase(), p);
    const firstKey = p.firstName.toLowerCase();
    if (!profileByFirstName.has(firstKey)) {
      profileByFirstName.set(firstKey, p);
    }
  }

  const matchedProfileIds = new Set<string>();

  const children: ChildInfo[] = refs.map((ref, index) => {
    const refNameLower = ref.childName.toLowerCase();
    let profile = profileById.get(ref.childId) ?? null;

    if (!profile) {
      profile = profileByFullName.get(refNameLower) ?? null;
    }

    if (!profile) {
      const firstName = ref.childName.split(' ')[0]?.toLowerCase();
      if (firstName) {
        profile = profileByFirstName.get(firstName) ?? null;
      }
    }

    if (profile) {
      matchedProfileIds.add(profile.id);
    }

    const name = profile?.nickname || profile?.firstName || ref.childName.split(' ')[0];
    const fullName = profile ? `${profile.firstName} ${profile.lastName}` : ref.childName;

    return {
      id: ref.childId,
      referenceId: ref.childId,
      profileId: profile?.id ?? null,
      name,
      fullName,
      initials: getInitials(fullName),
      avatarUrl: profile?.photoUrl ?? null,
      age: calculateAge(profile?.dateOfBirth),
      dateOfBirth: profile?.dateOfBirth ?? null,
      colorCode: CHILD_COLORS[index % CHILD_COLORS.length],
      squadIds: [],
      clubIds: [],
      hasSpecialNeeds: profile?.hasSpecialNeeds ?? false,
      profile,
    };
  });

  const unmatchedProfiles = profiles.filter((profile) => !matchedProfileIds.has(profile.id));
  const offset = children.length;

  for (let i = 0; i < unmatchedProfiles.length; i += 1) {
    const profile = unmatchedProfiles[i];
    const fullName = `${profile.firstName} ${profile.lastName}`;
    const name = profile.nickname || profile.firstName || fullName;

    children.push({
      id: profile.id,
      referenceId: profile.id,
      profileId: profile.id,
      name,
      fullName,
      initials: getInitials(fullName),
      avatarUrl: profile.photoUrl ?? null,
      age: calculateAge(profile.dateOfBirth),
      dateOfBirth: profile.dateOfBirth ?? null,
      colorCode: CHILD_COLORS[(offset + i) % CHILD_COLORS.length],
      squadIds: [],
      clubIds: [],
      hasSpecialNeeds: profile.hasSpecialNeeds,
      profile,
    });
  }

  return children;
}

export function attachMembershipData(
  children: ChildInfo[],
  squads: ClubSquad[],
  squadMembers: SquadMember[],
): ChildInfo[] {
  if (children.length === 0 || squadMembers.length === 0) {
    return children;
  }

  const clubIdBySquadId = new Map<string, string>();
  for (const squad of squads) {
    clubIdBySquadId.set(squad.id, squad.clubId);
  }

  const squadIdsByAthleteId = new Map<string, Set<string>>();
  for (const member of squadMembers) {
    if (member.status !== 'ACTIVE') continue;
    const existing = squadIdsByAthleteId.get(member.athleteId) ?? new Set<string>();
    existing.add(member.squadId);
    squadIdsByAthleteId.set(member.athleteId, existing);
  }

  return children.map((child) => {
    const athleteIds = new Set<string>([child.id, child.referenceId]);
    if (child.profileId) {
      athleteIds.add(child.profileId);
    }

    const squadIdSet = new Set<string>();
    for (const athleteId of athleteIds) {
      const membershipSquads = squadIdsByAthleteId.get(athleteId);
      if (!membershipSquads) continue;
      for (const squadId of membershipSquads) {
        squadIdSet.add(squadId);
      }
    }

    const clubIdSet = new Set<string>();
    for (const squadId of squadIdSet) {
      const clubId = clubIdBySquadId.get(squadId);
      if (clubId) {
        clubIdSet.add(clubId);
      }
    }

    return {
      ...child,
      squadIds: Array.from(squadIdSet),
      clubIds: Array.from(clubIdSet),
    };
  });
}

export function attachLiveSquadMemberships(
  children: ChildInfo[],
  membershipsByAthleteId: Map<string, ChildSquadMembership[]>,
): ChildInfo[] {
  if (children.length === 0 || membershipsByAthleteId.size === 0) {
    return children;
  }

  return children.map((child) => {
    const athleteIds = new Set<string>();
    if (child.id.startsWith('ath_')) {
      athleteIds.add(child.id);
    }
    if (child.referenceId.startsWith('ath_')) {
      athleteIds.add(child.referenceId);
    }
    if (child.profileId) {
      athleteIds.add(child.profileId);
    }

    const squadIds = new Set<string>();
    const clubIds = new Set<string>();
    for (const athleteId of athleteIds) {
      const memberships = membershipsByAthleteId.get(athleteId) ?? [];
      for (const membership of memberships) {
        if (membership.status !== 'ACTIVE') continue;
        squadIds.add(membership.squadId);
        clubIds.add(membership.clubId);
      }
    }

    return {
      ...child,
      squadIds: Array.from(squadIds),
      clubIds: Array.from(clubIds),
    };
  });
}
