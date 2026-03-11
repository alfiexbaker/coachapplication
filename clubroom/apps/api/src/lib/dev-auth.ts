import crypto from 'node:crypto';
import { badRequest, forbidden, unauthorized } from './http-errors.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const DEV_TOKEN_PREFIX = 'clubroom_dev_';
const ACCESS_TTL_MS = 60 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;

const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

type AccountType = 'COACH' | 'PARENT' | 'ATHLETE';
type AppRole = 'COACH' | 'USER' | 'ADMIN';

interface SessionTokenPayload {
  kind: 'access' | 'refresh';
  userId: string;
  roles: string[];
  sessionId: string;
  exp: number;
}

export interface DevSessionContext {
  userId: string;
  roles: string[];
  sessionId: string;
  exp: number;
}

export interface ApiUserProfile {
  id: string;
  email: string;
  phone?: string;
  accountType: AccountType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  photoUrl?: string;
  addressLine?: string;
  city?: string;
  postcode?: string;
  country?: string;
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  position?: string;
  sport?: string;
  goals?: string[];
  childrenCount?: number;
  children?: Array<{
    childId: string;
    childName: string;
    relationshipType: 'PARENT_CHILD' | 'GUARDIAN';
    addedAt: string;
  }>;
  hasChildren?: boolean;
  isOrganization?: boolean;
  organizationName?: string;
  certifications?: string[];
  yearsExperience?: number;
  specializations?: string[];
  bio?: string;
  hourlyRate?: number;
  isVerified: boolean;
  isLive?: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
  appRole: AppRole;
}

export interface DevAuthLoginResult {
  user: ApiUserProfile;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
  };
}

function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
  const raw = (fullName ?? '').trim();
  if (!raw) {
    return { firstName: 'Clubroom', lastName: 'User' };
  }
  const parts = raw.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'User' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function inferAccountType(roles: string[]): AccountType {
  if (roles.includes('coach') || roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'COACH';
  }
  if (roles.includes('athlete')) {
    return 'ATHLETE';
  }
  return 'PARENT';
}

function inferAppRole(roles: string[], accountType: AccountType): AppRole {
  if (roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'ADMIN';
  }
  if (accountType === 'COACH') {
    return 'COACH';
  }
  return 'USER';
}

function expectedPasswordForRoles(roles: string[]): string {
  if (roles.includes('club_admin') || roles.includes('security_admin')) {
    return 'admin';
  }
  if (roles.includes('coach')) {
    return 'coach';
  }
  return 'user';
}

