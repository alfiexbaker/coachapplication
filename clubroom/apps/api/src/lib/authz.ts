import type { FastifyRequest } from 'fastify';
import { forbidden } from './http-errors.js';

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin';

const validRoles = new Set<ActingRole>(['coach', 'parent', 'athlete', 'club_admin']);

const guardianLinksByUser: Record<string, string[]> = {
  usr_parent1: ['ath_user1', 'ath_user2'],
  usr_parent2: ['ath_user3'],
};

const coachAssignmentsByUser: Record<string, string[]> = {
  usr_coach1: ['ath_user1', 'ath_user2'],
  'usr_dev-scaffold': ['ath_user1', 'ath_user2'],
};

function parseCsvHeader(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAuthOrThrow(request: FastifyRequest) {
  if (!request.auth) {
    throw forbidden('Authentication context is required');
  }
  return request.auth;
}

function getRoleOrThrow(request: FastifyRequest): ActingRole {
  const auth = getAuthOrThrow(request);
  const requestedActingRole = auth.actingRole;
  const fallbackRole = auth.roles[0];
  const role = (requestedActingRole ?? fallbackRole) as ActingRole | undefined;

  if (!role || !validRoles.has(role)) {
    throw forbidden('Valid acting role is required');
  }
  if (!auth.roles.includes(role)) {
    throw forbidden('Acting role is not granted to this session');
  }
  return role;
}

function athleteUserIdFromAthleteId(athleteId: string): string {
  return athleteId.startsWith('ath_') ? `usr_${athleteId.slice('ath_'.length)}` : '';
}

function getGuardianAthleteIds(request: FastifyRequest): Set<string> {
  const auth = getAuthOrThrow(request);
  const staticLinks = guardianLinksByUser[auth.userId] ?? [];
  const dynamicLinks = parseCsvHeader(request.headers['x-guardian-athlete-ids']);
  return new Set([...staticLinks, ...dynamicLinks]);
}

function getCoachAthleteIds(request: FastifyRequest): Set<string> {
  const auth = getAuthOrThrow(request);
  const staticAssignments = coachAssignmentsByUser[auth.userId] ?? [];
  const dynamicAssignments = parseCsvHeader(request.headers['x-coach-athlete-ids']);
  return new Set([...staticAssignments, ...dynamicAssignments]);
}

function isVerifiedCoach(request: FastifyRequest): boolean {
  const value = request.headers['x-coach-verified'];
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === '1' || normalized === 'true';
}

function isAthleteSelf(request: FastifyRequest, athleteId: string): boolean {
  return getAuthOrThrow(request).userId === athleteUserIdFromAthleteId(athleteId);
}

function isGuardianForAthlete(request: FastifyRequest, athleteId: string): boolean {
  return getGuardianAthleteIds(request).has(athleteId);
}

function isVerifiedAssignedCoach(request: FastifyRequest, athleteId: string): boolean {
  return isVerifiedCoach(request) && getCoachAthleteIds(request).has(athleteId);
}

export function assertCanReadAthleteHealth(request: FastifyRequest, athleteId: string): void {
  const role = getRoleOrThrow(request);

  if (role === 'athlete' && isAthleteSelf(request, athleteId)) {
    return;
  }
  if (role === 'parent' && isGuardianForAthlete(request, athleteId)) {
    return;
  }
  if (role === 'coach' && isVerifiedAssignedCoach(request, athleteId)) {
    return;
  }

  throw forbidden('Not allowed to read this athlete health resource');
}

export function assertCanWriteAthleteHealth(request: FastifyRequest, athleteId: string): void {
  const role = getRoleOrThrow(request);

  if (role === 'athlete' && isAthleteSelf(request, athleteId)) {
    return;
  }
  if (role === 'parent' && isGuardianForAthlete(request, athleteId)) {
    return;
  }
  if (role === 'coach' && isVerifiedAssignedCoach(request, athleteId)) {
    return;
  }

  throw forbidden('Not allowed to update this athlete health resource');
}

export function assertCanReadAthleteMedical(request: FastifyRequest, athleteId: string): void {
  // Same gate as health read in this scaffold; production can tighten separately.
  assertCanReadAthleteHealth(request, athleteId);
}

export function assertCanWriteAthleteMedical(request: FastifyRequest, athleteId: string): void {
  const role = getRoleOrThrow(request);
  if (role === 'parent' && isGuardianForAthlete(request, athleteId)) {
    return;
  }
  throw forbidden('Only a guardian can update medical or emergency records');
}

export function assertCanCreateSafeguardingIncident(
  request: FastifyRequest,
  athleteId?: string | null,
): void {
  const role = getRoleOrThrow(request);

  if (!['coach', 'parent', 'athlete'].includes(role)) {
    throw forbidden('Only coach, parent, or athlete can create safeguarding incidents');
  }

  if (!athleteId) {
    return;
  }

  if (role === 'athlete' && isAthleteSelf(request, athleteId)) {
    return;
  }
  if (role === 'parent' && isGuardianForAthlete(request, athleteId)) {
    return;
  }
  if (role === 'coach' && isVerifiedAssignedCoach(request, athleteId)) {
    return;
  }

  throw forbidden('Not allowed to create safeguarding incident for this athlete');
}

export function assertCanAccessSafeguardingIncident(
  request: FastifyRequest,
  incident: {
    reportedByUserId: string;
    athleteId: string | null;
  },
): void {
  const auth = getAuthOrThrow(request);
  const role = getRoleOrThrow(request);

  if (auth.userId === incident.reportedByUserId) {
    return;
  }
  if (role === 'club_admin') {
    return;
  }
  if (!incident.athleteId) {
    throw forbidden('Not allowed to access this safeguarding incident');
  }
  if (role === 'athlete' && isAthleteSelf(request, incident.athleteId)) {
    return;
  }
  if (role === 'parent' && isGuardianForAthlete(request, incident.athleteId)) {
    return;
  }
  if (role === 'coach' && isVerifiedAssignedCoach(request, incident.athleteId)) {
    return;
  }

  throw forbidden('Not allowed to access this safeguarding incident');
}
