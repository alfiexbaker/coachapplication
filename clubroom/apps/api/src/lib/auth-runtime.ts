import crypto from 'node:crypto';
import { env } from '@clubroom/config';
import { getApiDataBackend } from './data-backend.js';
import { getDbFixtureStore } from './db-fixture-store.js';
import { badRequest, forbidden, notFound, serviceUnavailable, unauthorized } from './http-errors.js';
import { getMarketplaceSeedStore } from './marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from './prisma-runtime.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;

const ACCESS_TOKEN_TTL_SEC = 15 * 60;
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 60 * 60;
const DEFAULT_DEV_JWT_SECRET = 'clubroom-dev-jwt-secret-change-me';
const CLOCK_SKEW_SEC = 30;

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const asNumber = (value: unknown): number | undefined => (typeof value === 'number' ? value : undefined);
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;

type AccountType = 'COACH' | 'PARENT' | 'ATHLETE';
type AppRole = 'COACH' | 'USER' | 'ADMIN';
type JwtTokenUse = 'access' | 'refresh';

interface JwtClaims {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  jti: string;
  roles: string[];
  sid: string;
  sub: string;
  token_epoch: number;
  token_use: JwtTokenUse;
  uid: string;
}

interface SessionRecord {
  id: string;
  userId: string;
  userDeviceId: string | null;
  jwtId: string;
  refreshTokenId: string;
  issuedAt: string;
  expiresAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  userAgent: string | null;
}

interface DeviceRecord {
  id: string;
  userId: string;
  platform: string;
  deviceLabel: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
}

interface AuthIdentity {
  authProviderSubject: string;
  email: string;
  id: string;
  roles: string[];
  tokenEpoch: number;
}

interface AuthUserRecord {
  authProvider: string;
  authProviderSubject: string;
  email: string;
  id: string;
  name: string;
  tokenEpoch: number;
}

export interface AuthContext {
  exp: number;
  roles: string[];
  sessionId?: string;
  provider: 'local' | 'oidc';
  subject: string;
  userId: string;
}

interface ExternalJwtClaims {
  aud: string | string[];
  exp: number;
  iat?: number;
  iss: string;
  sid?: string;
  sub: string;
}

type VerifiedAccessToken =
  | {
      provider: 'local';
      claims: JwtClaims;
    }
  | {
      provider: 'oidc';
      claims: ExternalJwtClaims;
    };

interface JwkKey {
  alg?: string;
  e?: string;
  kid?: string;
  kty?: string;
  n?: string;
  use?: string;
}

export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
  refreshToken: string;
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

export interface AuthLoginResult {
  user: ApiUserProfile;
  tokens: AuthTokens;
}

export interface AuthSessionSummary {
  id: string;
  current: boolean;
  issuedAt: string | null;
  expiresAt: string | null;
  lastSeenAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  device: {
    id: string | null;
    label: string | null;
    platform: string | null;
    lastSeenAt: string | null;
    revokedAt: string | null;
  } | null;
}

interface RegisterInput {
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
}

type ApiUserProfileUpdate = Omit<Partial<ApiUserProfile>, 'photoUrl'> & {
  photoUrl?: string | null;
};

interface MemoryPasswordCredential {
  passwordHash: string;
  userId: string;
}

interface MemoryDeviceRecord extends DeviceRecord {
  createdAt: string;
  updatedAt: string;
}

interface MemorySessionRecord extends SessionRecord {
  createdAt: string;
  ipHash: string | null;
  updatedAt: string;
}

const memoryPasswordCredentials = new Map<string, MemoryPasswordCredential>();
const memoryDevices = new Map<string, MemoryDeviceRecord>();
const memorySessions = new Map<string, MemorySessionRecord>();

export function resetAuthRuntimeForTests(): void {
  memoryPasswordCredentials.clear();
  memoryDevices.clear();
  memorySessions.clear();
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

function isSeedLikeRuntime(): boolean {
  return getApiDataBackend() === 'seed' || shouldUseDbFixtureFallback();
}

function getJwtSecret(): Buffer {
  if (env.API_JWT_SECRET?.trim()) {
    return Buffer.from(env.API_JWT_SECRET.trim(), 'utf8');
  }

  if (env.NODE_ENV === 'production') {
    throw serviceUnavailable('API_JWT_SECRET is required for production JWT auth');
  }

  return Buffer.from(DEFAULT_DEV_JWT_SECRET, 'utf8');
}

function getLocalJwtIssuer(): string {
  return env.API_JWT_ISSUER ?? 'https://api.clubroom.local';
}

function getExternalJwtIssuer(): string | null {
  return env.AUTH0_ISSUER_URL?.trim() || null;
}

function getJwtAudience(): string {
  return env.API_JWT_AUDIENCE ?? env.AUTH0_AUDIENCE ?? 'clubroom-mobile';
}

function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

function createJwtSignature(input: string): Buffer {
  return crypto.createHmac('sha256', getJwtSecret()).update(input).digest();
}

function parseJwtJson(segment: string): Record<string, unknown> {
  try {
    return JSON.parse(decodeBase64Url(segment).toString('utf8')) as Record<string, unknown>;
  } catch {
    throw unauthorized('Invalid JWT payload');
  }
}

function parseJwtParts(token: string): [string, string, string] {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw unauthorized('Invalid JWT structure');
  }
  return parts as [string, string, string];
}

let externalJwksCache: { issuer: string; keys: JwkKey[]; expiresAt: number } | null = null;

function getJwksUrl(issuer: string): URL {
  const normalizedIssuer = issuer.endsWith('/') ? issuer : `${issuer}/`;
  return new URL('.well-known/jwks.json', normalizedIssuer);
}

async function fetchExternalJwkSet(issuer: string): Promise<JwkKey[]> {
  const nowMs = Date.now();
  if (externalJwksCache && externalJwksCache.issuer === issuer && externalJwksCache.expiresAt > nowMs) {
    return externalJwksCache.keys;
  }

  const response = await fetch(getJwksUrl(issuer));
  if (!response.ok) {
    throw unauthorized('Unable to load external JWKS');
  }

  const payload = (await response.json()) as { keys?: unknown };
  const keys = Array.isArray(payload.keys)
    ? payload.keys.filter((candidate): candidate is JwkKey => Boolean(candidate && typeof candidate === 'object'))
    : [];
  if (keys.length === 0) {
    throw unauthorized('External JWKS did not contain any keys');
  }

  const cacheControl = response.headers.get('cache-control') ?? '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number.parseInt(maxAgeMatch[1] ?? '300', 10) : 300;
  externalJwksCache = {
    issuer,
    keys,
    expiresAt: nowMs + maxAgeSec * 1000,
  };
  return keys;
}