function encodeToken(payload: SessionTokenPayload): string {
  return `${DEV_TOKEN_PREFIX}${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
}

function decodeToken(token: string): SessionTokenPayload | null {
  if (!token.startsWith(DEV_TOKEN_PREFIX)) {
    return null;
  }

  try {
    const raw = token.slice(DEV_TOKEN_PREFIX.length);
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as SessionTokenPayload;
    if (!decoded || !decoded.userId || !Array.isArray(decoded.roles) || !decoded.sessionId) {
      return null;
    }
    if (decoded.kind !== 'access' && decoded.kind !== 'refresh') {
      return null;
    }
    if (typeof decoded.exp !== 'number' || decoded.exp <= Date.now()) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

function createSessionTokens(userId: string, roles: string[], sessionId = newId('ses')) {
  const accessExp = Date.now() + ACCESS_TTL_MS;
  const refreshExp = Date.now() + REFRESH_TTL_MS;

  return {
    accessToken: encodeToken({ kind: 'access', userId, roles, sessionId, exp: accessExp }),
    refreshToken: encodeToken({ kind: 'refresh', userId, roles, sessionId, exp: refreshExp }),
    expiresAt: accessExp,
    sessionId,
  };
}

function findRoleRows(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId)
    .map((row) => asString(row.role))
    .filter((role): role is string => Boolean(role));
}

function findUserByEmail(tables: SeedTables, email: string): SeedRow | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  return asRows(tables.users).find((row) => asString(row.email)?.toLowerCase() === normalizedEmail);
}

function findUserProfileRow(tables: SeedTables, userId: string): SeedRow | undefined {
  return asRows(tables.userProfiles).find((row) => asString(row.userId) === userId);
}

function findCoachProfileRow(tables: SeedTables, userId: string): SeedRow | undefined {
  return asRows(tables.coachProfiles).find((row) => asString(row.userId) === userId);
}

function normalizeChildRelationshipType(value: unknown): 'PARENT_CHILD' | 'GUARDIAN' {
  return typeof value === 'string' && value.toUpperCase() === 'GUARDIAN'
    ? 'GUARDIAN'
    : 'PARENT_CHILD';
}

function buildChildren(tables: SeedTables, userId: string) {
  const athletes = asRows(tables.athletes);
  return asRows(tables.guardianChildLinks)
    .filter((row) => asString(row.guardianUserId) === userId)
    .map((row) => {
      const athleteId = asString(row.athleteId) ?? '';
      const athlete = athletes.find((candidate) => asString(candidate.id) === athleteId);
      return {
        childId: athleteId,
        childName: asString(athlete?.displayName) ?? 'Child',
        relationshipType: normalizeChildRelationshipType(row.relationshipType),
        addedAt: asString(row.createdAt) ?? isoNow(),
      };
    });
}

export function buildApiUserProfile(tables: SeedTables, userId: string): ApiUserProfile {
  const user = asRows(tables.users).find((row) => asString(row.id) === userId);
  if (!user) {
    throw forbidden(`Authenticated user ${userId} does not exist`);
  }

  const userProfile = findUserProfileRow(tables, userId) ?? {};
  const coachProfile = findCoachProfileRow(tables, userId) ?? {};
  const roles = findRoleRows(tables, userId);
  const accountType = inferAccountType(roles);
  const appRole = inferAppRole(roles, accountType);
  const name = splitName(asString(user.name));
  const children = buildChildren(tables, userId);
  const phone = asString(userProfile.phoneE164);
  const createdAt = asString(userProfile.createdAt) ?? isoNow();
  const updatedAt = asString(userProfile.updatedAt) ?? createdAt;

  return {
    id: userId,
    email: asString(user.email) ?? '',
    phone,
    accountType,
    firstName: name.firstName,
    lastName: name.lastName,
    dateOfBirth: asString(userProfile.dateOfBirth),
    photoUrl: asString(user.avatarUrl),
    addressLine: asString(userProfile.addressLine),
    city: asString(userProfile.city),
    postcode: asString(userProfile.postcode),
    country: asString(userProfile.country),
    skillLevel: asString(userProfile.skillLevel) as ApiUserProfile['skillLevel'],
    position: asString(userProfile.position),
    sport: asString(userProfile.sport),
    goals: Array.isArray(userProfile.goals) ? (userProfile.goals as string[]) : undefined,
    childrenCount: children.length > 0 ? children.length : undefined,
    children: children.length > 0 ? children : undefined,
    hasChildren: children.length > 0,
    isOrganization: asBoolean(userProfile.isOrganization) ?? false,
    organizationName: asString(userProfile.organizationName),
    certifications: Array.isArray(coachProfile.qualifications)
      ? (coachProfile.qualifications as string[])
      : undefined,
    yearsExperience: asNumber(coachProfile.yearsExperience),
    specializations: Array.isArray(coachProfile.specialties)
      ? (coachProfile.specialties as string[])
      : undefined,
    bio: asString(coachProfile.bio) ?? asString(userProfile.bio),
    hourlyRate:
      typeof coachProfile.sessionRateMinor === 'number'
        ? Math.round((coachProfile.sessionRateMinor as number) / 100)
        : undefined,
    isVerified: asBoolean(user.isVerified) ?? asBoolean(coachProfile.dbsChecked) ?? false,
    isLive: asBoolean(user.isLive),
    onboardingComplete: asBoolean(user.onboardingComplete) ?? true,
    createdAt,
    updatedAt,
    roles,
    appRole,
  };
}

export function resolveDevSessionFromBearerToken(token: string): DevSessionContext | null {
  const decoded = decodeToken(token);
  if (!decoded || decoded.kind !== 'access') {
    return null;
  }

  return {
    userId: decoded.userId,
    roles: decoded.roles,
    sessionId: decoded.sessionId,
    exp: decoded.exp,
  };
}

export function createDevSessionByEmail(email: string, password: string): DevAuthLoginResult {
  const store = getMarketplaceSeedStore();
  const user = findUserByEmail(store.tables, email);
  if (!user) {
    throw unauthorized('Invalid email or password');
  }

  const userId = asString(user.id);
  if (!userId) {
    throw unauthorized('Invalid email or password');
  }

  const roles = findRoleRows(store.tables, userId);
  if (roles.length === 0) {
    throw unauthorized('Invalid email or password');
  }

  if (password !== expectedPasswordForRoles(roles)) {
    throw unauthorized('Invalid email or password');
  }

  const tokens = createSessionTokens(userId, roles);
  return {
    user: buildApiUserProfile(store.tables, userId),
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  };
}

export function refreshDevSession(refreshToken: string) {
  const decoded = decodeToken(refreshToken);
  if (!decoded || decoded.kind !== 'refresh') {
    throw unauthorized('Invalid refresh token');
  }

  const tokens = createSessionTokens(decoded.userId, decoded.roles, decoded.sessionId);
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: tokens.expiresAt,
  };
}

export function getDevSessionUser(userId: string): ApiUserProfile {
  return buildApiUserProfile(getMarketplaceSeedStore().tables, userId);
}

type ApiUserProfileUpdate = Omit<Partial<ApiUserProfile>, 'photoUrl'> & {
  photoUrl?: string | null;
};

export function updateDevSessionUser(userId: string, updates: ApiUserProfileUpdate): ApiUserProfile {
  const store = getMarketplaceSeedStore();
  const tables = store.tables;
  const users = asRows(tables.users);
  const userProfiles = asRows(tables.userProfiles);
  const coachProfiles = asRows(tables.coachProfiles);

  const user = users.find((row) => asString(row.id) === userId);
  if (!user) {
    throw forbidden(`Authenticated user ${userId} does not exist`);
  }

  let profile = userProfiles.find((row) => asString(row.userId) === userId);
  if (!profile) {
    profile = {
      userId,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    userProfiles.push(profile);
  }

  const fullName = [updates.firstName, updates.lastName].filter(Boolean).join(' ').trim();
  if (fullName) {
    user.name = fullName;
  }
  if (updates.email) user.email = updates.email.toLowerCase();
  if (updates.photoUrl !== undefined) user.avatarUrl = updates.photoUrl ?? null;
  if (updates.isVerified !== undefined) user.isVerified = updates.isVerified;
  if (updates.isLive !== undefined) user.isLive = updates.isLive;
  if (updates.onboardingComplete !== undefined) user.onboardingComplete = updates.onboardingComplete;

  if (updates.phone !== undefined) profile.phoneE164 = updates.phone;
  if (updates.dateOfBirth !== undefined) profile.dateOfBirth = updates.dateOfBirth;
  if (updates.addressLine !== undefined) profile.addressLine = updates.addressLine;
  if (updates.city !== undefined) profile.city = updates.city;
  if (updates.postcode !== undefined) profile.postcode = updates.postcode;
  if (updates.country !== undefined) profile.country = updates.country;
  if (updates.skillLevel !== undefined) profile.skillLevel = updates.skillLevel;
  if (updates.position !== undefined) profile.position = updates.position;
  if (updates.sport !== undefined) profile.sport = updates.sport;
  if (updates.goals !== undefined) profile.goals = updates.goals;
  if (updates.isOrganization !== undefined) profile.isOrganization = updates.isOrganization;
  if (updates.organizationName !== undefined) profile.organizationName = updates.organizationName;
  if (updates.bio !== undefined) profile.bio = updates.bio;
  profile.updatedAt = isoNow();

  const roles = findRoleRows(tables, userId);
  const isCoachLike = roles.includes('coach') || roles.includes('club_admin');
  if (isCoachLike) {
    let coachProfile = coachProfiles.find((row) => asString(row.userId) === userId);
    if (!coachProfile) {
      coachProfile = {
        userId,
        createdAt: isoNow(),
        updatedAt: isoNow(),
      };
      coachProfiles.push(coachProfile);
    }

    if (updates.specializations !== undefined) coachProfile.specialties = updates.specializations;
    if (updates.certifications !== undefined) coachProfile.qualifications = updates.certifications;
    if (updates.yearsExperience !== undefined) coachProfile.yearsExperience = updates.yearsExperience;
    if (updates.bio !== undefined) coachProfile.bio = updates.bio;
    if (updates.hourlyRate !== undefined) {
      coachProfile.sessionRateMinor = Math.max(0, Math.round(updates.hourlyRate * 100));
    }
    coachProfile.updatedAt = isoNow();
  }

  return buildApiUserProfile(tables, userId);
}

export function registerDevSessionUser(input: {
  email: string;
  password: string;
  phone?: string;
  accountType: AccountType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  skillLevel?: string;
  position?: string;
  sport?: string;
  isOrganization?: boolean;
  organizationName?: string;
}): DevAuthLoginResult {
  const store = getMarketplaceSeedStore();
  const tables = store.tables;
  const normalizedEmail = input.email.trim().toLowerCase();
  const existing = findUserByEmail(tables, normalizedEmail);
  if (existing) {
    throw badRequest('An account with this email already exists');
  }

  const userId = newId('usr');
  const role =
    input.accountType === 'COACH' ? 'coach' : input.accountType === 'ATHLETE' ? 'athlete' : 'parent';
  const now = isoNow();

  asRows(tables.users).push({
    id: userId,
    email: normalizedEmail,
    name: `${input.firstName} ${input.lastName}`.trim(),
    avatarUrl: null,
    locale: 'en-GB',
    timeZone: 'Europe/London',
    isVerified: false,
    onboardingComplete: false,
    createdAt: now,
    updatedAt: now,
  });

  asRows(tables.userProfiles).push({
    userId,
    phoneE164: input.phone,
    dateOfBirth: input.dateOfBirth,
    postcode: '',
    country: 'GB',
    skillLevel: input.skillLevel,
    position: input.position,
    sport: input.sport,
    isOrganization: input.isOrganization ?? false,
    organizationName: input.organizationName,
    createdAt: now,
    updatedAt: now,
  });

  asRows(tables.userRoleMemberships).push({
    id: newId('urm'),
    userId,
    role,
    createdAt: now,
    updatedAt: now,
  });

  if (input.accountType === 'COACH') {
    asRows(tables.coachProfiles).push({
      userId,
      bio: '',
      qualifications: [],
      specialties: [],
      sessionRateMinor: 0,
      yearsExperience: 0,
      dbsChecked: false,
      currency: 'GBP',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });
  }

  if (input.accountType === 'ATHLETE') {
    asRows(tables.athletes).push({
      id: newId('ath'),
      userId,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
      dateOfBirth: input.dateOfBirth ?? null,
      avatarUrl: null,
    });
  }

  const tokens = createSessionTokens(userId, [role]);
  return {
    user: buildApiUserProfile(tables, userId),
    tokens: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
    },
  };
}
