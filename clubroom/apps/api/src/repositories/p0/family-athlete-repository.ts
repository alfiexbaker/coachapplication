import crypto from 'node:crypto';
import type {
  ConsentsResponse,
  EmergencyContactsResponse,
  InjuryRecord,
  MedicalRecordResponse,
} from '@clubroom/shared-contracts';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { notFound } from '../../lib/http-errors.js';
import { normalizeForJson } from './normalize.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
type Relationship = 'SON' | 'DAUGHTER' | 'WARD' | 'GRANDCHILD' | 'OTHER';
type InjurySeverity = 'low' | 'medium' | 'high';
type InjuryStatus = 'active' | 'recovering' | 'resolved';
interface DisabilityRecord {
  id?: string;
  type: string;
  diagnosisDate?: string;
  description?: string;
  supportRequired?: string;
  communicationPreferences?: string[];
  triggers?: string[];
  calmingStrategies?: string[];
}
interface SpecialNeedRecord {
  id?: string;
  category: 'PHYSICAL' | 'LEARNING' | 'SENSORY' | 'BEHAVIORAL' | 'MEDICAL' | 'OTHER';
  name: string;
  description?: string;
  severity?: 'MILD' | 'MODERATE' | 'SEVERE';
  accommodationsNeeded?: string[];
  parentHints?: string;
}
export interface CreateAthleteInput {
  familyId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  dateOfBirth?: string;
  gender?: Gender;
  relationship?: Relationship;
  primaryPosition?: string | null;
  photoUrl?: string;
  disabilities?: DisabilityRecord[];
  specialNeeds?: SpecialNeedRecord[];
  communicationNotes?: string;
  behavioralNotes?: string;
}
export interface UpdateAthleteInput {
  firstName?: string;
  lastName?: string;
  nickname?: string;
  dateOfBirth?: string;
  gender?: Gender;
  relationship?: Relationship;
  primaryPosition?: string | null;
  photoUrl?: string;
  disabilities?: DisabilityRecord[];
  specialNeeds?: SpecialNeedRecord[];
  communicationNotes?: string;
  behavioralNotes?: string;
}
export interface CreateInjuryInput {
  title: string;
  type: string;
  severity: string;
  reportedAt?: string;
  expectedRecoveryDate?: string | null;
  notes?: string | null;
}
export interface UpdateInjuryInput {
  title?: string;
  type?: string;
  severity?: string;
  status?: string;
  reportedAt?: string;
  expectedRecoveryDate?: string | null;
  resolvedAt?: string | null;
  notes?: string | null;
}
export interface UpdateMedicalRecordInput {
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
  restrictions?: string[];
  doctorName?: string | null;
  doctorPhone?: string | null;
  insuranceProvider?: string | null;
  insuranceNumber?: string | null;
  emergencyNotes?: string | null;
  senNotes?: string | null;
}
export interface UpdateEmergencyContactsInput {
  contacts: Array<{
    id?: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    isPrimary?: boolean;
    canPickup?: boolean;
  }>;
}
export interface UpsertConsentsInput {
  consents: Array<{
    type: ContractConsentType;
    granted: boolean;
    grantedAt?: string;
    grantedBy: string;
    expiryAt?: string;
  }>;
}
export interface FamilyAthleteRepository {
  hasFamilyMembership(familyId: string, authUserId: string): Promise<boolean>;
  resolveAthleteFamilyId(athleteId: string): Promise<string | null>;
  getAthlete(athleteId: string): Promise<Record<string, unknown> | null>;
  getInjury(injuryId: string): Promise<InjuryRecord | null>;
  createAthlete(input: CreateAthleteInput, authUserId: string): Promise<Record<string, unknown>>;
  updateAthlete(
    athleteId: string,
    input: UpdateAthleteInput,
    authUserId: string,
  ): Promise<Record<string, unknown> | null>;
  deleteAthlete(athleteId: string, authUserId: string): Promise<boolean>;
  listInjuries(athleteId: string): Promise<InjuryRecord[]>;
  createInjury(athleteId: string, input: CreateInjuryInput, userId: string): Promise<InjuryRecord>;
  updateInjury(
    injuryId: string,
    input: UpdateInjuryInput,
    userId: string,
  ): Promise<InjuryRecord | null>;
  getMedical(athleteId: string, userId: string): Promise<MedicalRecordResponse>;
  upsertMedical(
    athleteId: string,
    input: UpdateMedicalRecordInput,
    userId: string,
  ): Promise<MedicalRecordResponse>;
  getEmergencyContacts(athleteId: string, userId: string): Promise<EmergencyContactsResponse>;
  replaceEmergencyContacts(
    athleteId: string,
    input: UpdateEmergencyContactsInput,
    userId: string,
  ): Promise<EmergencyContactsResponse>;
  getConsents(athleteId: string, userId: string): Promise<ConsentsResponse>;
  replaceConsents(
    athleteId: string,
    input: UpsertConsentsInput,
    userId: string,
  ): Promise<ConsentsResponse>;
}
type ContractConsentType = 'PHOTO' | 'VIDEO' | 'SOCIAL_MEDIA' | 'EMERGENCY_TREATMENT';
const EXPOSED_CONSENT_TYPES: ContractConsentType[] = [
  'PHOTO',
  'VIDEO',
  'SOCIAL_MEDIA',
  'EMERGENCY_TREATMENT',
];
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;
const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((entry) => String(entry)) : [];
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const seededInjuries: InjuryRecord[] = [
  {
    id: 'inj_seed-user1-ankle',
    athleteId: 'ath_user1',
    title: 'Left ankle strain',
    type: 'LEFT_ANKLE',
    severity: 'medium',
    status: 'recovering',
    reportedAt: '2026-02-24T10:00:00.000Z',
    expectedRecoveryDate: '2026-03-10T00:00:00.000Z',
    resolvedAt: null,
    notes: 'Injury logged from group roster flow test fixture.',
    createdByUserId: 'usr_coach1',
    createdAt: '2026-02-24T10:00:00.000Z',
    updatedAt: '2026-02-27T09:00:00.000Z',
  },
  {
    id: 'inj_seed-user2-knee',
    athleteId: 'ath_user2',
    title: 'Right knee impact',
    type: 'RIGHT_KNEE',
    severity: 'high',
    status: 'active',
    reportedAt: '2026-02-28T16:30:00.000Z',
    expectedRecoveryDate: '2026-03-18T00:00:00.000Z',
    resolvedAt: null,
    notes: 'Fixture injury for health dashboard and detail testing.',
    createdByUserId: 'usr_parent1',
    createdAt: '2026-02-28T16:30:00.000Z',
    updatedAt: '2026-02-28T16:30:00.000Z',
  },
];
const legacyAthleteDetails: Record<
  string,
  {
    firstName: string;
    lastName: string;
  }