function signJwt(params: Omit<JwtClaims, 'aud' | 'exp' | 'iat' | 'iss'> & { expiresInSec: number }): string {
  const nowSec = Math.floor(Date.now() / 1000);
  const payload: JwtClaims = {
    aud: getJwtAudience(),
    exp: nowSec + params.expiresInSec,
    iat: nowSec,
    iss: getLocalJwtIssuer(),
    jti: params.jti,
    roles: params.roles,
    sid: params.sid,
    sub: params.sub,
    token_epoch: params.token_epoch,
    token_use: params.token_use,
    uid: params.uid,
  };
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = encodeBase64Url(createJwtSignature(`${encodedHeader}.${encodedPayload}`));
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function ensureStringClaim(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw unauthorized(`JWT ${label} claim is required`);
  }
  return value;
}

function verifyLocalJwt(token: string, expectedTokenUse: JwtTokenUse): JwtClaims {
  const [encodedHeader, encodedPayload, encodedSignature] = parseJwtParts(token);
  const header = parseJwtJson(encodedHeader);
  if (header.alg !== 'HS256' || header.typ !== 'JWT') {
    throw unauthorized('Unsupported JWT header');
  }

  const expectedSignature = createJwtSignature(`${encodedHeader}.${encodedPayload}`);
  const actualSignature = decodeBase64Url(encodedSignature);
  if (
    expectedSignature.length !== actualSignature.length
    || !crypto.timingSafeEqual(expectedSignature, actualSignature)
  ) {
    throw unauthorized('Invalid JWT signature');
  }

  const payload = parseJwtJson(encodedPayload);
  const tokenUse = payload.token_use;
  if (tokenUse !== 'access' && tokenUse !== 'refresh') {
    throw unauthorized('JWT token use is invalid');
  }

  const claims: JwtClaims = {
    aud: ensureStringClaim(payload.aud, 'aud'),
    exp: typeof payload.exp === 'number' ? payload.exp : NaN,
    iat: typeof payload.iat === 'number' ? payload.iat : NaN,
    iss: ensureStringClaim(payload.iss, 'iss'),
    jti: ensureStringClaim(payload.jti, 'jti'),
    roles: Array.isArray(payload.roles)
      ? payload.roles.map((value) => String(value)).filter(Boolean)
      : [],
    sid: ensureStringClaim(payload.sid, 'sid'),
    sub: ensureStringClaim(payload.sub, 'sub'),
    token_epoch: typeof payload.token_epoch === 'number' ? payload.token_epoch : NaN,
    token_use: tokenUse,
    uid: ensureStringClaim(payload.uid, 'uid'),
  };

  if (claims.iss !== getLocalJwtIssuer()) {
    throw unauthorized('JWT issuer is invalid');
  }
  if (claims.aud !== getJwtAudience()) {
    throw unauthorized('JWT audience is invalid');
  }
  if (!Number.isFinite(claims.iat) || !Number.isFinite(claims.exp) || !Number.isFinite(claims.token_epoch)) {
    throw unauthorized('JWT timing claims are invalid');
  }
  if (claims.token_use !== expectedTokenUse) {
    throw unauthorized('JWT token use is invalid');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (claims.iat > nowSec + CLOCK_SKEW_SEC) {
    throw unauthorized('JWT issued-at claim is invalid');
  }
  if (claims.exp <= nowSec - CLOCK_SKEW_SEC) {
    throw unauthorized('JWT has expired');
  }

  return claims;
}

function ensureBearerExternalClaim(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw unauthorized(`JWT ${label} claim is required`);
  }
  return value.trim();
}

function ensureAudienceClaim(value: unknown): string | string[] {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value)) {
    const audiences = value.map((entry) => String(entry).trim()).filter(Boolean);
    if (audiences.length > 0) {
      return audiences;
    }
  }
  throw unauthorized('JWT aud claim is required');
}

function getSigningInput(token: string): { header: Record<string, unknown>; payload: Record<string, unknown>; signedValue: string; signature: Buffer } {
  const [encodedHeader, encodedPayload, encodedSignature] = parseJwtParts(token);
  return {
    header: parseJwtJson(encodedHeader),
    payload: parseJwtJson(encodedPayload),
    signedValue: `${encodedHeader}.${encodedPayload}`,
    signature: decodeBase64Url(encodedSignature),
  };
}

async function verifyExternalAccessToken(token: string): Promise<ExternalJwtClaims> {
  const issuer = getExternalJwtIssuer();
  if (!issuer) {
    throw unauthorized('External JWT issuer is not configured');
  }

  const { header, payload, signedValue, signature } = getSigningInput(token);
  const algorithm = ensureStringClaim(header.alg, 'alg');
  if (algorithm !== 'RS256') {
    throw unauthorized('Unsupported external JWT algorithm');
  }

  const keyId = ensureStringClaim(header.kid, 'kid');
  const jwks = await fetchExternalJwkSet(issuer);
  const jwk = jwks.find((candidate) => candidate.kid === keyId);
  if (!jwk || jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
    throw unauthorized('Matching external JWKS key was not found');
  }

  const publicKey = crypto.createPublicKey({
    format: 'jwk',
    key: {
      kty: jwk.kty,
      n: jwk.n,
      e: jwk.e,
    },
  });

  const verified = crypto.verify('RSA-SHA256', Buffer.from(signedValue), publicKey, signature);
  if (!verified) {
    throw unauthorized('Invalid external JWT signature');
  }

  const claims: ExternalJwtClaims = {
    aud: ensureAudienceClaim(payload.aud),
    exp: typeof payload.exp === 'number' ? payload.exp : NaN,
    iat: typeof payload.iat === 'number' ? payload.iat : undefined,
    iss: ensureBearerExternalClaim(payload.iss, 'iss'),
    sid: typeof payload.sid === 'string' && payload.sid.trim() ? payload.sid : undefined,
    sub: ensureBearerExternalClaim(payload.sub, 'sub'),
  };

  if (claims.iss !== issuer) {
    throw unauthorized('JWT issuer is invalid');
  }

  const expectedAudience = getJwtAudience();
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(expectedAudience)) {
    throw unauthorized('JWT audience is invalid');
  }
  if (!Number.isFinite(claims.exp)) {
    throw unauthorized('JWT expiry claim is invalid');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.iat === 'number' && claims.iat > nowSec + CLOCK_SKEW_SEC) {
    throw unauthorized('JWT issued-at claim is invalid');
  }
  if (claims.exp <= nowSec - CLOCK_SKEW_SEC) {
    throw unauthorized('JWT has expired');
  }

  return claims;
}

