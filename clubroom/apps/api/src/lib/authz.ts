import type { FastifyRequest } from 'fastify';
import { resolveTrustAccessRepository } from '../repositories/p0/trust-access-repository.js';
import { forbidden } from './http-errors.js';

type ActingRole = 'coach' | 'parent' | 'athlete' | 'club_admin' | 'admin' | 'security_admin';
type GrantedRole = ActingRole | 'member';

interface AuthzCache {
  coachAthleteIds?: Promise<Set<string>>;
  guardianAthleteIds?: Promise<Set<string>>;
  verifiedCoach?: Promise<boolean>;
}

const validRoles = new Set<ActingRole>([
  'coach',
  'parent',
  'athlete',
  'club_admin',
  'admin',
  'security_admin',
]);
const privilegedAdminRoles: GrantedRole[] = ['club_admin', 'admin', 'security_admin'];
const staffInviteRoles: GrantedRole[] = ['coach', 'club_admin', 'admin', 'security_admin'];
const authzCacheKey = Symbol('clubroom.authz-cache');

function parseCsvHeader(value: unknown): string[] {
  const raw = Array.isArray(value) ? value.join(',') : typeof value === 'string' ? value : '';
  return raw.split(',').flatMap((item) => {
    const trimmed = item.trim();
    return trimmed ? [trimmed] : [];
  });
}

function getAuthOrThrow(request: FastifyRequest) {
  if (!request.auth) {
    throw forbidden('Authentication context is required');
  }
  return request.auth;
}

