import type { FamilyMember } from '@/constants/family-types';
import { apiFetch } from '@/services/api-client';
import {
  buildApiAuthHeaders,
  deriveApiActingRole,
  resolveSignedInApiUser,
} from '@/services/api-auth-context';
import type {
  ChildProfile,
  Disability,
  Gender,
  Relationship,
  SpecialNeed,
} from '@/services/child-service';
import { err, ok, serviceError, type Result, type ServiceError } from '@/types/result';

export interface ApiMeResponse {
  linkedFamilies: Array<{
    familyId?: string | null;
    role?: string | null;
    relationshipLabel?: string | null;
  }>;
}

export interface ApiFamilyAthlete {
  id: string;
  userId?: string | null;
  parentId?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nickname?: string | null;
  dateOfBirth?: string | null;
  avatarUrl?: string | null;
  photoUrl?: string | null;
  gender?: Gender | null;
  relationship?: Relationship | null;
  primaryPosition?: string | null;
  disabilities?: Disability[] | null;
  specialNeeds?: SpecialNeed[] | null;
  communicationNotes?: string | null;
  behavioralNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export async function resolveFamilyAuthorityContext(
  message: string,
): Promise<Result<{ parentId: string; familyId: string }, ServiceError>> {
  const currentUserResult = await resolveSignedInApiUser(message);
  if (!currentUserResult.success) {
    return currentUserResult;
  }

  const meResult = await apiFetch<ApiMeResponse>('/v1/me', {
    method: 'GET',
    headers: buildApiAuthHeaders({
      actingRole: deriveApiActingRole(currentUserResult.data, 'parent'),
    }),
  });
  if (!meResult.success) {
    return err(meResult.error);
  }

  const familyId = meResult.data.linkedFamilies.find((family) => family.familyId)?.familyId ?? null;
  if (!familyId) {
    return err(serviceError('NOT_FOUND', 'No family account found for this user.'));
  }

  return ok({
    parentId: currentUserResult.data.id,
    familyId,
  });
}

function splitDisplayName(displayName: string | null | undefined): { firstName: string; lastName: string } {
  const trimmed = displayName?.trim() ?? '';
  if (!trimmed) {
    return { firstName: 'Young', lastName: 'Athlete' };
  }

  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? 'Young',
    lastName: parts.slice(1).join(' ') || parts[0] || 'Athlete',
  };
}

function calculateAge(dateOfBirth?: string | null): number {
  if (!dateOfBirth) {
    return 0;
  }

  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function mapApiFamilyAthleteToChildProfile(
  athlete: ApiFamilyAthlete,
  fallbackParentId: string,
): ChildProfile {
  const splitName = splitDisplayName(athlete.displayName);
  return {
    id: athlete.id,
    parentId: athlete.parentId ?? fallbackParentId,
    firstName: athlete.firstName?.trim() || splitName.firstName,
    lastName: athlete.lastName?.trim() || splitName.lastName,
    nickname: athlete.nickname?.trim() || undefined,
    dateOfBirth: athlete.dateOfBirth ?? undefined,
    gender: athlete.gender ?? 'PREFER_NOT_TO_SAY',
    relationship: athlete.relationship ?? 'OTHER',
    primaryPosition: (athlete.primaryPosition as ChildProfile['primaryPosition']) ?? null,
    photoUrl: athlete.photoUrl ?? athlete.avatarUrl ?? undefined,
    disabilities: athlete.disabilities ?? [],
    specialNeeds: athlete.specialNeeds ?? [],
    hasSpecialNeeds: (athlete.disabilities?.length ?? 0) > 0 || (athlete.specialNeeds?.length ?? 0) > 0,
    allergies: [],
    medicalConditions: [],
    medications: [],
    communicationNotes: athlete.communicationNotes ?? undefined,
    behavioralNotes: athlete.behavioralNotes ?? undefined,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    secondaryEmergencyName: undefined,
    secondaryEmergencyPhone: undefined,
    photoConsent: true,
    videoConsent: true,
    socialMediaConsent: false,
    emergencyTreatmentConsent: true,
    createdAt: athlete.createdAt ?? new Date().toISOString(),
    updatedAt: athlete.updatedAt ?? athlete.createdAt ?? new Date().toISOString(),
  };
}

export function mapChildProfileToFamilyMember(
  child: ChildProfile,
  colorCode: string,
): FamilyMember {
  return {
    id: child.id,
    name: child.nickname?.trim() || `${child.firstName} ${child.lastName}`.trim(),
    avatar: child.photoUrl,
    relationship: child.relationship.toLowerCase() as FamilyMember['relationship'],
    age: calculateAge(child.dateOfBirth),
    colorCode,
    dateOfBirth: child.dateOfBirth,
    isActive: true,
    addedAt: child.createdAt,
  };
}