async function verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
  const { header, payload } = getSigningInput(token);
  if (header.alg === 'HS256' && payload.iss === getLocalJwtIssuer()) {
    return {
      provider: 'local',
      claims: verifyLocalJwt(token, 'access'),
    };
  }

  return {
    provider: 'oidc',
    claims: await verifyExternalAccessToken(token),
  };
}

function randomHex(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function hashPassword(password: string): string {
  const salt = randomHex(16);
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPasswordHash(password: string, passwordHash: string): boolean {
  const [algorithm, salt, expectedHash] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expectedHash) {
    return false;
  }

  const actualHash = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(expectedHash, 'hex');
  return expected.length === actualHash.length && crypto.timingSafeEqual(expected, actualHash);
}

function normalizeChildRelationshipType(value: unknown): 'PARENT_CHILD' | 'GUARDIAN' {
  return typeof value === 'string' && value.toUpperCase() === 'GUARDIAN'
    ? 'GUARDIAN'
    : 'PARENT_CHILD';
}

function findRoleRows(tables: SeedTables, userId: string): string[] {
  return asRows(tables.userRoleMemberships)
    .filter((row) => asString(row.userId) === userId && asString(row.revokedAt) == null)
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

function buildApiUserProfileFromTables(tables: SeedTables, userId: string): ApiUserProfile {
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
  const createdAt = asString(user.createdAt) ?? asString(userProfile.createdAt) ?? isoNow();
  const updatedAt = asString(user.updatedAt) ?? asString(userProfile.updatedAt) ?? createdAt;

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
    onboardingComplete: asBoolean(user.onboardingComplete) ?? false,
    createdAt,
    updatedAt,
    roles,
    appRole,
  };
}

function getActiveTables(): SeedTables | null {
  if (getApiDataBackend() === 'seed') {
    return getMarketplaceSeedStore().tables;
  }
  if (shouldUseDbFixtureFallback()) {
    return getDbFixtureStore().tables;
  }
  return null;
}

function loadAuthIdentityFromTables(tables: SeedTables, user: SeedRow): AuthIdentity {
  const userId = asString(user.id);
  if (!userId) {
    throw unauthorized('User id is required');
  }

  return {
    authProviderSubject: asString(user.authProviderSubject) ?? `clubroom|${userId}`,
    email: asString(user.email) ?? '',
    id: userId,
    roles: findRoleRows(tables, userId),
    tokenEpoch: asNumber(user.tokenEpoch) ?? 0,
  };
}

async function loadAuthIdentityByEmail(email: string): Promise<AuthIdentity | null> {
  const tables = getActiveTables();
  if (tables) {
    const user = findUserByEmail(tables, email);
    return user ? loadAuthIdentityFromTables(tables, user) : null;
  }

  const prisma = getPrismaClientOrThrow();
  const user = await prisma.user.findFirst({
    where: { email: email.trim().toLowerCase() },
    include: {
      roles: {
        where: { revokedAt: null, active: true },
      },
    },
  });
  if (!user || !user.email) {
    return null;
  }

  return {
    authProviderSubject: user.authProviderSubject,
    email: user.email,
    id: user.id,
    roles: user.roles.map((role) => role.role),
    tokenEpoch: user.tokenEpoch,
  };
}

async function loadAuthIdentityByUserId(userId: string): Promise<AuthIdentity | null> {
  const tables = getActiveTables();
  if (tables) {
    const user = asRows(tables.users).find((row) => asString(row.id) === userId);
    return user ? loadAuthIdentityFromTables(tables, user) : null;
  }

  const prisma = getPrismaClientOrThrow();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      roles: {
        where: { revokedAt: null, active: true },
      },
    },
  });
  if (!user || !user.email) {
    return null;
  }

  return {
    authProviderSubject: user.authProviderSubject,
    email: user.email,
    id: user.id,
    roles: user.roles.map((role) => role.role),
    tokenEpoch: user.tokenEpoch,
  };
}

async function loadAuthIdentityBySubject(subject: string): Promise<AuthIdentity | null> {
  const tables = getActiveTables();
  if (tables) {
    const user = asRows(tables.users).find((row) => asString(row.authProviderSubject) === subject);
    return user ? loadAuthIdentityFromTables(tables, user) : null;
  }

  const prisma = getPrismaClientOrThrow();
  const user = await prisma.user.findFirst({
    where: { authProviderSubject: subject },
    include: {
      roles: {
        where: { revokedAt: null, active: true },
      },
    },
  });
  if (!user || !user.email) {
    return null;
  }

  return {
    authProviderSubject: user.authProviderSubject,
    email: user.email,
    id: user.id,
    roles: user.roles.map((role) => role.role),
    tokenEpoch: user.tokenEpoch,
  };
}

async function loadAuthUserRecordById(userId: string): Promise<AuthUserRecord> {
  const tables = getActiveTables();
  if (tables) {
    const user = asRows(tables.users).find((row) => asString(row.id) === userId);
    if (!user) {
      throw notFound('User not found', { userId });
    }
    return {
      authProvider: asString(user.authProvider) ?? 'clubroom',
      authProviderSubject: asString(user.authProviderSubject) ?? `clubroom|${userId}`,
      email: asString(user.email) ?? '',
      id: userId,
      name: asString(user.name) ?? 'Clubroom User',
      tokenEpoch: asNumber(user.tokenEpoch) ?? 0,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.email) {
    throw notFound('User not found', { userId });
  }
  return {
    authProvider: user.authProvider,
    authProviderSubject: user.authProviderSubject,
    email: user.email,
    id: user.id,
    name: user.name,
    tokenEpoch: user.tokenEpoch,
  };
}

async function getPasswordCredentialHash(userId: string): Promise<string | null> {
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    return memoryPasswordCredentials.get(userId)?.passwordHash ?? null;
  }

  const prisma = getPrismaClientOrThrow();
  const credential = await prisma.passwordCredential.findUnique({ where: { userId } });
  return credential?.passwordHash ?? null;
}