function getGrantedRoles(auth: FastifyRequest['auth'] | undefined): Set<GrantedRole> {
  const granted = new Set<GrantedRole>();

  for (const role of auth?.roles ?? []) {
    granted.add(role as GrantedRole);
  }

  if (auth?.actingRole) {
    granted.add(auth.actingRole as GrantedRole);
  }

  return granted;
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

function getAuthzCache(request: FastifyRequest): AuthzCache {
  const existing = (request as FastifyRequest & { [authzCacheKey]?: AuthzCache })[authzCacheKey];
  if (existing) {
    return existing;
  }
  const created: AuthzCache = {};
  (request as FastifyRequest & { [authzCacheKey]?: AuthzCache })[authzCacheKey] = created;
  return created;
}

function debugGuardianAthleteIds(request: FastifyRequest): string[] {
  return request.auth?.allowDebugTrustHeaders === true
    ? parseCsvHeader(request.headers['x-guardian-athlete-ids'])
    : [];
}

function debugCoachAthleteIds(request: FastifyRequest): string[] {
  return request.auth?.allowDebugTrustHeaders === true
    ? parseCsvHeader(request.headers['x-coach-athlete-ids'])
    : [];
}

function debugVerifiedCoach(request: FastifyRequest): boolean {
  if (request.auth?.allowDebugTrustHeaders !== true) {
    return false;
  }
  const value = request.headers['x-coach-verified'];
  const normalized = Array.isArray(value) ? value[0] : value;
  return normalized === '1' || normalized === 'true';
}

async function getGuardianAthleteIds(request: FastifyRequest): Promise<Set<string>> {
  const cache = getAuthzCache(request);
  if (!cache.guardianAthleteIds) {
    cache.guardianAthleteIds = (async () => {
      const auth = getAuthOrThrow(request);
      const repository = resolveTrustAccessRepository();
      const relatedAthleteIds = await repository.getGuardianAthleteIds(auth.userId);
      return new Set([...relatedAthleteIds, ...debugGuardianAthleteIds(request)]);
    })();
  }
  return cache.guardianAthleteIds;
}

async function getCoachAthleteIds(request: FastifyRequest): Promise<Set<string>> {
  const cache = getAuthzCache(request);
  if (!cache.coachAthleteIds) {
    cache.coachAthleteIds = (async () => {
      const auth = getAuthOrThrow(request);
      const repository = resolveTrustAccessRepository();
      const relatedAthleteIds = await repository.getCoachAthleteIds(auth.userId);
      return new Set([...relatedAthleteIds, ...debugCoachAthleteIds(request)]);
    })();
  }
  return cache.coachAthleteIds;
}

async function isVerifiedCoach(request: FastifyRequest): Promise<boolean> {
  const cache = getAuthzCache(request);
  if (!cache.verifiedCoach) {
    cache.verifiedCoach = (async () => {
      const auth = getAuthOrThrow(request);
      const repository = resolveTrustAccessRepository();
      return debugVerifiedCoach(request) || await repository.isVerifiedCoach(auth.userId);
    })();
  }
  return cache.verifiedCoach;
}

function isAthleteSelf(request: FastifyRequest, athleteId: string): boolean {
  return getAuthOrThrow(request).userId === athleteUserIdFromAthleteId(athleteId);
}

async function isGuardianForAthlete(request: FastifyRequest, athleteId: string): Promise<boolean> {
  return (await getGuardianAthleteIds(request)).has(athleteId);
}

async function isVerifiedAssignedCoach(request: FastifyRequest, athleteId: string): Promise<boolean> {
  return await isVerifiedCoach(request) && (await getCoachAthleteIds(request)).has(athleteId);
}

export function hasGrantedRole(
  auth: FastifyRequest['auth'] | undefined,
  role: GrantedRole,
): boolean {
  return getGrantedRoles(auth).has(role);
}

export function hasAnyGrantedRole(
  auth: FastifyRequest['auth'] | undefined,
  roles: GrantedRole[],
): boolean {
  const granted = getGrantedRoles(auth);
  return roles.some((role) => granted.has(role));
}

export function isClubAdminAuth(auth: FastifyRequest['auth'] | undefined): boolean {
  return hasGrantedRole(auth, 'club_admin');
}

export function isPrivilegedAdminAuth(auth: FastifyRequest['auth'] | undefined): boolean {
  return hasAnyGrantedRole(auth, privilegedAdminRoles);
}

export function canUseStaffInviteLinks(auth: FastifyRequest['auth'] | undefined): boolean {
  return hasAnyGrantedRole(auth, staffInviteRoles);
}

export async function assertCanReadAthleteHealth(
  request: FastifyRequest,
  athleteId: string,
): Promise<void> {
  const role = getRoleOrThrow(request);

  if (role === 'athlete' && isAthleteSelf(request, athleteId)) {
    return;
  }
  if (role === 'parent' && await isGuardianForAthlete(request, athleteId)) {
    return;
  }
  if (role === 'coach' && await isVerifiedAssignedCoach(request, athleteId)) {
    return;
  }

  throw forbidden('Not allowed to read this athlete health resource');
}

export async function assertCanWriteAthleteHealth(
  request: FastifyRequest,
  athleteId: string,
): Promise<void> {
  const role = getRoleOrThrow(request);

  if (role === 'athlete' && isAthleteSelf(request, athleteId)) {
    return;
  }
  if (role === 'parent' && await isGuardianForAthlete(request, athleteId)) {
    return;
  }
  if (role === 'coach' && await isVerifiedAssignedCoach(request, athleteId)) {
    return;
  }

  throw forbidden('Not allowed to update this athlete health resource');
}

export async function assertCanReadAthleteMedical(
  request: FastifyRequest,
  athleteId: string,
): Promise<void> {
  await assertCanReadAthleteHealth(request, athleteId);
}

export async function assertCanWriteAthleteMedical(
  request: FastifyRequest,
  athleteId: string,
): Promise<void> {
  const role = getRoleOrThrow(request);
  if (role === 'parent' && await isGuardianForAthlete(request, athleteId)) {
    return;
  }
  throw forbidden('Only a guardian can update medical or emergency records');
}

export async function assertCanCreateSafeguardingIncident(
  request: FastifyRequest,
  athleteId?: string | null,
): Promise<void> {
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
  if (role === 'parent' && await isGuardianForAthlete(request, athleteId)) {
    return;
  }
  if (role === 'coach' && await isVerifiedAssignedCoach(request, athleteId)) {
    return;
  }

  throw forbidden('Not allowed to create safeguarding incident for this athlete');
}

export async function assertCanAccessSafeguardingIncident(
  request: FastifyRequest,
  incident: {
    reportedByUserId: string;
    athleteId: string | null;
  },
): Promise<void> {
  const auth = getAuthOrThrow(request);
  const role = getRoleOrThrow(request);

  if (auth.userId === incident.reportedByUserId) {
    return;
  }
  if (isPrivilegedAdminAuth(auth)) {
    return;
  }
  if (!incident.athleteId) {
    throw forbidden('Not allowed to access this safeguarding incident');
  }
  if (role === 'athlete' && isAthleteSelf(request, incident.athleteId)) {
    return;
  }
  if (role === 'parent' && await isGuardianForAthlete(request, incident.athleteId)) {
    return;
  }
  if (role === 'coach' && await isVerifiedAssignedCoach(request, incident.athleteId)) {
    return;
  }

  throw forbidden('Not allowed to access this safeguarding incident');
}