> = {
  ath_user1: {
    firstName: 'Alfie',
    lastName: 'Barton',
  },
  ath_user2: {
    firstName: 'Maisie',
    lastName: 'Barton',
  },
  ath_user3: {
    firstName: 'Arjun',
    lastName: 'Kapoor',
  },
};
function splitDisplayName(displayName: string | undefined): {
  firstName: string;
  lastName: string;
} {
  const trimmed = displayName?.trim() ?? '';
  if (!trimmed) {
    return {
      firstName: 'Young',
      lastName: 'Athlete',
    };
  }
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? 'Young',
    lastName: parts.slice(1).join(' ') || parts[0] || 'Athlete',
  };
}
function buildLegacyAthlete(athleteId: string): Record<string, unknown> | null {
  const legacy = legacyAthleteDetails[athleteId];
  if (!legacy) {
    return null;
  }
  return {
    id: athleteId,
    userId: null,
    displayName: `${legacy.firstName} ${legacy.lastName}`.trim(),
    firstName: legacy.firstName,
    lastName: legacy.lastName,
    nickname: null,
    dateOfBirth: null,
    gender: 'PREFER_NOT_TO_SAY',
    relationship: 'OTHER',
    primaryPosition: null,
    photoUrl: null,
    disabilities: [],
    specialNeeds: [],
    hasSpecialNeeds: false,
    communicationNotes: null,
    behavioralNotes: null,
    guardians: [],
    senTags: [],
    consents: [],
    status: 'active',
    createdAt: isoNow(),
    updatedAt: isoNow(),
  };
}
function normalizeOptionalString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
function normalizeNullableString(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
function normalizeDisabilities(
  value: DisabilityRecord[] | undefined,
): DisabilityRecord[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.map((entry) => ({
    ...entry,
    id: entry.id ?? newId('dis'),
  }));
}
function normalizeSpecialNeeds(
  value: SpecialNeedRecord[] | undefined,
): SpecialNeedRecord[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value.map((entry) => ({
    ...entry,
    id: entry.id ?? newId('sn'),
  }));
}
function toJsonValue(value: DisabilityRecord[] | SpecialNeedRecord[]): never {
  return JSON.parse(JSON.stringify(value)) as never;
}
function normalizeEmergencyContacts(
  contacts: UpdateEmergencyContactsInput['contacts'],
): EmergencyContactsResponse['contacts'] {
  const normalized = contacts.map((contact, index) => ({
    ...contact,
    id: contact.id ?? newId('emc'),
    email: normalizeOptionalString(contact.email),
    isPrimary: contact.isPrimary ?? index === 0,
    canPickup: contact.canPickup ?? false,
  }));
  const primaryCount = normalized.filter((contact) => contact.isPrimary).length;
  if (normalized.length > 0 && primaryCount === 0) {
    normalized[0] = {
      ...normalized[0],
      isPrimary: true,
    };
  }
  if (primaryCount > 1) {
    let firstPrimaryFound = false;
    for (let index = 0; index < normalized.length; index += 1) {
      if (normalized[index].isPrimary && !firstPrimaryFound) {
        firstPrimaryFound = true;
        continue;
      }
      normalized[index] = {
        ...normalized[index],
        isPrimary: false,
      };
    }
  }
  return normalized;
}
function toEmergencyContactContractId(value: unknown): string {
  const id = asString(value);
  if (!id) {
    return newId('emc');
  }
  if (id.startsWith('emc_')) {
    return id;
  }
  if (id.startsWith('cec_')) {
    return `emc_${id.slice(4)}`;
  }
  return newId('emc');
}
function defaultMedicalRecord(athleteId: string, userId: string): MedicalRecordResponse {
  return {
    athleteId,
    conditions: [],
    allergies: [],
    medications: [],
    restrictions: [],
    doctorName: null,
    doctorPhone: null,
    insuranceProvider: null,
    insuranceNumber: null,
    emergencyNotes: null,
    senNotes: null,
    updatedAt: isoNow(),
    updatedByUserId: userId,
  };
}
function defaultEmergencyContacts(athleteId: string, userId: string): EmergencyContactsResponse {
  return {
    athleteId,
    contacts: [],
    updatedAt: isoNow(),
    updatedByUserId: userId,
  };
}
function defaultConsents(athleteId: string, userId: string): ConsentsResponse {
  return {
    athleteId,
    consents: EXPOSED_CONSENT_TYPES.map((type) => ({
      type,
      granted: false,
      grantedBy: '',
    })),
    updatedAt: isoNow(),
    updatedByUserId: userId,
  };
}
function removeRowsWhere(rows: SeedRow[], predicate: (row: SeedRow) => boolean): void {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (predicate(rows[index])) {
      rows.splice(index, 1);
    }
  }
}
function coerceDateString(value: unknown): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return asString(value) ?? null;
}
function asInjurySeverity(value: string | undefined): InjurySeverity {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}
function asInjuryStatus(value: string | undefined): InjuryStatus {
  return value === 'active' || value === 'recovering' || value === 'resolved' ? value : 'active';
}
function buildInjuryRecord(input: {
  id: string;
  athleteId: string;
  title: string;
  type: string;
  severity: string | undefined;
  status: string | undefined;
  reportedAt: string | Date;
  expectedRecoveryDate: string | Date | null | undefined;
  resolvedAt: string | Date | null | undefined;
  notes: string | null | undefined;
  createdByUserId: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}): InjuryRecord {
  return normalizeForJson({
    id: input.id,
    athleteId: input.athleteId,
    title: input.title,
    type: input.type,
    severity: asInjurySeverity(input.severity),
    status: asInjuryStatus(input.status),
    reportedAt: input.reportedAt,
    expectedRecoveryDate: input.expectedRecoveryDate ?? null,
    resolvedAt: input.resolvedAt ?? null,
    notes: input.notes ?? null,
    createdByUserId: input.createdByUserId,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt,
  }) as InjuryRecord;
}
function consentTypeIsExposed(value: string | undefined): value is ContractConsentType {
  return (
    value === 'PHOTO' ||
    value === 'VIDEO' ||
    value === 'SOCIAL_MEDIA' ||
    value === 'EMERGENCY_TREATMENT'
  );
}
function ensureStoreTable(tables: SeedTables, name: string): SeedRow[] {
  if (!Array.isArray(tables[name])) {
    tables[name] = [];
  }
  return asRows(tables[name]);
}
function ensureStoreScaffoldTables(tables: SeedTables): void {
  const injuries = ensureStoreTable(tables, 'athleteInjuries');
  if (injuries.length === 0) {
    for (const injury of seededInjuries) {
      injuries.push({
        ...injury,
        updatedByUserId: injury.createdByUserId,
        version: 1,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
  }
}
function buildAthleteDisplayFields(athlete: SeedRow): {
  firstName: string;
  lastName: string;
  nickname: string | null;
  gender: Gender;
  relationship: Relationship;
  primaryPosition: string | null;
  photoUrl: string | null;
  disabilities: DisabilityRecord[];
  specialNeeds: SpecialNeedRecord[];
  communicationNotes: string | null;
  behavioralNotes: string | null;
} {
  const splitName = splitDisplayName(asString(athlete.displayName));
  const disabilities = Array.isArray(athlete.disabilitiesJson)
    ? (athlete.disabilitiesJson as DisabilityRecord[])
    : Array.isArray(athlete.disabilities)
      ? (athlete.disabilities as DisabilityRecord[])
      : [];
  const specialNeeds = Array.isArray(athlete.specialNeedsJson)
    ? (athlete.specialNeedsJson as SpecialNeedRecord[])
    : Array.isArray(athlete.specialNeeds)
      ? (athlete.specialNeeds as SpecialNeedRecord[])
      : [];
  return {
    firstName: asString(athlete.firstName)?.trim() || splitName.firstName,
    lastName: asString(athlete.lastName)?.trim() || splitName.lastName,
    nickname: normalizeNullableString(asString(athlete.nickname)) ?? null,
    gender: (asString(athlete.gender) as Gender | undefined) ?? 'PREFER_NOT_TO_SAY',
    relationship: (asString(athlete.relationshipLabel) as Relationship | undefined) ?? 'OTHER',
    primaryPosition: normalizeNullableString(asString(athlete.primaryPosition)) ?? null,
    photoUrl:
      normalizeNullableString(asString(athlete.avatarUrl) ?? asString(athlete.photoUrl)) ?? null,
    disabilities,
    specialNeeds,
    communicationNotes: normalizeNullableString(asString(athlete.communicationNotes)) ?? null,
    behavioralNotes: normalizeNullableString(asString(athlete.behavioralNotes)) ?? null,
  };
}
export function decorateFamilyAthleteRecord(
  athlete: SeedRow,
  parentId: string | null,
): Record<string, unknown> {
  const fields = buildAthleteDisplayFields(athlete);
  return {
    ...athlete,
    parentId,
    firstName: fields.firstName,
    lastName: fields.lastName,
    nickname: fields.nickname,
    gender: fields.gender,
    relationship: fields.relationship,
    primaryPosition: fields.primaryPosition,
    photoUrl: fields.photoUrl,
    disabilities: fields.disabilities,
    specialNeeds: fields.specialNeeds,
    hasSpecialNeeds: fields.disabilities.length > 0 || fields.specialNeeds.length > 0,
    communicationNotes: fields.communicationNotes,
    behavioralNotes: fields.behavioralNotes,
  };
}
class StoreFamilyAthleteRepository implements FamilyAthleteRepository {
  constructor(private readonly getTables: () => SeedTables) {}
  private tables(): SeedTables {
    const tables = this.getTables();
    ensureStoreScaffoldTables(tables);
    return tables;
  }
  private activeRows(name: string): SeedRow[] {
    return ensureStoreTable(this.tables(), name).filter((row) => !asString(row.deletedAt));
  }
  private findAthleteRow(athleteId: string): SeedRow | undefined {
    return this.activeRows('athletes').find((row) => asString(row.id) === athleteId);
  }
  private parentIdForAthlete(athleteId: string, familyId: string | null): string | null {
    const guardians = this.activeRows('guardianChildLinks').filter(
      (row) =>
        asString(row.athleteId) === athleteId && (!familyId || asString(row.familyId) === familyId),
    );
    const primary = guardians.find((row) => asBoolean(row.isPrimary));
    return asString(primary?.guardianUserId) ?? asString(guardians[0]?.guardianUserId) ?? null;
  }
  private withAthleteRelations(athlete: SeedRow): Record<string, unknown> {
    const athleteId = asString(athlete.id) ?? '';
    const familyId = this.resolveAthleteFamilyIdSync(athleteId);
    return decorateFamilyAthleteRecord(
      {
        ...athlete,
        guardians: this.activeRows('guardianChildLinks').filter(
          (row) => asString(row.athleteId) === athleteId,
        ),
        senTags: this.activeRows('childSenTags').filter(
          (row) => asString(row.athleteId) === athleteId,
        ),
        consents: this.activeRows('childConsents').filter(
          (row) => asString(row.athleteId) === athleteId,
        ),
      },
      this.parentIdForAthlete(athleteId, familyId),
    );
  }
  private resolveAthleteFamilyIdSync(athleteId: string): string | null {
    return (
      asString(
        this.activeRows('guardianChildLinks').find((row) => asString(row.athleteId) === athleteId)
          ?.familyId,
      ) ?? null
    );
  }
  async hasFamilyMembership(familyId: string, authUserId: string): Promise<boolean> {
    return this.activeRows('familyMemberships').some(
      (row) => asString(row.familyId) === familyId && asString(row.userId) === authUserId,
    );
  }
  async resolveAthleteFamilyId(athleteId: string): Promise<string | null> {
    return this.resolveAthleteFamilyIdSync(athleteId);
  }
  async getAthlete(athleteId: string): Promise<Record<string, unknown> | null> {
    const athlete = this.findAthleteRow(athleteId);
    return athlete ? this.withAthleteRelations(athlete) : buildLegacyAthlete(athleteId);
  }
  async getInjury(injuryId: string): Promise<InjuryRecord | null> {
    const injury = this.activeRows('athleteInjuries').find((row) => asString(row.id) === injuryId);
    if (!injury) {
      return null;
    }
    const athleteId = asString(injury.athleteId) ?? '';
    return (await this.listInjuries(athleteId)).find((row) => row.id === injuryId) ?? null;
  }
  async createAthlete(
    input: CreateAthleteInput,
    authUserId: string,
  ): Promise<Record<string, unknown>> {
    const athleteId = newId('ath');
    const now = isoNow();
    const athletes = ensureStoreTable(this.tables(), 'athletes');
    const guardianLinks = ensureStoreTable(this.tables(), 'guardianChildLinks');
    const childSenTags = ensureStoreTable(this.tables(), 'childSenTags');
    const disabilities = normalizeDisabilities(input.disabilities) ?? [];
    const specialNeeds = normalizeSpecialNeeds(input.specialNeeds) ?? [];
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const photoUrl = normalizeOptionalString(input.photoUrl);
    const athlete: SeedRow = {
      id: athleteId,
      userId: null,
      displayName: `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      nickname: normalizeOptionalString(input.nickname) ?? null,
      dateOfBirth: input.dateOfBirth ?? null,
      gender: input.gender ?? 'PREFER_NOT_TO_SAY',
      relationshipLabel: input.relationship ?? 'OTHER',
      primaryPosition: input.primaryPosition ?? null,
      avatarUrl: photoUrl ?? null,
      communicationNotes: normalizeOptionalString(input.communicationNotes) ?? null,
      behavioralNotes: normalizeOptionalString(input.behavioralNotes) ?? null,
      disabilitiesJson: disabilities,
      specialNeedsJson: specialNeeds,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    athletes.push(athlete);
    guardianLinks.push({
      id: newId('gcl'),
      familyId: input.familyId,
      guardianUserId: authUserId,
      athleteId,
      relationshipType: (input.relationship ?? 'OTHER').toLowerCase(),
      isPrimary: true,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    });
    for (const need of specialNeeds) {
      childSenTags.push({
        id: newId('sen'),
        athleteId,
        tag: need.name,
        priority: 2,
        isCritical: need.severity === 'SEVERE',
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
        createdAt: now,
        updatedAt: now,
        version: 1,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    return this.withAthleteRelations(athlete);
  }
  async updateAthlete(
    athleteId: string,
    input: UpdateAthleteInput,
    authUserId: string,
  ): Promise<Record<string, unknown> | null> {
    const athlete = this.findAthleteRow(athleteId);
    if (!athlete) {
      return null;
    }
    const current = buildAthleteDisplayFields(athlete);
    const firstName = input.firstName?.trim() || current.firstName;
    const lastName = input.lastName?.trim() || current.lastName;
    const disabilities = normalizeDisabilities(input.disabilities) ?? current.disabilities;
    const specialNeeds = normalizeSpecialNeeds(input.specialNeeds) ?? current.specialNeeds;
    athlete.displayName = `${firstName} ${lastName}`.trim();
    athlete.firstName = firstName;
    athlete.lastName = lastName;
    if (input.nickname !== undefined) {
      athlete.nickname = normalizeNullableString(input.nickname);
    }
    if (input.dateOfBirth !== undefined) {
      athlete.dateOfBirth = input.dateOfBirth || null;
    }
    if (input.gender !== undefined) {
      athlete.gender = input.gender;
    }
    if (input.relationship !== undefined) {
      athlete.relationshipLabel = input.relationship;
    }
    if (input.primaryPosition !== undefined) {
      athlete.primaryPosition = input.primaryPosition;
    }
    if (input.photoUrl !== undefined) {
      athlete.avatarUrl = normalizeNullableString(input.photoUrl);
    }
    if (input.communicationNotes !== undefined) {
      athlete.communicationNotes = normalizeNullableString(input.communicationNotes);
    }
    if (input.behavioralNotes !== undefined) {
      athlete.behavioralNotes = normalizeNullableString(input.behavioralNotes);
    }
    athlete.disabilitiesJson = disabilities;
    athlete.specialNeedsJson = specialNeeds;
    athlete.updatedAt = isoNow();
    athlete.updatedByUserId = authUserId;
    athlete.version = Number(athlete.version ?? 1) + 1;
    if (input.specialNeeds !== undefined) {
      const childSenTags = ensureStoreTable(this.tables(), 'childSenTags');
      removeRowsWhere(childSenTags, (row) => asString(row.athleteId) === athleteId);
      for (const need of specialNeeds) {
        childSenTags.push({
          id: newId('sen'),
          athleteId,
          tag: need.name,
          priority: 2,
          isCritical: need.severity === 'SEVERE',
          createdByUserId: authUserId,
          updatedByUserId: authUserId,
          createdAt: athlete.updatedAt,
          updatedAt: athlete.updatedAt,
          version: 1,
          deletedAt: null,
          deletedByUserId: null,
        });
      }
    }
    return this.withAthleteRelations(athlete);
  }
  async deleteAthlete(athleteId: string, authUserId: string): Promise<boolean> {
    const athlete = this.findAthleteRow(athleteId);
    if (!athlete) {
      return false;
    }
    const deletedAt = isoNow();
    athlete.deletedAt = deletedAt;
    athlete.deletedByUserId = authUserId;
    athlete.updatedAt = deletedAt;
    athlete.updatedByUserId = authUserId;
    athlete.status = 'deleted';
    athlete.version = Number(athlete.version ?? 1) + 1;
    for (const row of this.activeRows('guardianChildLinks').filter(
      (item) => asString(item.athleteId) === athleteId,
    )) {
      row.deletedAt = deletedAt;
      row.deletedByUserId = authUserId;
      row.updatedAt = deletedAt;
      row.updatedByUserId = authUserId;
      row.version = Number(row.version ?? 1) + 1;
    }
    for (const row of this.activeRows('childSenTags').filter(
      (item) => asString(item.athleteId) === athleteId,
    )) {
      row.deletedAt = deletedAt;
      row.deletedByUserId = authUserId;
      row.updatedAt = deletedAt;
      row.updatedByUserId = authUserId;
      row.version = Number(row.version ?? 1) + 1;
    }
    for (const row of this.activeRows('childEmergencyContacts').filter(
      (item) => asString(item.athleteId) === athleteId,
    )) {
      row.deletedAt = deletedAt;
      row.deletedByUserId = authUserId;
      row.updatedAt = deletedAt;
      row.updatedByUserId = authUserId;
      row.version = Number(row.version ?? 1) + 1;
    }
    for (const row of this.activeRows('athleteInjuries').filter(
      (item) => asString(item.athleteId) === athleteId,
    )) {
      row.deletedAt = deletedAt;
      row.deletedByUserId = authUserId;
      row.updatedAt = deletedAt;
      row.updatedByUserId = authUserId;
      row.version = Number(row.version ?? 1) + 1;
    }
    return true;
  }
  async listInjuries(athleteId: string): Promise<InjuryRecord[]> {
    return this.activeRows('athleteInjuries')
      .filter((row) => asString(row.athleteId) === athleteId)
      .sort((left, right) =>
        String(right.createdAt ?? '').localeCompare(String(left.createdAt ?? '')),
      )
      .map((row) =>
        buildInjuryRecord({
          id: asString(row.id) ?? '',
          athleteId,
          title: asString(row.title) ?? '',
          type: asString(row.type) ?? '',
          severity: asString(row.severity),
          status: asString(row.status),
          reportedAt: asString(row.reportedAt) ?? isoNow(),
          expectedRecoveryDate: asString(row.expectedRecoveryDate) ?? null,
          resolvedAt: asString(row.resolvedAt) ?? null,
          notes: asString(row.notes) ?? null,
          createdByUserId: asString(row.createdByUserId) ?? '',
          createdAt: asString(row.createdAt) ?? isoNow(),
          updatedAt: asString(row.updatedAt) ?? asString(row.createdAt) ?? isoNow(),
        }),
      );
  }
  async createInjury(
    athleteId: string,
    input: CreateInjuryInput,
    userId: string,
  ): Promise<InjuryRecord> {
    const injuries = ensureStoreTable(this.tables(), 'athleteInjuries');
    const now = isoNow();
    const injury: SeedRow = {
      id: newId('inj'),
      athleteId,
      title: input.title,
      type: input.type,
      severity: input.severity,
      status: 'active',
      reportedAt: input.reportedAt ?? now,
      expectedRecoveryDate: input.expectedRecoveryDate ?? null,
      resolvedAt: null,
      notes: input.notes ?? null,
      createdByUserId: userId,
      updatedByUserId: userId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    injuries.push(injury);
    const [created] = await this.listInjuries(athleteId);
    return created.id === injury.id
      ? created
      : (await this.listInjuries(athleteId)).find((row) => row.id === injury.id)!;
  }
  async updateInjury(
    injuryId: string,
    input: UpdateInjuryInput,
    userId: string,
  ): Promise<InjuryRecord | null> {
    const injury = this.activeRows('athleteInjuries').find((row) => asString(row.id) === injuryId);
    if (!injury) {
      return null;
    }
    const nextStatus = input.status ?? asString(injury.status) ?? 'active';
    const now = isoNow();
    if (input.title !== undefined) {
      injury.title = input.title;
    }
    if (input.type !== undefined) {
      injury.type = input.type;
    }
    if (input.severity !== undefined) {
      injury.severity = input.severity;
    }
    if (input.reportedAt !== undefined) {
      injury.reportedAt = input.reportedAt;
    }
    if (input.expectedRecoveryDate !== undefined) {
      injury.expectedRecoveryDate = input.expectedRecoveryDate;
    }
    if (input.notes !== undefined) {
      injury.notes = input.notes;
    }
    injury.status = nextStatus;
    injury.resolvedAt =
      input.resolvedAt !== undefined
        ? input.resolvedAt
        : nextStatus === 'resolved'
          ? (asString(injury.resolvedAt) ?? now)
          : (injury.resolvedAt ?? null);
    injury.updatedAt = now;
    injury.updatedByUserId = userId;
    injury.version = Number(injury.version ?? 1) + 1;
    return (
      (await this.listInjuries(asString(injury.athleteId) ?? '')).find(
        (row) => row.id === injuryId,
      ) ?? null
    );
  }
  async getMedical(athleteId: string, userId: string): Promise<MedicalRecordResponse> {
    const record = this.activeRows('childMedicalRecords').reduce<SeedRow | undefined>(
      (latest, row) => {
        if (asString(row.athleteId) !== athleteId || !asBoolean(row.isCurrent, true)) {
          return latest;
        }
        if (!latest) {
          return row;
        }
        return String(row.updatedAt ?? '').localeCompare(String(latest.updatedAt ?? '')) > 0
          ? row
          : latest;
      },
      undefined,
    );
    if (!record) {
      return defaultMedicalRecord(athleteId, userId);
    }
    return {
      athleteId,
      conditions: asStringArray(record.conditions),
      allergies: asStringArray(record.allergies),
      medications: asStringArray(record.medications),
      restrictions: asStringArray(record.restrictions),
      doctorName: asString(record.doctorName) ?? null,
      doctorPhone: asString(record.doctorPhoneE164) ?? null,
      insuranceProvider: asString(record.insuranceProvider) ?? null,
      insuranceNumber: asString(record.insuranceNumber) ?? null,
      emergencyNotes: asString(record.emergencyNotes) ?? null,
      senNotes: asString(record.senNotes) ?? null,
      updatedAt: asString(record.updatedAt) ?? asString(record.createdAt) ?? isoNow(),
      updatedByUserId: asString(record.updatedByUserId) ?? userId,
    };
  }
  async upsertMedical(
    athleteId: string,
    input: UpdateMedicalRecordInput,
    userId: string,
  ): Promise<MedicalRecordResponse> {
    const records = ensureStoreTable(this.tables(), 'childMedicalRecords');
    const now = isoNow();
    const current = this.activeRows('childMedicalRecords').reduce<SeedRow | undefined>(
      (latest, row) => {
        if (asString(row.athleteId) !== athleteId || !asBoolean(row.isCurrent, true)) {
          return latest;
        }
        if (!latest) {
          return row;
        }
        return String(row.updatedAt ?? '').localeCompare(String(latest.updatedAt ?? '')) > 0
          ? row
          : latest;
      },
      undefined,
    );
    const target = current ?? {
      id: newId('med'),
      athleteId,
      effectiveFrom: now,
      isCurrent: true,
      createdAt: now,
      version: 1,
    };
    target.conditions = input.conditions ?? asStringArray(target.conditions);
    target.allergies = input.allergies ?? asStringArray(target.allergies);
    target.medications = input.medications ?? asStringArray(target.medications);
    target.restrictions = input.restrictions ?? asStringArray(target.restrictions);
    if (input.doctorName !== undefined) {
      target.doctorName = input.doctorName;
    }
    if (input.doctorPhone !== undefined) {
      target.doctorPhoneE164 = input.doctorPhone;
    }
    if (input.insuranceProvider !== undefined) {
      target.insuranceProvider = input.insuranceProvider;
    }
    if (input.insuranceNumber !== undefined) {
      target.insuranceNumber = input.insuranceNumber;
    }
    if (input.emergencyNotes !== undefined) {
      target.emergencyNotes = input.emergencyNotes;
    }
    if (input.senNotes !== undefined) {
      target.senNotes = input.senNotes;
    }
    target.updatedAt = now;
    target.updatedByUserId = userId;
    target.createdByUserId = asString(target.createdByUserId) ?? userId;
    target.version = Number(target.version ?? 1) + (current ? 1 : 0);
    if (!current) {
      records.push(target);
    }
    return this.getMedical(athleteId, userId);
  }
  async getEmergencyContacts(
    athleteId: string,
    userId: string,
  ): Promise<EmergencyContactsResponse> {
    const contacts = this.activeRows('childEmergencyContacts').flatMap((row) =>
      asString(row.athleteId) === athleteId
        ? [
            {
              id: toEmergencyContactContractId(row.id),
              name: asString(row.name) ?? '',
              relationship: asString(row.relationshipLabel) ?? '',
              phone: asString(row.phoneE164) ?? '',
              email: normalizeOptionalString(asString(row.email)),
              isPrimary: asBoolean(row.isPrimary, false),
              canPickup: asBoolean(row.canPickup, false),
            },
          ]
        : [],
    );
    if (contacts.length === 0) {
      return defaultEmergencyContacts(athleteId, userId);
    }
    const latest = this.activeRows('childEmergencyContacts').reduce<SeedRow | undefined>(
      (selected, row) => {
        if (asString(row.athleteId) !== athleteId) {
          return selected;
        }
        if (!selected) {
          return row;
        }
        return String(row.updatedAt ?? '').localeCompare(String(selected.updatedAt ?? '')) > 0
          ? row
          : selected;
      },
      undefined,
    );
    return {
      athleteId,
      contacts,
      updatedAt: asString(latest?.updatedAt) ?? asString(latest?.createdAt) ?? isoNow(),
      updatedByUserId: asString(latest?.updatedByUserId) ?? userId,
    };
  }
  async replaceEmergencyContacts(
    athleteId: string,
    input: UpdateEmergencyContactsInput,
    userId: string,
  ): Promise<EmergencyContactsResponse> {
    const contacts = ensureStoreTable(this.tables(), 'childEmergencyContacts');
    const now = isoNow();
    for (const row of this.activeRows('childEmergencyContacts').filter(
      (item) => asString(item.athleteId) === athleteId,
    )) {
      row.deletedAt = now;
      row.deletedByUserId = userId;
      row.updatedAt = now;
      row.updatedByUserId = userId;
      row.version = Number(row.version ?? 1) + 1;
    }
    for (const contact of normalizeEmergencyContacts(input.contacts)) {
      contacts.push({
        id: contact.id,
        athleteId,
        name: contact.name,
        relationshipLabel: contact.relationship,
        phoneE164: contact.phone,
        email: contact.email ?? null,
        isPrimary: contact.isPrimary,
        canPickup: contact.canPickup,
        createdByUserId: userId,
        updatedByUserId: userId,
        version: 1,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        deletedByUserId: null,
      });
    }
    return this.getEmergencyContacts(athleteId, userId);
  }
  async getConsents(athleteId: string, userId: string): Promise<ConsentsResponse> {
    const users = this.activeRows('users');
    const rows = this.activeRows('childConsents')
      .filter(
        (row) =>
          asString(row.athleteId) === athleteId && consentTypeIsExposed(asString(row.consentType)),
      )
      .sort((left, right) =>
        String(left.createdAt ?? '').localeCompare(String(right.createdAt ?? '')),
      );
    if (rows.length === 0) {
      return defaultConsents(athleteId, userId);
    }
    const byType = new Map<ContractConsentType, SeedRow>();
    for (const row of rows) {
      byType.set(asString(row.consentType) as ContractConsentType, row);
    }
    const latest = rows[rows.length - 1];
    return {
      athleteId,
      consents: EXPOSED_CONSENT_TYPES.map((type) => {
        const row = byType.get(type);
        if (!row) {
          return {
            type,
            granted: false,
            grantedBy: '',
          };
        }
        const grantedByUserId = asString(row.grantedByUserId) ?? '';
        const grantedByUser =
          users.find((user) => asString(user.id) === grantedByUserId && asString(user.name)) ??
          null;
        const metadata = (row.metadataJson ?? {}) as {
          grantedByLabel?: string;
        };
        return {
          type,
          granted: asBoolean(row.granted, false),
          grantedAt: asString(row.grantedAt) ?? undefined,
          grantedBy: metadata.grantedByLabel ?? asString(grantedByUser?.name) ?? '',
          expiryAt: asString(row.expiresAt) ?? undefined,
        };
      }),
      updatedAt: asString(latest.updatedAt) ?? asString(latest.createdAt) ?? isoNow(),
      updatedByUserId: asString(latest.grantedByUserId) ?? userId,
    };
  }
  async replaceConsents(
    athleteId: string,
    input: UpsertConsentsInput,
    userId: string,
  ): Promise<ConsentsResponse> {
    const consents = ensureStoreTable(this.tables(), 'childConsents');
    removeRowsWhere(
      consents,
      (row) =>
        asString(row.athleteId) === athleteId && consentTypeIsExposed(asString(row.consentType)),
    );
    const now = isoNow();
    const providedByType = new Map(input.consents.map((consent) => [consent.type, consent]));
    for (const type of EXPOSED_CONSENT_TYPES) {
      const consent = providedByType.get(type);
      consents.push({
        id: newId('ccn'),
        athleteId,
        consentType: type,
        granted: consent?.granted ?? false,
        grantedByUserId: userId,
        grantedAt: consent?.granted ? (consent.grantedAt ?? now) : null,
        expiresAt: consent?.expiryAt ?? null,
        revokedAt: consent?.granted === false ? now : null,
        supersededById: null,
        metadataJson: {
          grantedByLabel: consent?.grantedBy ?? '',
        },
        createdAt: now,
        updatedAt: now,
      });
    }
    return this.getConsents(athleteId, userId);
  }
}
class PrismaFamilyAthleteRepository implements FamilyAthleteRepository {
  private fallback = new StoreFamilyAthleteRepository(() => getDbFixtureStore().tables);
  async hasFamilyMembership(familyId: string, authUserId: string): Promise<boolean> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.hasFamilyMembership(familyId, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const count = await prisma.familyMembership.count({
      where: {
        familyId,
        userId: authUserId,
        deletedAt: null,
      },
    });
    return count > 0;
  }
  async resolveAthleteFamilyId(athleteId: string): Promise<string | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.resolveAthleteFamilyId(athleteId);
    }
    const prisma = getPrismaClientOrThrow();
    const link = await prisma.guardianChildLink.findFirst({
      where: {
        athleteId,
        deletedAt: null,
      },
      orderBy: {
        isPrimary: 'desc',
      },
      select: {
        familyId: true,
      },
    });
    return link?.familyId ?? null;
  }
  private async parentIdForAthlete(
    athleteId: string,
    familyId: string | null,
  ): Promise<string | null> {
    const prisma = getPrismaClientOrThrow();
    const link = await prisma.guardianChildLink.findFirst({
      where: {
        athleteId,
        deletedAt: null,
        ...(familyId
          ? {
              familyId,
            }
          : {}),
      },
      orderBy: {
        isPrimary: 'desc',
      },
      select: {
        guardianUserId: true,
      },
    });
    return link?.guardianUserId ?? null;
  }
  private async getAthletePayload(athleteId: string): Promise<Record<string, unknown> | null> {
    const prisma = getPrismaClientOrThrow();
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        deletedAt: null,
      },
    });
    if (!athlete) {
      return null;
    }
    const [guardians, senTags, consents, familyId] = await Promise.all([
      prisma.guardianChildLink.findMany({
        where: {
          athleteId,
          deletedAt: null,
        },
      }),
      prisma.childSenTag.findMany({
        where: {
          athleteId,
          deletedAt: null,
        },
      }),
      prisma.childConsent.findMany({
        where: {
          athleteId,
        },
      }),
      this.resolveAthleteFamilyId(athleteId),
    ]);
    return decorateFamilyAthleteRecord(
      normalizeForJson({
        ...athlete,
        guardians,
        senTags,
        consents,
      }),
      await this.parentIdForAthlete(athleteId, familyId),
    );
  }
  async getAthlete(athleteId: string): Promise<Record<string, unknown> | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getAthlete(athleteId);
    }
    return (await this.getAthletePayload(athleteId)) ?? buildLegacyAthlete(athleteId);
  }
  async getInjury(injuryId: string): Promise<InjuryRecord | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getInjury(injuryId);
    }
    const prisma = getPrismaClientOrThrow();
    const injury = await prisma.athleteInjury.findFirst({
      where: {
        id: injuryId,
        deletedAt: null,
      },
    });
    if (!injury) {
      return null;
    }
    return buildInjuryRecord({
      id: injury.id,
      athleteId: injury.athleteId,
      title: injury.title,
      type: injury.type,
      severity: injury.severity,
      status: injury.status,
      reportedAt: injury.reportedAt,
      expectedRecoveryDate: injury.expectedRecoveryDate,
      resolvedAt: injury.resolvedAt,
      notes: injury.notes,
      createdByUserId: injury.createdByUserId,
      createdAt: injury.createdAt,
      updatedAt: injury.updatedAt,
    });
  }
  async createAthlete(
    input: CreateAthleteInput,
    authUserId: string,
  ): Promise<Record<string, unknown>> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createAthlete(input, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const now = new Date();
    const athleteId = newId('ath');
    const disabilities = normalizeDisabilities(input.disabilities) ?? [];
    const specialNeeds = normalizeSpecialNeeds(input.specialNeeds) ?? [];
    await prisma.$transaction(async (tx) => {
      await tx.athlete.create({
        data: {
          id: athleteId,
          userId: null,
          displayName: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          nickname: normalizeNullableString(input.nickname),
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender ?? 'PREFER_NOT_TO_SAY',
          relationshipLabel: input.relationship ?? 'OTHER',
          primaryPosition: input.primaryPosition ?? null,
          avatarUrl: normalizeNullableString(input.photoUrl),
          communicationNotes: normalizeNullableString(input.communicationNotes),
          behavioralNotes: normalizeNullableString(input.behavioralNotes),
          disabilitiesJson: toJsonValue(disabilities),
          specialNeedsJson: toJsonValue(specialNeeds),
          status: 'active',
          createdByUserId: authUserId,
          updatedByUserId: authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        },
      });
      await tx.guardianChildLink.create({
        data: {
          id: newId('gcl'),
          familyId: input.familyId,
          guardianUserId: authUserId,
          athleteId,
          relationshipType: (input.relationship ?? 'OTHER').toLowerCase(),
          isPrimary: true,
          createdByUserId: authUserId,
          updatedByUserId: authUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        },
      });
      if (specialNeeds.length > 0) {
        await tx.childSenTag.createMany({
          data: specialNeeds.map((need) => ({
            id: newId('sen'),
            athleteId,
            tag: need.name,
            priority: 2,
            isCritical: need.severity === 'SEVERE',
            createdByUserId: authUserId,
            updatedByUserId: authUserId,
            version: 1,
            createdAt: now,
            updatedAt: now,
          })),
        });
      }
    });
    const created = await this.getAthletePayload(athleteId);
    if (!created) {
      throw notFound('Athlete not found', {
        athleteId,
      });
    }
    return created;
  }
  async updateAthlete(
    athleteId: string,
    input: UpdateAthleteInput,
    authUserId: string,
  ): Promise<Record<string, unknown> | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateAthlete(athleteId, input, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const current = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        deletedAt: null,
      },
    });
    if (!current) {
      return null;
    }
    const splitName = buildAthleteDisplayFields(normalizeForJson(current));
    const firstName = input.firstName?.trim() || splitName.firstName;
    const lastName = input.lastName?.trim() || splitName.lastName;
    const disabilities = normalizeDisabilities(input.disabilities) ?? splitName.disabilities;
    const specialNeeds = normalizeSpecialNeeds(input.specialNeeds) ?? splitName.specialNeeds;
    await prisma.$transaction(async (tx) => {
      await tx.athlete.update({
        where: {
          id: athleteId,
        },
        data: {
          displayName: `${firstName} ${lastName}`.trim(),
          firstName,
          lastName,
          ...(input.nickname !== undefined
            ? {
                nickname: normalizeNullableString(input.nickname),
              }
            : {}),
          ...(input.dateOfBirth !== undefined
            ? {
                dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
              }
            : {}),
          ...(input.gender !== undefined
            ? {
                gender: input.gender,
              }
            : {}),
          ...(input.relationship !== undefined
            ? {
                relationshipLabel: input.relationship,
              }
            : {}),
          ...(input.primaryPosition !== undefined
            ? {
                primaryPosition: input.primaryPosition,
              }
            : {}),
          ...(input.photoUrl !== undefined
            ? {
                avatarUrl: normalizeNullableString(input.photoUrl),
              }
            : {}),
          ...(input.communicationNotes !== undefined
            ? {
                communicationNotes: normalizeNullableString(input.communicationNotes),
              }
            : {}),
          ...(input.behavioralNotes !== undefined
            ? {
                behavioralNotes: normalizeNullableString(input.behavioralNotes),
              }
            : {}),
          disabilitiesJson: toJsonValue(disabilities),
          specialNeedsJson: toJsonValue(specialNeeds),
          updatedByUserId: authUserId,
          version: {
            increment: 1,
          },
        },
      });
      if (input.specialNeeds !== undefined) {
        await tx.childSenTag.deleteMany({
          where: {
            athleteId,
          },
        });
        if (specialNeeds.length > 0) {
          await tx.childSenTag.createMany({
            data: specialNeeds.map((need) => ({
              id: newId('sen'),
              athleteId,
              tag: need.name,
              priority: 2,
              isCritical: need.severity === 'SEVERE',
              createdByUserId: authUserId,
              updatedByUserId: authUserId,
              version: 1,
            })),
          });
        }
      }
    });
    return this.getAthletePayload(athleteId);
  }
  async deleteAthlete(athleteId: string, authUserId: string): Promise<boolean> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteAthlete(athleteId, authUserId);
    }
    const prisma = getPrismaClientOrThrow();
    const athlete = await prisma.athlete.findFirst({
      where: {
        id: athleteId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });
    if (!athlete) {
      return false;
    }
    const deletedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await Promise.all([
        tx.athlete.update({
          where: {
            id: athleteId,
          },
          data: {
            status: 'deleted',
            deletedAt,
            deletedByUserId: authUserId,
            updatedByUserId: authUserId,
            version: {
              increment: 1,
            },
          },
        }),
        tx.guardianChildLink.updateMany({
          where: {
            athleteId,
            deletedAt: null,
          },
          data: {
            deletedAt,
            deletedByUserId: authUserId,
            updatedByUserId: authUserId,
            version: {
              increment: 1,
            },
          },
        }),
        tx.childSenTag.updateMany({
          where: {
            athleteId,
            deletedAt: null,
          },
          data: {
            deletedAt,
            deletedByUserId: authUserId,
            updatedByUserId: authUserId,
            version: {
              increment: 1,
            },
          },
        }),
        tx.childEmergencyContact.updateMany({
          where: {
            athleteId,
            deletedAt: null,
          },
          data: {
            deletedAt,
            deletedByUserId: authUserId,
            updatedByUserId: authUserId,
            version: {
              increment: 1,
            },
          },
        }),
        tx.athleteInjury.updateMany({
          where: {
            athleteId,
            deletedAt: null,
          },
          data: {
            deletedAt,
            deletedByUserId: authUserId,
            updatedByUserId: authUserId,
            version: {
              increment: 1,
            },
          },
        }),
      ]);
    });
    return true;
  }
  async listInjuries(athleteId: string): Promise<InjuryRecord[]> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listInjuries(athleteId);
    }
    const prisma = getPrismaClientOrThrow();
    const injuries = await prisma.athleteInjury.findMany({
      where: {
        athleteId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return injuries.map((injury) =>
      buildInjuryRecord({
        id: injury.id,
        athleteId: injury.athleteId,
        title: injury.title,
        type: injury.type,
        severity: injury.severity,
        status: injury.status,
        reportedAt: injury.reportedAt,
        expectedRecoveryDate: injury.expectedRecoveryDate,
        resolvedAt: injury.resolvedAt,
        notes: injury.notes,
        createdByUserId: injury.createdByUserId,
        createdAt: injury.createdAt,
        updatedAt: injury.updatedAt,
      }),
    );
  }
  async createInjury(
    athleteId: string,
    input: CreateInjuryInput,
    userId: string,
  ): Promise<InjuryRecord> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createInjury(athleteId, input, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const created = await prisma.athleteInjury.create({
      data: {
        id: newId('inj'),
        athleteId,
        title: input.title,
        type: input.type,
        severity: input.severity,
        status: 'active',
        reportedAt: input.reportedAt ? new Date(input.reportedAt) : new Date(),
        expectedRecoveryDate: input.expectedRecoveryDate
          ? new Date(input.expectedRecoveryDate)
          : null,
        resolvedAt: null,
        notes: input.notes ?? null,
        createdByUserId: userId,
        updatedByUserId: userId,
        version: 1,
      },
    });
    return buildInjuryRecord({
      id: created.id,
      athleteId: created.athleteId,
      title: created.title,
      type: created.type,
      severity: created.severity,
      status: created.status,
      reportedAt: created.reportedAt,
      expectedRecoveryDate: created.expectedRecoveryDate,
      resolvedAt: created.resolvedAt,
      notes: created.notes,
      createdByUserId: created.createdByUserId,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    });
  }
  async updateInjury(
    injuryId: string,
    input: UpdateInjuryInput,
    userId: string,
  ): Promise<InjuryRecord | null> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateInjury(injuryId, input, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const current = await prisma.athleteInjury.findFirst({
      where: {
        id: injuryId,
        deletedAt: null,
      },
    });
    if (!current) {
      return null;
    }
    const nextStatus = input.status ?? current.status;
    const now = new Date();
    const updated = await prisma.athleteInjury.update({
      where: {
        id: injuryId,
      },
      data: {
        ...(input.title !== undefined
          ? {
              title: input.title,
            }
          : {}),
        ...(input.type !== undefined
          ? {
              type: input.type,
            }
          : {}),
        ...(input.severity !== undefined
          ? {
              severity: input.severity,
            }
          : {}),
        ...(input.reportedAt !== undefined
          ? {
              reportedAt: new Date(input.reportedAt),
            }
          : {}),
        ...(input.expectedRecoveryDate !== undefined
          ? {
              expectedRecoveryDate: input.expectedRecoveryDate
                ? new Date(input.expectedRecoveryDate)
                : null,
            }
          : {}),
        ...(input.notes !== undefined
          ? {
              notes: input.notes,
            }
          : {}),
        status: nextStatus,
        resolvedAt:
          input.resolvedAt !== undefined
            ? input.resolvedAt
              ? new Date(input.resolvedAt)
              : null
            : nextStatus === 'resolved'
              ? (current.resolvedAt ?? now)
              : current.resolvedAt,
        updatedByUserId: userId,
        version: {
          increment: 1,
        },
      },
    });
    return buildInjuryRecord({
      id: updated.id,
      athleteId: updated.athleteId,
      title: updated.title,
      type: updated.type,
      severity: updated.severity,
      status: updated.status,
      reportedAt: updated.reportedAt,
      expectedRecoveryDate: updated.expectedRecoveryDate,
      resolvedAt: updated.resolvedAt,
      notes: updated.notes,
      createdByUserId: updated.createdByUserId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  }
  async getMedical(athleteId: string, userId: string): Promise<MedicalRecordResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getMedical(athleteId, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const record = await prisma.childMedicalRecord.findFirst({
      where: {
        athleteId,
        isCurrent: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    if (!record) {
      return defaultMedicalRecord(athleteId, userId);
    }
    return normalizeForJson({
      athleteId,
      conditions: record.conditions,
      allergies: record.allergies,
      medications: record.medications,
      restrictions: record.restrictions,
      doctorName: record.doctorName,
      doctorPhone: record.doctorPhoneE164,
      insuranceProvider: record.insuranceProvider,
      insuranceNumber: record.insuranceNumber,
      emergencyNotes: record.emergencyNotes,
      senNotes: record.senNotes,
      updatedAt: record.updatedAt,
      updatedByUserId: record.updatedByUserId,
    }) as unknown as MedicalRecordResponse;
  }
  async upsertMedical(
    athleteId: string,
    input: UpdateMedicalRecordInput,
    userId: string,
  ): Promise<MedicalRecordResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.upsertMedical(athleteId, input, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const current = await prisma.childMedicalRecord.findFirst({
      where: {
        athleteId,
        isCurrent: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    if (current) {
      await prisma.childMedicalRecord.update({
        where: {
          id: current.id,
        },
        data: {
          conditions: input.conditions ?? current.conditions,
          allergies: input.allergies ?? current.allergies,
          medications: input.medications ?? current.medications,
          restrictions: input.restrictions ?? current.restrictions,
          ...(input.doctorName !== undefined
            ? {
                doctorName: input.doctorName,
              }
            : {}),
          ...(input.doctorPhone !== undefined
            ? {
                doctorPhoneE164: input.doctorPhone,
              }
            : {}),
          ...(input.insuranceProvider !== undefined
            ? {
                insuranceProvider: input.insuranceProvider,
              }
            : {}),
          ...(input.insuranceNumber !== undefined
            ? {
                insuranceNumber: input.insuranceNumber,
              }
            : {}),
          ...(input.emergencyNotes !== undefined
            ? {
                emergencyNotes: input.emergencyNotes,
              }
            : {}),
          ...(input.senNotes !== undefined
            ? {
                senNotes: input.senNotes,
              }
            : {}),
          updatedByUserId: userId,
          version: {
            increment: 1,
          },
        },
      });
    } else {
      await prisma.childMedicalRecord.create({
        data: {
          id: newId('med'),
          athleteId,
          conditions: input.conditions ?? [],
          allergies: input.allergies ?? [],
          medications: input.medications ?? [],
          restrictions: input.restrictions ?? [],
          doctorName: input.doctorName ?? null,
          doctorPhoneE164: input.doctorPhone ?? null,
          insuranceProvider: input.insuranceProvider ?? null,
          insuranceNumber: input.insuranceNumber ?? null,
          emergencyNotes: input.emergencyNotes ?? null,
          senNotes: input.senNotes ?? null,
          isCurrent: true,
          createdByUserId: userId,
          updatedByUserId: userId,
          version: 1,
        },
      });
    }
    return this.getMedical(athleteId, userId);
  }
  async getEmergencyContacts(
    athleteId: string,
    userId: string,
  ): Promise<EmergencyContactsResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getEmergencyContacts(athleteId, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const contacts = await prisma.childEmergencyContact.findMany({
      where: {
        athleteId,
        deletedAt: null,
      },
      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
    if (contacts.length === 0) {
      return defaultEmergencyContacts(athleteId, userId);
    }
    return normalizeForJson({
      athleteId,
      contacts: contacts.map((contact) => ({
        id: toEmergencyContactContractId(contact.id),
        name: contact.name,
        relationship: contact.relationshipLabel,
        phone: contact.phoneE164,
        email: contact.email,
        isPrimary: contact.isPrimary,
        canPickup: contact.canPickup,
      })),
      updatedAt: contacts[0].updatedAt,
      updatedByUserId: contacts[0].updatedByUserId,
    }) as unknown as EmergencyContactsResponse;
  }
  async replaceEmergencyContacts(
    athleteId: string,
    input: UpdateEmergencyContactsInput,
    userId: string,
  ): Promise<EmergencyContactsResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.replaceEmergencyContacts(athleteId, input, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const normalized = normalizeEmergencyContacts(input.contacts);
    const deletedAt = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.childEmergencyContact.updateMany({
        where: {
          athleteId,
          deletedAt: null,
        },
        data: {
          deletedAt,
          deletedByUserId: userId,
          updatedByUserId: userId,
          version: {
            increment: 1,
          },
        },
      });
      if (normalized.length > 0) {
        await tx.childEmergencyContact.createMany({
          data: normalized.map((contact) => ({
            id: contact.id,
            athleteId,
            name: contact.name,
            relationshipLabel: contact.relationship,
            phoneE164: contact.phone,
            email: contact.email ?? null,
            isPrimary: contact.isPrimary,
            canPickup: contact.canPickup,
            createdByUserId: userId,
            updatedByUserId: userId,
            version: 1,
          })),
        });
      }
    });
    return this.getEmergencyContacts(athleteId, userId);
  }
  async getConsents(athleteId: string, userId: string): Promise<ConsentsResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getConsents(athleteId, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.childConsent.findMany({
      where: {
        athleteId,
        consentType: {
          in: EXPOSED_CONSENT_TYPES,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
    if (rows.length === 0) {
      return defaultConsents(athleteId, userId);
    }
    const userIds = [...new Set(rows.map((row) => row.grantedByUserId))];
    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    const byType = new Map(rows.map((row) => [row.consentType as ContractConsentType, row]));
    const userNameById = new Map(users.map((user) => [user.id, user.name]));
    const latest = rows[rows.length - 1];
    return normalizeForJson({
      athleteId,
      consents: EXPOSED_CONSENT_TYPES.map((type) => {
        const row = byType.get(type);
        if (!row) {
          return {
            type,
            granted: false,
            grantedBy: '',
          };
        }
        const metadata = (row.metadataJson ?? {}) as {
          grantedByLabel?: string;
        };
        return {
          type,
          granted: row.granted,
          grantedAt: coerceDateString(row.grantedAt) ?? undefined,
          grantedBy: metadata.grantedByLabel ?? userNameById.get(row.grantedByUserId) ?? '',
          expiryAt: coerceDateString(row.expiresAt) ?? undefined,
        };
      }),
      updatedAt: latest.createdAt,
      updatedByUserId: latest.grantedByUserId,
    }) as unknown as ConsentsResponse;
  }
  async replaceConsents(
    athleteId: string,
    input: UpsertConsentsInput,
    userId: string,
  ): Promise<ConsentsResponse> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.replaceConsents(athleteId, input, userId);
    }
    const prisma = getPrismaClientOrThrow();
    const providedByType = new Map(input.consents.map((consent) => [consent.type, consent]));
    await prisma.$transaction(async (tx) => {
      await tx.childConsent.deleteMany({
        where: {
          athleteId,
          consentType: {
            in: EXPOSED_CONSENT_TYPES,
          },
        },
      });
      await tx.childConsent.createMany({
        data: EXPOSED_CONSENT_TYPES.map((type) => {
          const consent = providedByType.get(type);
          return {
            id: newId('ccn'),
            athleteId,
            consentType: type,
            granted: consent?.granted ?? false,
            grantedByUserId: userId,
            grantedAt: consent?.granted ? new Date(consent.grantedAt ?? isoNow()) : null,
            expiresAt: consent?.expiryAt ? new Date(consent.expiryAt) : null,
            revokedAt: consent?.granted === false ? new Date() : null,
            supersededById: null,
            metadataJson: {
              grantedByLabel: consent?.grantedBy ?? '',
            },
          };
        }),
      });
    });
    return this.getConsents(athleteId, userId);
  }
}
const seedRepository = new StoreFamilyAthleteRepository(() => getMarketplaceSeedStore().tables);
const dbRepository = new PrismaFamilyAthleteRepository();
export function resolveFamilyAthleteRepository(): FamilyAthleteRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