async function setPasswordCredentialHash(userId: string, passwordHash: string): Promise<void> {
  if (getApiDataBackend() !== 'db' || shouldUseDbFixtureFallback()) {
    memoryPasswordCredentials.set(userId, { userId, passwordHash });
    return;
  }

  const prisma = getPrismaClientOrThrow();
  await prisma.passwordCredential.upsert({
    where: { userId },
    create: { userId, passwordHash },
    update: { passwordHash },
  });
}

async function verifyUserPassword(identity: AuthIdentity, password: string): Promise<boolean> {
  const storedHash = await getPasswordCredentialHash(identity.id);
  if (storedHash) {
    return verifyPasswordHash(password, storedHash);
  }

  if (!isSeedLikeRuntime()) {
    return false;
  }

  return password === expectedPasswordForRoles(identity.roles);
}

function normalizeUserAgent(userAgent: string | undefined): string {
  const trimmed = (userAgent ?? '').trim();
  return trimmed || 'ClubroomApi/1.0';
}

function inferDevicePlatform(userAgent: string): string {
  const normalized = userAgent.toLowerCase();
  if (normalized.includes('ios')) return 'ios';
  if (normalized.includes('android')) return 'android';
  if (normalized.includes('mac os') || normalized.includes('windows') || normalized.includes('linux')) {
    return 'web';
  }
  return 'api';
}

function buildSessionSummary(params: {
  currentSessionId?: string | null;
  device?: DeviceRecord | null;
  session: SessionRecord;
}): AuthSessionSummary {
  const { currentSessionId, device, session } = params;
  return {
    id: session.id,
    current: Boolean(currentSessionId && session.id === currentSessionId),
    issuedAt: session.issuedAt,
    expiresAt: session.expiresAt,
    lastSeenAt: session.lastSeenAt,
    revokedAt: session.revokedAt,
    revokeReason: session.revokeReason,
    device: device
      ? {
          id: device.id,
          label: device.deviceLabel,
          platform: device.platform,
          lastSeenAt: device.lastSeenAt,
          revokedAt: device.revokedAt,
        }
      : null,
  };
}

async function createSessionRecord(userId: string, userAgent?: string): Promise<SessionRecord> {
  const normalizedUserAgent = normalizeUserAgent(userAgent);
  const now = new Date();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000).toISOString();
  const deviceLabel = normalizedUserAgent.slice(0, 120);
  const platform = inferDevicePlatform(normalizedUserAgent);

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const device = await prisma.userDevice.create({
      data: {
        id: newId('udv'),
        userId,
        platform,
        deviceLabel,
        lastSeenAt: now,
      },
    });
    const session = await prisma.authSession.create({
      data: {
        id: newId('ses'),
        userId,
        userDeviceId: device.id,
        jwtId: newId('jwt'),
        refreshTokenId: newId('rfr'),
        issuedAt: now,
        expiresAt: new Date(expiresAt),
        lastSeenAt: now,
        ipHash: randomHex(16),
        userAgent: normalizedUserAgent,
      },
    });
    return {
      id: session.id,
      userId: session.userId,
      userDeviceId: session.userDeviceId ?? null,
      jwtId: session.jwtId ?? '',
      refreshTokenId: session.refreshTokenId ?? '',
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString() ?? null,
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
      revokedAt: session.revokedAt?.toISOString() ?? null,
      revokeReason: session.revokeReason ?? null,
      userAgent: session.userAgent ?? null,
    };
  }

  const deviceId = newId('udv');
  const sessionId = newId('ses');
  const device: MemoryDeviceRecord = {
    id: deviceId,
    userId,
    platform,
    deviceLabel,
    lastSeenAt: nowIso,
    revokedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  const session: MemorySessionRecord = {
    id: sessionId,
    userId,
    userDeviceId: deviceId,
    jwtId: newId('jwt'),
    refreshTokenId: newId('rfr'),
    issuedAt: nowIso,
    expiresAt,
    lastSeenAt: nowIso,
    revokedAt: null,
    revokeReason: null,
    userAgent: normalizedUserAgent,
    createdAt: nowIso,
    updatedAt: nowIso,
    ipHash: randomHex(16),
  };
  memoryDevices.set(deviceId, device);
  memorySessions.set(sessionId, session);
  return session;
}

async function getSessionRecordById(sessionId: string): Promise<SessionRecord | null> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const session = await prisma.authSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return null;
    }
    return {
      id: session.id,
      userId: session.userId,
      userDeviceId: session.userDeviceId ?? null,
      jwtId: session.jwtId ?? '',
      refreshTokenId: session.refreshTokenId ?? '',
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString() ?? null,
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
      revokedAt: session.revokedAt?.toISOString() ?? null,
      revokeReason: session.revokeReason ?? null,
      userAgent: session.userAgent ?? null,
    };
  }

  return memorySessions.get(sessionId) ?? null;
}

async function getSessionRecordByRefreshTokenId(refreshTokenId: string): Promise<SessionRecord | null> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const session = await prisma.authSession.findFirst({
      where: { refreshTokenId },
    });
    if (!session) {
      return null;
    }
    return {
      id: session.id,
      userId: session.userId,
      userDeviceId: session.userDeviceId ?? null,
      jwtId: session.jwtId ?? '',
      refreshTokenId: session.refreshTokenId ?? '',
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString() ?? null,
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
      revokedAt: session.revokedAt?.toISOString() ?? null,
      revokeReason: session.revokeReason ?? null,
      userAgent: session.userAgent ?? null,
    };
  }

  for (const session of memorySessions.values()) {
    if (session.refreshTokenId === refreshTokenId) {
      return session;
    }
  }
  return null;
}

async function rotateSessionRecord(
  sessionId: string,
  userId: string,
  userAgent?: string,
): Promise<SessionRecord> {
  const normalizedUserAgent = normalizeUserAgent(userAgent);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SEC * 1000);

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const session = await prisma.authSession.update({
      where: { id: sessionId },
      data: {
        userId,
        jwtId: newId('jwt'),
        refreshTokenId: newId('rfr'),
        expiresAt,
        lastSeenAt: now,
        userAgent: normalizedUserAgent,
        revokedAt: null,
        revokeReason: null,
      },
    });
    if (session.userDeviceId) {
      await prisma.userDevice.update({
        where: { id: session.userDeviceId },
        data: {
          lastSeenAt: now,
          deviceLabel: normalizedUserAgent.slice(0, 120),
          platform: inferDevicePlatform(normalizedUserAgent),
          revokedAt: null,
        },
      });
    }
    return {
      id: session.id,
      userId: session.userId,
      userDeviceId: session.userDeviceId ?? null,
      jwtId: session.jwtId ?? '',
      refreshTokenId: session.refreshTokenId ?? '',
      issuedAt: session.issuedAt.toISOString(),
      expiresAt: session.expiresAt?.toISOString() ?? null,
      lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
      revokedAt: session.revokedAt?.toISOString() ?? null,
      revokeReason: session.revokeReason ?? null,
      userAgent: session.userAgent ?? null,
    };
  }

  const session = memorySessions.get(sessionId);
  if (!session) {
    throw unauthorized('Session not found');
  }
  const nowIso = now.toISOString();
  session.userId = userId;
  session.jwtId = newId('jwt');
  session.refreshTokenId = newId('rfr');
  session.expiresAt = expiresAt.toISOString();
  session.lastSeenAt = nowIso;
  session.userAgent = normalizedUserAgent;
  session.revokedAt = null;
  session.revokeReason = null;
  session.updatedAt = nowIso;
  if (session.userDeviceId) {
    const device = memoryDevices.get(session.userDeviceId);
    if (device) {
      device.lastSeenAt = nowIso;
      device.deviceLabel = normalizedUserAgent.slice(0, 120);
      device.platform = inferDevicePlatform(normalizedUserAgent);
      device.revokedAt = null;
      device.updatedAt = nowIso;
    }
  }
  return session;
}

async function touchSessionRecord(session: SessionRecord): Promise<void> {
  const now = new Date();
  const nowIso = now.toISOString();
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    await prisma.authSession.update({
      where: { id: session.id },
      data: { lastSeenAt: now },
    });
    if (session.userDeviceId) {
      await prisma.userDevice.update({
        where: { id: session.userDeviceId },
        data: { lastSeenAt: now },
      });
    }
    return;
  }

  const mutableSession = memorySessions.get(session.id);
  if (mutableSession) {
    mutableSession.lastSeenAt = nowIso;
    mutableSession.updatedAt = nowIso;
  }
  if (session.userDeviceId) {
    const device = memoryDevices.get(session.userDeviceId);
    if (device) {
      device.lastSeenAt = nowIso;
      device.updatedAt = nowIso;
    }
  }
}

function isSessionActive(session: SessionRecord | null, userId?: string): session is SessionRecord {
  if (!session) {
    return false;
  }
  if (userId && session.userId !== userId) {
    return false;
  }
  if (session.revokedAt) {
    return false;
  }
  if (session.expiresAt && Date.parse(session.expiresAt) <= Date.now()) {
    return false;
  }
  return true;
}

async function revokeSessionRecord(params: {
  reason: string;
  sessionId: string;
  userId?: string;
}): Promise<SessionRecord> {
  const session = await getSessionRecordById(params.sessionId);
  if (!session) {
    throw unauthorized('Session not found');
  }
  if (params.userId && session.userId !== params.userId) {
    throw unauthorized('Session does not belong to authenticated user');
  }

  const now = new Date();
  const nowIso = now.toISOString();

  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const updated = session.revokedAt
      ? session
      : {
          ...session,
          revokedAt: nowIso,
          revokeReason: params.reason,
        };
    if (!session.revokedAt) {
      await prisma.authSession.update({
        where: { id: session.id },
        data: {
          revokedAt: now,
          revokeReason: params.reason,
        },
      });
    }
    return updated;
  }

  const mutableSession = memorySessions.get(params.sessionId);
  if (!mutableSession) {
    throw unauthorized('Session not found');
  }
  if (!mutableSession.revokedAt) {
    mutableSession.revokedAt = nowIso;
    mutableSession.revokeReason = params.reason;
    mutableSession.updatedAt = nowIso;
  }
  return mutableSession;
}

async function listSessionRecords(
  userId: string,
  currentSessionId?: string | null,
): Promise<AuthSessionSummary[]> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const sessions = await prisma.authSession.findMany({
      where: { userId },
      include: { device: true },
      orderBy: { issuedAt: 'desc' },
    });
    return sessions.map((session) =>
      buildSessionSummary({
        currentSessionId,
        device: session.device
          ? {
              id: session.device.id,
              userId: session.device.userId,
              platform: session.device.platform,
              deviceLabel: session.device.deviceLabel,
              lastSeenAt: session.device.lastSeenAt?.toISOString() ?? null,
              revokedAt: session.device.revokedAt?.toISOString() ?? null,
            }
          : null,
        session: {
          id: session.id,
          userId: session.userId,
          userDeviceId: session.userDeviceId ?? null,
          jwtId: session.jwtId ?? '',
          refreshTokenId: session.refreshTokenId ?? '',
          issuedAt: session.issuedAt.toISOString(),
          expiresAt: session.expiresAt?.toISOString() ?? null,
          lastSeenAt: session.lastSeenAt?.toISOString() ?? null,
          revokedAt: session.revokedAt?.toISOString() ?? null,
          revokeReason: session.revokeReason ?? null,
          userAgent: session.userAgent ?? null,
        },
      }),
    );
  }

  return [...memorySessions.values()]
    .filter((session) => session.userId === userId)
    .sort((left, right) => Date.parse(right.issuedAt) - Date.parse(left.issuedAt))
    .map((session) =>
      buildSessionSummary({
        currentSessionId,
        device: session.userDeviceId ? memoryDevices.get(session.userDeviceId) ?? null : null,
        session,
      }),
    );
}

async function revokeAllSessionRecords(
  userId: string,
  excludeSessionId?: string | null,
): Promise<{ retainedSessionId: string | null; revokedCount: number; revokedSessionIds: string[] }> {
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    const prisma = getPrismaClientOrThrow();
    const sessions = await prisma.authSession.findMany({
      where: {
        userId,
        revokedAt: null,
        ...(excludeSessionId ? { NOT: { id: excludeSessionId } } : {}),
      },
      select: { id: true },
    });
    if (sessions.length > 0) {
      await prisma.authSession.updateMany({
        where: {
          userId,
          revokedAt: null,
          ...(excludeSessionId ? { NOT: { id: excludeSessionId } } : {}),
        },
        data: {
          revokedAt: new Date(),
          revokeReason: 'revoke_all',
        },
      });
    }
    return {
      retainedSessionId: excludeSessionId ?? null,
      revokedCount: sessions.length,
      revokedSessionIds: sessions.map((session) => session.id),
    };
  }

  const revokedSessionIds: string[] = [];
  const nowIso = isoNow();
  for (const session of memorySessions.values()) {
    if (session.userId !== userId) {
      continue;
    }
    if (excludeSessionId && session.id === excludeSessionId) {
      continue;
    }
    if (session.revokedAt) {
      continue;
    }
    session.revokedAt = nowIso;
    session.revokeReason = 'revoke_all';
    session.updatedAt = nowIso;
    revokedSessionIds.push(session.id);
  }

  return {
    retainedSessionId: excludeSessionId ?? null,
    revokedCount: revokedSessionIds.length,
    revokedSessionIds,
  };
}

function buildTokens(identity: AuthIdentity, session: SessionRecord): AuthTokens {
  const accessToken = signJwt({
    expiresInSec: ACCESS_TOKEN_TTL_SEC,
    jti: session.jwtId,
    roles: identity.roles,
    sid: session.id,
    sub: identity.authProviderSubject,
    token_epoch: identity.tokenEpoch,
    token_use: 'access',
    uid: identity.id,
  });
  const refreshToken = signJwt({
    expiresInSec: REFRESH_TOKEN_TTL_SEC,
    jti: session.refreshTokenId,
    roles: identity.roles,
    sid: session.id,
    sub: identity.authProviderSubject,
    token_epoch: identity.tokenEpoch,
    token_use: 'refresh',
    uid: identity.id,
  });
  const accessClaims = verifyLocalJwt(accessToken, 'access');

  return {
    accessToken,
    expiresAt: accessClaims.exp * 1000,
    refreshToken,
  };
}

export async function resolveAuthContextFromBearerToken(token: string): Promise<AuthContext | null> {
  let claims!: JwtClaims;
  try {
    const verified = await verifyAccessToken(token);
    if (verified.provider === 'local') {
      claims = verified.claims;
    } else {
      const identity = await loadAuthIdentityBySubject(verified.claims.sub);
      if (!identity) {
        return null;
      }
      return {
        exp: verified.claims.exp,
        provider: 'oidc',
        roles: identity.roles,
        sessionId: verified.claims.sid,
        subject: identity.authProviderSubject,
        userId: identity.id,
      };
    }
  } catch {
    return null;
  }

  const session = await getSessionRecordById(claims.sid);
  if (!isSessionActive(session, claims.uid)) {
    return null;
  }
  if (session.jwtId !== claims.jti) {
    return null;
  }

  const identity = await loadAuthIdentityByUserId(claims.uid);
  if (!identity) {
    return null;
  }
  if (identity.authProviderSubject !== claims.sub || identity.tokenEpoch !== claims.token_epoch) {
    return null;
  }

  await touchSessionRecord(session);
  return {
    exp: claims.exp,
    provider: 'local',
    roles: identity.roles,
    sessionId: session.id,
    subject: claims.sub,
    userId: identity.id,
  };
}

export async function createSessionByEmail(
  email: string,
  password: string,
  userAgent?: string,
): Promise<AuthLoginResult> {
  const identity = await loadAuthIdentityByEmail(email);
  if (!identity || identity.roles.length === 0) {
    throw unauthorized('Invalid email or password');
  }

  const validPassword = await verifyUserPassword(identity, password);
  if (!validPassword) {
    throw unauthorized('Invalid email or password');
  }

  const session = await createSessionRecord(identity.id, userAgent);
  return {
    user: await getAuthUserProfile(identity.id),
    tokens: buildTokens(identity, session),
  };
}

function pushTableRow(tables: SeedTables, table: string, row: SeedRow): void {
  if (!Array.isArray(tables[table])) {
    tables[table] = [];
  }
  tables[table].push(row);
}

async function createUserInCurrentBackend(input: RegisterInput): Promise<AuthIdentity> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const tables = getActiveTables();
  const role =
    input.accountType === 'COACH' ? 'coach' : input.accountType === 'ATHLETE' ? 'athlete' : 'parent';

  if (tables) {
    if (findUserByEmail(tables, normalizedEmail)) {
      throw badRequest('An account with this email already exists');
    }

    const userId = newId('usr');
    const now = isoNow();
    const authProviderSubject = `clubroom|${userId}`;

    pushTableRow(tables, 'users', {
      id: userId,
      authProvider: 'clubroom',
      authProviderSubject,
      email: normalizedEmail,
      name: `${input.firstName} ${input.lastName}`.trim(),
      avatarUrl: null,
      locale: 'en-GB',
      timeZone: 'Europe/London',
      accountStatus: 'active',
      isVerified: false,
      isLive: input.accountType === 'COACH' ? false : null,
      onboardingComplete: false,
      tokenEpoch: 0,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    });

    pushTableRow(tables, 'userProfiles', {
      userId,
      bio: '',
      addressLine: null,
      city: null,
      postcode: '',
      country: 'GB',
      dateOfBirth: input.dateOfBirth ?? null,
      phoneE164: input.phone ?? null,
      skillLevel: input.skillLevel ?? null,
      position: input.position ?? null,
      sport: input.sport ?? null,
      goals: [],
      isOrganization: input.isOrganization ?? false,
      organizationName: input.organizationName ?? null,
      createdAt: now,
      updatedAt: now,
    });

    pushTableRow(tables, 'userRoleMemberships', {
      id: newId('urm'),
      userId,
      role,
      active: true,
      source: 'self_register',
      createdAt: now,
      updatedAt: now,
      revokedAt: null,
    });

    if (input.accountType === 'COACH') {
      pushTableRow(tables, 'coachProfiles', {
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
      pushTableRow(tables, 'athletes', {
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

    return {
      authProviderSubject,
      email: normalizedEmail,
      id: userId,
      roles: [role],
      tokenEpoch: 0,
    };
  }

  const prisma = getPrismaClientOrThrow();
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw badRequest('An account with this email already exists');
  }

  const userId = newId('usr');
  const authProviderSubject = `clubroom|${userId}`;

  await prisma.user.create({
    data: {
      id: userId,
      authProvider: 'clubroom',
      authProviderSubject,
      email: normalizedEmail,
      name: `${input.firstName} ${input.lastName}`.trim(),
      locale: 'en-GB',
      timeZone: 'Europe/London',
      accountStatus: 'active',
      isVerified: false,
      isLive: input.accountType === 'COACH' ? false : null,
      onboardingComplete: false,
      tokenEpoch: 0,
      profile: {
        create: {
          bio: '',
          postcode: '',
          country: 'GB',
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          phoneE164: input.phone ?? null,
          skillLevel: input.skillLevel ?? null,
          position: input.position ?? null,
          sport: input.sport ?? null,
          goals: [],
          isOrganization: input.isOrganization ?? false,
          organizationName: input.organizationName ?? null,
        },
      },
      roles: {
        create: {
          id: newId('urm'),
          role,
          active: true,
          source: 'self_register',
        },
      },
      ...(input.accountType === 'COACH'
        ? {
            coachProfile: {
              create: {
                bio: '',
                qualifications: [],
                specialties: [],
                sessionRateMinor: 0,
                yearsExperience: 0,
                dbsChecked: false,
                currency: 'GBP',
              },
            },
          }
        : {}),
    },
  });

  if (input.accountType === 'ATHLETE') {
    await prisma.athlete.create({
      data: {
        id: newId('ath'),
        userId,
        displayName: `${input.firstName} ${input.lastName}`.trim(),
        status: 'active',
        createdByUserId: userId,
        updatedByUserId: userId,
      },
    });
  }

  return {
    authProviderSubject,
    email: normalizedEmail,
    id: userId,
    roles: [role],
    tokenEpoch: 0,
  };
}

export async function registerAuthUser(
  input: RegisterInput,
  userAgent?: string,
): Promise<AuthLoginResult> {
  const identity = await createUserInCurrentBackend(input);
  await setPasswordCredentialHash(identity.id, hashPassword(input.password));
  const session = await createSessionRecord(identity.id, userAgent);
  return {
    user: await getAuthUserProfile(identity.id),
    tokens: buildTokens(identity, session),
  };
}

export async function refreshAuthSession(
  refreshToken: string,
  userAgent?: string,
): Promise<AuthTokens> {
  const claims = verifyLocalJwt(refreshToken, 'refresh');
  const session = await getSessionRecordById(claims.sid);
  if (!isSessionActive(session, claims.uid)) {
    throw unauthorized('Session expired. Please log in again.');
  }
  if (session.refreshTokenId !== claims.jti) {
    throw unauthorized('Invalid refresh token');
  }

  const identity = await loadAuthIdentityByUserId(claims.uid);
  if (!identity) {
    throw unauthorized('Session expired. Please log in again.');
  }
  if (identity.authProviderSubject !== claims.sub || identity.tokenEpoch !== claims.token_epoch) {
    throw unauthorized('Session expired. Please log in again.');
  }

  const rotatedSession = await rotateSessionRecord(session.id, identity.id, userAgent);
  return buildTokens(identity, rotatedSession);
}

export async function revokeAuthSession(params: {
  reason?: string;
  refreshToken?: string;
  sessionId?: string;
  userId?: string;
}): Promise<{ revokedAt: string; sessionId: string }> {
  let sessionId = params.sessionId;

  if (!sessionId && params.refreshToken) {
    const claims = verifyLocalJwt(params.refreshToken, 'refresh');
    const session = await getSessionRecordByRefreshTokenId(claims.jti);
    if (!session || session.id !== claims.sid) {
      throw unauthorized('Invalid refresh token');
    }
    sessionId = session.id;
  }

  if (!sessionId) {
    throw badRequest('Session id or refresh token is required');
  }

  const session = await revokeSessionRecord({
    reason: params.reason ?? 'self_revoke',
    sessionId,
    userId: params.userId,
  });
  return {
    revokedAt: session.revokedAt ?? isoNow(),
    sessionId,
  };
}

export async function listAuthSessions(
  userId: string,
  currentSessionId?: string | null,
): Promise<AuthSessionSummary[]> {
  return listSessionRecords(userId, currentSessionId);
}

export async function revokeAllAuthSessionsForUser(
  userId: string,
  excludeSessionId?: string | null,
): Promise<{ retainedSessionId: string | null; revokedCount: number; revokedSessionIds: string[] }> {
  return revokeAllSessionRecords(userId, excludeSessionId);
}

export async function revokeAuthSessionForUser(
  userId: string,
  sessionId: string,
  currentSessionId?: string | null,
): Promise<{ currentSessionRevoked: boolean; session: AuthSessionSummary }> {
  const revokedSession = await revokeSessionRecord({
    reason: 'self_revoke',
    sessionId,
    userId,
  });

  let device: DeviceRecord | null = null;
  if (getApiDataBackend() === 'db' && !shouldUseDbFixtureFallback()) {
    if (revokedSession.userDeviceId) {
      const prisma = getPrismaClientOrThrow();
      const sessionWithDevice = await prisma.authSession.findUnique({
        where: { id: revokedSession.id },
        include: { device: true },
      });
      if (sessionWithDevice?.device) {
        device = {
          id: sessionWithDevice.device.id,
          userId: sessionWithDevice.device.userId,
          platform: sessionWithDevice.device.platform,
          deviceLabel: sessionWithDevice.device.deviceLabel,
          lastSeenAt: sessionWithDevice.device.lastSeenAt?.toISOString() ?? null,
          revokedAt: sessionWithDevice.device.revokedAt?.toISOString() ?? null,
        };
      }
    }
  } else if (revokedSession.userDeviceId) {
    device = memoryDevices.get(revokedSession.userDeviceId) ?? null;
  }

  return {
    currentSessionRevoked: Boolean(currentSessionId && sessionId === currentSessionId),
    session: buildSessionSummary({
      currentSessionId,
      device,
      session: revokedSession,
    }),
  };
}

export async function checkEmailAvailable(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  const tables = getActiveTables();
  if (tables) {
    return !Boolean(findUserByEmail(tables, normalizedEmail));
  }

  const prisma = getPrismaClientOrThrow();
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  return !existing;
}

export async function getAuthUserProfile(userId: string): Promise<ApiUserProfile> {
  const tables = getActiveTables();
  if (tables) {
    return buildApiUserProfileFromTables(tables, userId);
  }

  const prisma = getPrismaClientOrThrow();
  const [user, profile, coachProfile, roleMemberships, guardianLinks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
    }),
    prisma.userProfile.findUnique({
      where: { userId },
    }),
    prisma.coachProfile.findUnique({
      where: { userId },
    }),
    prisma.userRoleMembership.findMany({
      where: { userId, revokedAt: null, active: true },
    }),
    prisma.guardianChildLink.findMany({
      where: { guardianUserId: userId, deletedAt: null },
      include: { athlete: true },
    }),
  ]);

  if (!user || !user.email) {
    throw forbidden(`Authenticated user ${userId} does not exist`);
  }

  const roles = roleMemberships.map((role) => role.role);
  const accountType = inferAccountType(roles);
  const appRole = inferAppRole(roles, accountType);
  const name = splitName(user.name);
  const children = guardianLinks.map((link) => ({
    childId: link.athleteId,
    childName: link.athlete.displayName,
    relationshipType: normalizeChildRelationshipType(link.relationshipType),
    addedAt: link.createdAt.toISOString(),
  }));

  return {
    id: user.id,
    email: user.email,
    phone: profile?.phoneE164 ?? undefined,
    accountType,
    firstName: name.firstName,
    lastName: name.lastName,
    dateOfBirth: profile?.dateOfBirth?.toISOString(),
    photoUrl: user.avatarUrl ?? undefined,
    addressLine: profile?.addressLine ?? undefined,
    city: profile?.city ?? undefined,
    postcode: profile?.postcode ?? undefined,
    country: profile?.country ?? undefined,
    skillLevel: (profile?.skillLevel as ApiUserProfile['skillLevel']) ?? undefined,
    position: profile?.position ?? undefined,
    sport: profile?.sport ?? undefined,
    goals: profile?.goals.length ? profile.goals : undefined,
    childrenCount: children.length > 0 ? children.length : undefined,
    children: children.length > 0 ? children : undefined,
    hasChildren: children.length > 0,
    isOrganization: profile?.isOrganization ?? false,
    organizationName: profile?.organizationName ?? undefined,
    certifications: coachProfile?.qualifications.length ? coachProfile.qualifications : undefined,
    yearsExperience: coachProfile?.yearsExperience ?? undefined,
    specializations: coachProfile?.specialties.length ? coachProfile.specialties : undefined,
    bio: coachProfile?.bio ?? profile?.bio ?? undefined,
    hourlyRate: typeof coachProfile?.sessionRateMinor === 'number'
      ? Math.round(coachProfile.sessionRateMinor / 100)
      : undefined,
    isVerified: user.isVerified || coachProfile?.dbsChecked === true,
    isLive: user.isLive ?? undefined,
    onboardingComplete: user.onboardingComplete,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    roles,
    appRole,
  };
}

export async function updateAuthUserProfile(
  userId: string,
  updates: ApiUserProfileUpdate,
): Promise<ApiUserProfile> {
  const tables = getActiveTables();
  if (tables) {
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
    user.updatedAt = isoNow();

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

    return buildApiUserProfileFromTables(tables, userId);
  }

  const prisma = getPrismaClientOrThrow();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw forbidden(`Authenticated user ${userId} does not exist`);
  }

  const fullName = [updates.firstName, updates.lastName].filter(Boolean).join(' ').trim();
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(fullName ? { name: fullName } : {}),
      ...(updates.email ? { email: updates.email.toLowerCase() } : {}),
      ...(updates.photoUrl !== undefined ? { avatarUrl: updates.photoUrl } : {}),
      ...(updates.isVerified !== undefined ? { isVerified: updates.isVerified } : {}),
      ...(updates.isLive !== undefined ? { isLive: updates.isLive } : {}),
      ...(updates.onboardingComplete !== undefined
        ? { onboardingComplete: updates.onboardingComplete }
        : {}),
    },
  });

  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      bio: updates.bio,
      addressLine: updates.addressLine,
      city: updates.city,
      postcode: updates.postcode,
      country: updates.country,
      dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : undefined,
      phoneE164: updates.phone,
      skillLevel: updates.skillLevel,
      position: updates.position,
      sport: updates.sport,
      goals: updates.goals ?? [],
      isOrganization: updates.isOrganization,
      organizationName: updates.organizationName,
    },
    update: {
      ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
      ...(updates.addressLine !== undefined ? { addressLine: updates.addressLine } : {}),
      ...(updates.city !== undefined ? { city: updates.city } : {}),
      ...(updates.postcode !== undefined ? { postcode: updates.postcode } : {}),
      ...(updates.country !== undefined ? { country: updates.country } : {}),
      ...(updates.dateOfBirth !== undefined
        ? { dateOfBirth: updates.dateOfBirth ? new Date(updates.dateOfBirth) : null }
        : {}),
      ...(updates.phone !== undefined ? { phoneE164: updates.phone } : {}),
      ...(updates.skillLevel !== undefined ? { skillLevel: updates.skillLevel } : {}),
      ...(updates.position !== undefined ? { position: updates.position } : {}),
      ...(updates.sport !== undefined ? { sport: updates.sport } : {}),
      ...(updates.goals !== undefined ? { goals: updates.goals } : {}),
      ...(updates.isOrganization !== undefined ? { isOrganization: updates.isOrganization } : {}),
      ...(updates.organizationName !== undefined
        ? { organizationName: updates.organizationName }
        : {}),
    },
  });

  const identity = await loadAuthIdentityByUserId(userId);
  const isCoachLike = Boolean(identity?.roles.includes('coach') || identity?.roles.includes('club_admin'));
  if (isCoachLike) {
    await prisma.coachProfile.upsert({
      where: { userId },
      create: {
        userId,
        bio: updates.bio ?? '',
        yearsExperience: updates.yearsExperience,
        sessionRateMinor:
          typeof updates.hourlyRate === 'number' ? Math.max(0, Math.round(updates.hourlyRate * 100)) : null,
        specialties: updates.specializations ?? [],
        qualifications: updates.certifications ?? [],
      },
      update: {
        ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
        ...(updates.yearsExperience !== undefined ? { yearsExperience: updates.yearsExperience } : {}),
        ...(updates.hourlyRate !== undefined
          ? { sessionRateMinor: Math.max(0, Math.round(updates.hourlyRate * 100)) }
          : {}),
        ...(updates.specializations !== undefined ? { specialties: updates.specializations } : {}),
        ...(updates.certifications !== undefined ? { qualifications: updates.certifications } : {}),
      },
    });
  }

  return getAuthUserProfile(userId);
}
