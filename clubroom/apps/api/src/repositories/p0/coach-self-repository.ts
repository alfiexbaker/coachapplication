import { randomUUID } from 'node:crypto';
import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { notFound } from '../../lib/http-errors.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from './normalize.js';

type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
type StoreShape = { version: string; tables: SeedTables };

const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const isoNow = () => new Date().toISOString();
const newId = (prefix: string) => `${prefix}_${randomUUID()}`;

function normalizeTime(value: string | undefined): string {
  return value?.slice(0, 5) ?? '00:00';
}

function toIsoDate(date: string): string {
  return `${date}T00:00:00.000Z`;
}

function isActiveStoreRow(row: SeedRow): boolean {
  return row.active !== false && !asString(row.deletedAt);
}

function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter(isActiveStoreRow);
}

function ensureTable(tables: SeedTables, key: string): SeedRow[] {
  if (!Array.isArray(tables[key])) {
    tables[key] = [];
  }
  return tables[key];
}

function toSeedRow<T>(value: T): SeedRow {
  return normalizeForJson(value) as unknown as SeedRow;
}

function toSeedRows<T>(values: T[]): SeedRow[] {
  return values.map((value) => toSeedRow(value));
}

export interface CoachProfileBundleResult {
  profile: SeedRow;
  locations: SeedRow[];
  availabilityTemplates: SeedRow[];
  availabilityOverrides: SeedRow[];
  schedulingRules: SeedRow[];
  cancellationPolicyRules: SeedRow[];
  dataVersion: string | null;
}

export interface CoachOfferingsResult {
  offerings: SeedRow[];
  dataVersion: string | null;
}

export interface CoachTemplateRowsResult {
  templates: SeedRow[];
  dataVersion: string | null;
}

export interface CoachOverrideRowsResult {
  overrides: SeedRow[];
  dataVersion: string | null;
}

export interface CoachSchedulingRowsResult {
  rulesRow: SeedRow | undefined;
  policyRows: SeedRow[];
  dataVersion: string | null;
}

export interface CoachSelfRepository {
  getProfileBundle(authUserId: string): Promise<CoachProfileBundleResult>;
  listOfferings(authUserId: string): Promise<CoachOfferingsResult>;
  listPublicOfferings(coachUserId: string): Promise<CoachOfferingsResult>;
  listAvailabilityTemplateRows(authUserId: string): Promise<CoachTemplateRowsResult>;
  createAvailabilityTemplate(authUserId: string, body: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxConcurrent?: number;
    bufferMinutes?: number;
    location?: string;
    sessionTemplateId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }>;
  updateAvailabilityTemplate(authUserId: string, templateId: string, body: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    maxConcurrent?: number;
    bufferMinutes?: number;
    location?: string;
    sessionTemplateId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }>;
  deleteAvailabilityTemplate(authUserId: string, templateId: string): Promise<{ dataVersion: string | null }>;
  listAvailabilityOverrideRows(authUserId: string, range?: { start?: string; end?: string }): Promise<CoachOverrideRowsResult>;
  createAvailabilityOverride(authUserId: string, body: {
    id?: string;
    date: string;
    isBlocked: boolean;
    reason?: string;
    customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
    repeatUntil?: string;
    repeatDayOfWeek?: number;
    repeatGroupId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }>;
  updateAvailabilityOverride(authUserId: string, overrideId: string, body: {
    date?: string;
    isBlocked?: boolean;
    reason?: string;
    customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
    repeatUntil?: string;
    repeatDayOfWeek?: number;
    repeatGroupId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }>;
  deleteAvailabilityOverride(authUserId: string, overrideId: string): Promise<{ dataVersion: string | null }>;
  getSchedulingRows(authUserId: string): Promise<CoachSchedulingRowsResult>;
  patchSchedulingRows(authUserId: string, body: {
    minimumAdvanceBookingHours?: number;
    maxAdvanceBookingDays?: number;
    bufferMinutesDefault?: number;
    maxConcurrentDefault?: number;
    allowSameDayBookings?: boolean;
    cancellationPolicy?: {
      name: string;
      description: string;
      tiers: Array<{ hoursBeforeSession: number; refundPercentage: number; description: string }>;
      minimumNoticeHours: number;
      allowCancellations: boolean;
      isDefault: boolean;
    } | null;
  }): Promise<CoachSchedulingRowsResult>;
}

class StoreCoachSelfRepository implements CoachSelfRepository {
  constructor(private readonly storeProvider: () => StoreShape) {}

  async getProfileBundle(authUserId: string): Promise<CoachProfileBundleResult> {
    const store = this.storeProvider();
    const profile = asRows(store.tables.coachProfiles).find((row) => asString(row.userId) === authUserId);
    if (!profile) {
      throw notFound('Coach profile not found', { userId: authUserId });
    }

    const schedulingRules = asRows(store.tables.schedulingRules).filter(
      (row) => asString(row.coachUserId) === authUserId,
    );
    const cancellationPolicyId = asString(schedulingRules[0]?.cancellationPolicyId);

    return {
      profile,
      locations: asRows(store.tables.coachLocations).filter((row) => asString(row.coachUserId) === authUserId),
      availabilityTemplates: asRows(store.tables.availabilityTemplates).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      availabilityOverrides: asRows(store.tables.availabilityOverrides).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      schedulingRules,
      cancellationPolicyRules: asRows(store.tables.cancellationPolicyRules).filter((row) =>
        asString(row.coachUserId) === authUserId
        || (cancellationPolicyId && asString(row.id) === cancellationPolicyId),
      ),
      dataVersion: store.version,
    };
  }

  async listOfferings(authUserId: string): Promise<CoachOfferingsResult> {
    const store = this.storeProvider();
    return {
      offerings: asRows(store.tables.coachingOfferings).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      dataVersion: store.version,
    };
  }

  async listPublicOfferings(coachUserId: string): Promise<CoachOfferingsResult> {
    const store = this.storeProvider();
    const profile = asRows(store.tables.coachProfiles).find(
      (row) => asString(row.userId) === coachUserId && !asString(row.deletedAt),
    );
    if (!profile) {
      throw notFound('Coach profile not found', { coachUserId });
    }

    return {
      offerings: getActiveRows(asRows(store.tables.coachingOfferings)).filter(
        (row) => asString(row.coachUserId) === coachUserId,
      ),
      dataVersion: store.version,
    };
  }

  async listAvailabilityTemplateRows(authUserId: string): Promise<CoachTemplateRowsResult> {
    const store = this.storeProvider();
    return {
      templates: getActiveRows(asRows(store.tables.availabilityTemplates)).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      dataVersion: store.version,
    };
  }

  async createAvailabilityTemplate(authUserId: string, body: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxConcurrent?: number;
    bufferMinutes?: number;
    location?: string;
    sessionTemplateId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    const store = this.storeProvider();
    const now = isoNow();
    const templates = ensureTable(store.tables, 'availabilityTemplates');
    const row: SeedRow = {
      id: body.id ?? `avt_${randomUUID()}`,
      coachUserId: authUserId,
      dayOfWeek: body.dayOfWeek,
      startTimeLocal: normalizeTime(body.startTime),
      endTimeLocal: normalizeTime(body.endTime),
      maxConcurrent: Number(body.maxConcurrent ?? 1),
      bufferMinutes: Number(body.bufferMinutes ?? 15),
      location: body.location ?? null,
      sessionTemplateId: body.sessionTemplateId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    templates.push(row);
    return { row, dataVersion: store.version };
  }

  async updateAvailabilityTemplate(authUserId: string, templateId: string, body: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    maxConcurrent?: number;
    bufferMinutes?: number;
    location?: string;
    sessionTemplateId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    const store = this.storeProvider();
    const templates = asRows(store.tables.availabilityTemplates);
    const row = getActiveRows(templates).find(
      (candidate) =>
        asString(candidate.id) === templateId && asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound('Availability template not found', { templateId });
    }

    if (body.dayOfWeek !== undefined) row.dayOfWeek = body.dayOfWeek;
    if (body.startTime !== undefined) row.startTimeLocal = normalizeTime(body.startTime);
    if (body.endTime !== undefined) row.endTimeLocal = normalizeTime(body.endTime);
    if (body.maxConcurrent !== undefined) row.maxConcurrent = Number(body.maxConcurrent);
    if (body.bufferMinutes !== undefined) row.bufferMinutes = Number(body.bufferMinutes);
    if (body.location !== undefined) row.location = body.location || null;
    if (body.sessionTemplateId !== undefined) row.sessionTemplateId = body.sessionTemplateId || null;
    row.updatedAt = isoNow();
    row.updatedByUserId = authUserId;
    row.version = Number(row.version ?? 1) + 1;

    return { row, dataVersion: store.version };
  }

  async deleteAvailabilityTemplate(
    authUserId: string,
    templateId: string,
  ): Promise<{ dataVersion: string | null }> {
    const store = this.storeProvider();
    const templates = asRows(store.tables.availabilityTemplates);
    const row = getActiveRows(templates).find(
      (candidate) =>
        asString(candidate.id) === templateId && asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound('Availability template not found', { templateId });
    }

    row.active = false;
    row.deletedAt = isoNow();
    row.deletedByUserId = authUserId;
    row.updatedAt = row.deletedAt;
    row.updatedByUserId = authUserId;

    return { dataVersion: store.version };
  }

  async listAvailabilityOverrideRows(
    authUserId: string,
    range?: { start?: string; end?: string },
  ): Promise<CoachOverrideRowsResult> {
    const store = this.storeProvider();
    const overrides = getActiveRows(asRows(store.tables.availabilityOverrides))
      .filter((row) => asString(row.coachUserId) === authUserId)
      .filter((row) => {
        const date = asString(row.overrideDate)?.slice(0, 10);
        if (!date) {
          return false;
        }
        return (!range?.start || date >= range.start) && (!range?.end || date <= range.end);
      });

    return {
      overrides,
      dataVersion: store.version,
    };
  }

  async createAvailabilityOverride(authUserId: string, body: {
    id?: string;
    date: string;
    isBlocked: boolean;
    reason?: string;
    customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
    repeatUntil?: string;
    repeatDayOfWeek?: number;
    repeatGroupId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    const store = this.storeProvider();
    const overrides = ensureTable(store.tables, 'availabilityOverrides');
    const customSlot = body.customSlots?.[0];
    const now = isoNow();
    const row: SeedRow = {
      id: body.id ?? `avo_${randomUUID()}`,
      coachUserId: authUserId,
      overrideDate: toIsoDate(body.date),
      isBlocked: body.isBlocked,
      reason: body.reason ?? null,
      startTimeLocal: customSlot ? normalizeTime(customSlot.startTime) : null,
      endTimeLocal: customSlot ? normalizeTime(customSlot.endTime) : null,
      location: customSlot?.location ?? null,
      repeatUntil: body.repeatUntil ? toIsoDate(body.repeatUntil) : null,
      repeatDayOfWeek: body.repeatDayOfWeek ?? null,
      repeatGroupId: body.repeatGroupId ?? null,
      active: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: authUserId,
      updatedByUserId: authUserId,
      version: 1,
      deletedAt: null,
      deletedByUserId: null,
    };
    overrides.push(row);
    return { row, dataVersion: store.version };
  }

  async updateAvailabilityOverride(authUserId: string, overrideId: string, body: {
    date?: string;
    isBlocked?: boolean;
    reason?: string;
    customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
    repeatUntil?: string;
    repeatDayOfWeek?: number;
    repeatGroupId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    const store = this.storeProvider();
    const overrides = asRows(store.tables.availabilityOverrides);
    const row = getActiveRows(overrides).find(
      (candidate) =>
        asString(candidate.id) === overrideId && asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound('Availability override not found', { overrideId });
    }

    const customSlot = body.customSlots?.[0];
    if (body.date !== undefined) row.overrideDate = toIsoDate(body.date);
    if (body.isBlocked !== undefined) row.isBlocked = body.isBlocked;
    if (body.reason !== undefined) row.reason = body.reason || null;
    if (body.customSlots !== undefined) {
      row.startTimeLocal = customSlot ? normalizeTime(customSlot.startTime) : null;
      row.endTimeLocal = customSlot ? normalizeTime(customSlot.endTime) : null;
      row.location = customSlot?.location ?? null;
    }
    if (body.repeatUntil !== undefined) row.repeatUntil = body.repeatUntil ? toIsoDate(body.repeatUntil) : null;
    if (body.repeatDayOfWeek !== undefined) row.repeatDayOfWeek = body.repeatDayOfWeek;
    if (body.repeatGroupId !== undefined) row.repeatGroupId = body.repeatGroupId || null;
    row.updatedAt = isoNow();
    row.updatedByUserId = authUserId;
    row.version = Number(row.version ?? 1) + 1;

    return { row, dataVersion: store.version };
  }

  async deleteAvailabilityOverride(
    authUserId: string,
    overrideId: string,
  ): Promise<{ dataVersion: string | null }> {
    const store = this.storeProvider();
    const overrides = asRows(store.tables.availabilityOverrides);
    const row = getActiveRows(overrides).find(
      (candidate) =>
        asString(candidate.id) === overrideId && asString(candidate.coachUserId) === authUserId,
    );
    if (!row) {
      throw notFound('Availability override not found', { overrideId });
    }

    row.active = false;
    row.deletedAt = isoNow();
    row.deletedByUserId = authUserId;
    row.updatedAt = row.deletedAt;
    row.updatedByUserId = authUserId;

    return { dataVersion: store.version };
  }

  async getSchedulingRows(authUserId: string): Promise<CoachSchedulingRowsResult> {
    const store = this.storeProvider();
    return {
      rulesRow: asRows(store.tables.schedulingRules).find(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      policyRows: getActiveRows(asRows(store.tables.cancellationPolicyRules)).filter(
        (row) => asString(row.coachUserId) === authUserId,
      ),
      dataVersion: store.version,
    };
  }

  async patchSchedulingRows(authUserId: string, body: {
    minimumAdvanceBookingHours?: number;
    maxAdvanceBookingDays?: number;
    bufferMinutesDefault?: number;
    maxConcurrentDefault?: number;
    allowSameDayBookings?: boolean;
    cancellationPolicy?: {
      name: string;
      description: string;
      tiers: Array<{ hoursBeforeSession: number; refundPercentage: number; description: string }>;
      minimumNoticeHours: number;
      allowCancellations: boolean;
      isDefault: boolean;
    } | null;
  }): Promise<CoachSchedulingRowsResult> {
    const store = this.storeProvider();
    const rulesRows = ensureTable(store.tables, 'schedulingRules');
    const policyRows = ensureTable(store.tables, 'cancellationPolicyRules');
    const now = isoNow();

    let rulesRow = rulesRows.find((row) => asString(row.coachUserId) === authUserId);
    if (!rulesRow) {
      rulesRow = {
        coachUserId: authUserId,
        createdAt: now,
        updatedAt: now,
        minimumAdvanceBookingHours: 24,
        maxAdvanceBookingDays: 30,
        bufferMinutesDefault: 15,
        maxConcurrentDefault: 1,
        allowSameDayBookings: false,
        confirmationMode: 'manual',
        cancellationPolicyId: null,
      };
      rulesRows.push(rulesRow);
    }

    if (body.minimumAdvanceBookingHours !== undefined) {
      rulesRow.minimumAdvanceBookingHours = Number(body.minimumAdvanceBookingHours);
    }
    if (body.maxAdvanceBookingDays !== undefined) {
      rulesRow.maxAdvanceBookingDays = Number(body.maxAdvanceBookingDays);
    }
    if (body.bufferMinutesDefault !== undefined) {
      rulesRow.bufferMinutesDefault = Number(body.bufferMinutesDefault);
    }
    if (body.maxConcurrentDefault !== undefined) {
      rulesRow.maxConcurrentDefault = Number(body.maxConcurrentDefault);
    }
    if (body.allowSameDayBookings !== undefined) {
      rulesRow.allowSameDayBookings = body.allowSameDayBookings;
    }

    if (body.cancellationPolicy !== undefined) {
      rulesRow.cancellationPolicyId = null;
      for (const row of policyRows) {
        if (asString(row.coachUserId) === authUserId && !asString(row.deletedAt)) {
          row.active = false;
          row.deletedAt = now;
          row.deletedByUserId = authUserId;
          row.updatedAt = now;
          row.updatedByUserId = authUserId;
        }
      }

      if (body.cancellationPolicy) {
        const nextPolicyId = `cpr_${randomUUID()}`;
        body.cancellationPolicy.tiers.forEach((tier, index) => {
          policyRows.push({
            id: index === 0 ? nextPolicyId : `cpr_${randomUUID()}`,
            coachUserId: authUserId,
            name: body.cancellationPolicy?.name ?? 'Cancellation policy',
            description: body.cancellationPolicy?.description ?? null,
            noticeHoursMin: Number(tier.hoursBeforeSession),
            refundPercent: Number(tier.refundPercentage),
            active: true,
            appliesToNoShow: Number(tier.hoursBeforeSession) === 0,
            feeMinor: null,
            currency: 'GBP',
            sortOrder: index + 1,
            isDefault: body.cancellationPolicy?.isDefault ?? false,
            createdAt: now,
            updatedAt: now,
            createdByUserId: authUserId,
            updatedByUserId: authUserId,
            version: 1,
            deletedAt: null,
            deletedByUserId: null,
          });
        });
        rulesRow.cancellationPolicyId = nextPolicyId;
      }
    }

    rulesRow.updatedAt = now;

    return this.getSchedulingRows(authUserId);
  }
}

class PrismaCoachSelfRepository implements CoachSelfRepository {
  private readonly fallback = new StoreCoachSelfRepository(() => getDbFixtureStore());

  async getProfileBundle(authUserId: string): Promise<CoachProfileBundleResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getProfileBundle(authUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const [profile, locations, availabilityTemplates, availabilityOverrides, rulesRow, policyRows] =
      await Promise.all([
        prisma.coachProfile.findFirst({
          where: { userId: authUserId, deletedAt: null },
        }),
        prisma.coachLocation.findMany({
          where: { coachUserId: authUserId },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.availabilityTemplate.findMany({
          where: { coachUserId: authUserId },
          orderBy: [{ dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }],
        }),
        prisma.availabilityOverride.findMany({
          where: { coachUserId: authUserId },
          orderBy: [{ overrideDate: 'asc' }, { startTimeLocal: 'asc' }],
        }),
        prisma.schedulingRule.findUnique({
          where: { coachUserId: authUserId },
        }),
        prisma.cancellationPolicyRule.findMany({
          where: { coachUserId: authUserId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
      ]);

    if (!profile) {
      throw notFound('Coach profile not found', { userId: authUserId });
    }

    return {
      profile: toSeedRow(profile),
      locations: toSeedRows(locations),
      availabilityTemplates: toSeedRows(availabilityTemplates),
      availabilityOverrides: toSeedRows(availabilityOverrides),
      schedulingRules: rulesRow ? [toSeedRow(rulesRow)] : [],
      cancellationPolicyRules: toSeedRows(policyRows),
      dataVersion: null,
    };
  }

  async listOfferings(authUserId: string): Promise<CoachOfferingsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listOfferings(authUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const offerings = await prisma.coachingOffering.findMany({
      where: { coachUserId: authUserId },
      orderBy: { createdAt: 'asc' },
    });

    return {
      offerings: toSeedRows(offerings),
      dataVersion: null,
    };
  }

  async listPublicOfferings(coachUserId: string): Promise<CoachOfferingsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listPublicOfferings(coachUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const profile = await prisma.coachProfile.findFirst({
      where: { userId: coachUserId, deletedAt: null },
      select: { userId: true },
    });
    if (!profile) {
      throw notFound('Coach profile not found', { coachUserId });
    }

    const offerings = await prisma.coachingOffering.findMany({
      where: {
        coachUserId,
        active: true,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      offerings: toSeedRows(offerings),
      dataVersion: null,
    };
  }

  async listAvailabilityTemplateRows(authUserId: string): Promise<CoachTemplateRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listAvailabilityTemplateRows(authUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const templates = await prisma.availabilityTemplate.findMany({
      where: { coachUserId: authUserId, active: true, deletedAt: null },
      orderBy: [{ dayOfWeek: 'asc' }, { startTimeLocal: 'asc' }],
    });
    return {
      templates: toSeedRows(templates),
      dataVersion: null,
    };
  }

  async createAvailabilityTemplate(authUserId: string, body: {
    id?: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    maxConcurrent?: number;
    bufferMinutes?: number;
    location?: string;
    sessionTemplateId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createAvailabilityTemplate(authUserId, body);
    }

    const prisma = getPrismaClientOrThrow();
    const row = await prisma.availabilityTemplate.create({
      data: {
        id: body.id ?? `avt_${randomUUID()}`,
        coachUserId: authUserId,
        dayOfWeek: body.dayOfWeek,
        startTimeLocal: normalizeTime(body.startTime),
        endTimeLocal: normalizeTime(body.endTime),
        maxConcurrent: Number(body.maxConcurrent ?? 1),
        bufferMinutes: Number(body.bufferMinutes ?? 15),
        location: body.location ?? null,
        sessionTemplateId: body.sessionTemplateId ?? null,
        active: true,
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
        version: 1n,
      },
    });
    return { row: toSeedRow(row), dataVersion: null };
  }

  async updateAvailabilityTemplate(authUserId: string, templateId: string, body: {
    dayOfWeek?: number;
    startTime?: string;
    endTime?: string;
    maxConcurrent?: number;
    bufferMinutes?: number;
    location?: string;
    sessionTemplateId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateAvailabilityTemplate(authUserId, templateId, body);
    }

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityTemplate.findFirst({
      where: { id: templateId, coachUserId: authUserId, active: true, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Availability template not found', { templateId });
    }

    const row = await prisma.availabilityTemplate.update({
      where: { id: templateId },
      data: {
        ...(body.dayOfWeek !== undefined ? { dayOfWeek: body.dayOfWeek } : {}),
        ...(body.startTime !== undefined ? { startTimeLocal: normalizeTime(body.startTime) } : {}),
        ...(body.endTime !== undefined ? { endTimeLocal: normalizeTime(body.endTime) } : {}),
        ...(body.maxConcurrent !== undefined ? { maxConcurrent: Number(body.maxConcurrent) } : {}),
        ...(body.bufferMinutes !== undefined ? { bufferMinutes: Number(body.bufferMinutes) } : {}),
        ...(body.location !== undefined ? { location: body.location || null } : {}),
        ...(body.sessionTemplateId !== undefined
          ? { sessionTemplateId: body.sessionTemplateId || null }
          : {}),
        updatedByUserId: authUserId,
        version: (existing.version ?? 1n) + 1n,
      },
    });

    return { row: toSeedRow(row), dataVersion: null };
  }

  async deleteAvailabilityTemplate(
    authUserId: string,
    templateId: string,
  ): Promise<{ dataVersion: string | null }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteAvailabilityTemplate(authUserId, templateId);
    }

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityTemplate.findFirst({
      where: { id: templateId, coachUserId: authUserId, active: true, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Availability template not found', { templateId });
    }

    await prisma.availabilityTemplate.update({
      where: { id: templateId },
      data: {
        active: false,
        deletedAt: new Date(),
        deletedByUserId: authUserId,
        updatedByUserId: authUserId,
      },
    });
    return { dataVersion: null };
  }

  async listAvailabilityOverrideRows(
    authUserId: string,
    range?: { start?: string; end?: string },
  ): Promise<CoachOverrideRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.listAvailabilityOverrideRows(authUserId, range);
    }

    const prisma = getPrismaClientOrThrow();
    const rows = await prisma.availabilityOverride.findMany({
      where: {
        coachUserId: authUserId,
        active: true,
        deletedAt: null,
        ...(range?.start || range?.end
          ? {
              overrideDate: {
                ...(range?.start ? { gte: new Date(toIsoDate(range.start)) } : {}),
                ...(range?.end ? { lte: new Date(toIsoDate(range.end)) } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ overrideDate: 'asc' }, { startTimeLocal: 'asc' }],
    });
    return {
      overrides: toSeedRows(rows),
      dataVersion: null,
    };
  }

  async createAvailabilityOverride(authUserId: string, body: {
    id?: string;
    date: string;
    isBlocked: boolean;
    reason?: string;
    customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
    repeatUntil?: string;
    repeatDayOfWeek?: number;
    repeatGroupId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.createAvailabilityOverride(authUserId, body);
    }

    const prisma = getPrismaClientOrThrow();
    const customSlot = body.customSlots?.[0];
    const row = await prisma.availabilityOverride.create({
      data: {
        id: body.id ?? `avo_${randomUUID()}`,
        coachUserId: authUserId,
        overrideDate: new Date(toIsoDate(body.date)),
        isBlocked: body.isBlocked,
        reason: body.reason ?? null,
        startTimeLocal: customSlot ? normalizeTime(customSlot.startTime) : null,
        endTimeLocal: customSlot ? normalizeTime(customSlot.endTime) : null,
        location: customSlot?.location ?? null,
        repeatUntil: body.repeatUntil ? new Date(toIsoDate(body.repeatUntil)) : null,
        repeatDayOfWeek: body.repeatDayOfWeek ?? null,
        repeatGroupId: body.repeatGroupId ?? null,
        active: true,
        createdByUserId: authUserId,
        updatedByUserId: authUserId,
        version: 1n,
      },
    });
    return { row: toSeedRow(row), dataVersion: null };
  }

  async updateAvailabilityOverride(authUserId: string, overrideId: string, body: {
    date?: string;
    isBlocked?: boolean;
    reason?: string;
    customSlots?: Array<{ startTime: string; endTime: string; location?: string }>;
    repeatUntil?: string;
    repeatDayOfWeek?: number;
    repeatGroupId?: string;
  }): Promise<{ row: SeedRow; dataVersion: string | null }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.updateAvailabilityOverride(authUserId, overrideId, body);
    }

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityOverride.findFirst({
      where: { id: overrideId, coachUserId: authUserId, active: true, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Availability override not found', { overrideId });
    }

    const customSlot = body.customSlots?.[0];
    const row = await prisma.availabilityOverride.update({
      where: { id: overrideId },
      data: {
        ...(body.date !== undefined ? { overrideDate: new Date(toIsoDate(body.date)) } : {}),
        ...(body.isBlocked !== undefined ? { isBlocked: body.isBlocked } : {}),
        ...(body.reason !== undefined ? { reason: body.reason || null } : {}),
        ...(body.customSlots !== undefined
          ? {
              startTimeLocal: customSlot ? normalizeTime(customSlot.startTime) : null,
              endTimeLocal: customSlot ? normalizeTime(customSlot.endTime) : null,
              location: customSlot?.location ?? null,
            }
          : {}),
        ...(body.repeatUntil !== undefined
          ? { repeatUntil: body.repeatUntil ? new Date(toIsoDate(body.repeatUntil)) : null }
          : {}),
        ...(body.repeatDayOfWeek !== undefined ? { repeatDayOfWeek: body.repeatDayOfWeek } : {}),
        ...(body.repeatGroupId !== undefined ? { repeatGroupId: body.repeatGroupId || null } : {}),
        updatedByUserId: authUserId,
        version: (existing.version ?? 1n) + 1n,
      },
    });
    return { row: toSeedRow(row), dataVersion: null };
  }

  async deleteAvailabilityOverride(
    authUserId: string,
    overrideId: string,
  ): Promise<{ dataVersion: string | null }> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.deleteAvailabilityOverride(authUserId, overrideId);
    }

    const prisma = getPrismaClientOrThrow();
    const existing = await prisma.availabilityOverride.findFirst({
      where: { id: overrideId, coachUserId: authUserId, active: true, deletedAt: null },
    });
    if (!existing) {
      throw notFound('Availability override not found', { overrideId });
    }

    await prisma.availabilityOverride.update({
      where: { id: overrideId },
      data: {
        active: false,
        deletedAt: new Date(),
        deletedByUserId: authUserId,
        updatedByUserId: authUserId,
      },
    });
    return { dataVersion: null };
  }

  async getSchedulingRows(authUserId: string): Promise<CoachSchedulingRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.getSchedulingRows(authUserId);
    }

    const prisma = getPrismaClientOrThrow();
    const [rulesRow, policyRows] = await Promise.all([
      prisma.schedulingRule.findUnique({ where: { coachUserId: authUserId } }),
      prisma.cancellationPolicyRule.findMany({
        where: { coachUserId: authUserId, active: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    return {
      rulesRow: rulesRow ? toSeedRow(rulesRow) : undefined,
      policyRows: toSeedRows(policyRows),
      dataVersion: null,
    };
  }

  async patchSchedulingRows(authUserId: string, body: {
    minimumAdvanceBookingHours?: number;
    maxAdvanceBookingDays?: number;
    bufferMinutesDefault?: number;
    maxConcurrentDefault?: number;
    allowSameDayBookings?: boolean;
    cancellationPolicy?: {
      name: string;
      description: string;
      tiers: Array<{ hoursBeforeSession: number; refundPercentage: number; description: string }>;
      minimumNoticeHours: number;
      allowCancellations: boolean;
      isDefault: boolean;
    } | null;
  }): Promise<CoachSchedulingRowsResult> {
    if (shouldUseDbFixtureFallback()) {
      return this.fallback.patchSchedulingRows(authUserId, body);
    }

    const prisma = getPrismaClientOrThrow();
    await prisma.$transaction(async (tx) => {
      const existing = await tx.schedulingRule.findUnique({
        where: { coachUserId: authUserId },
      });
      const now = new Date();
      let nextCancellationPolicyId =
        body.cancellationPolicy !== undefined
          ? null
          : (existing?.cancellationPolicyId ?? null);

      if (body.cancellationPolicy !== undefined) {
        await tx.cancellationPolicyRule.updateMany({
          where: { coachUserId: authUserId, active: true, deletedAt: null },
          data: {
            active: false,
            deletedAt: now,
            deletedByUserId: authUserId,
            updatedAt: now,
            updatedByUserId: authUserId,
          },
        });

        if (body.cancellationPolicy) {
          const primaryId = newId('cpr');
          await Promise.all(
            body.cancellationPolicy.tiers.map((tier, index) =>
              tx.cancellationPolicyRule.create({
                data: {
                  id: index === 0 ? primaryId : newId('cpr'),
                  coachUserId: authUserId,
                  name: body.cancellationPolicy?.name ?? 'Cancellation policy',
                  description: body.cancellationPolicy?.description ?? null,
                  noticeHoursMin: Number(tier.hoursBeforeSession),
                  refundPercent: Number(tier.refundPercentage),
                  feeMinor: null,
                  currency: 'GBP',
                  appliesToNoShow: Number(tier.hoursBeforeSession) === 0,
                  sortOrder: index + 1,
                  isDefault: body.cancellationPolicy?.isDefault ?? false,
                  active: true,
                  createdByUserId: authUserId,
                  updatedByUserId: authUserId,
                  version: 1n,
                },
              }),
            ),
          );
          nextCancellationPolicyId = primaryId;
        }
      }

      const nextData = {
        minimumAdvanceBookingHours:
          body.minimumAdvanceBookingHours ?? existing?.minimumAdvanceBookingHours ?? 24,
        maxAdvanceBookingDays:
          body.maxAdvanceBookingDays ?? existing?.maxAdvanceBookingDays ?? 30,
        bufferMinutesDefault:
          body.bufferMinutesDefault ?? existing?.bufferMinutesDefault ?? 15,
        maxConcurrentDefault:
          body.maxConcurrentDefault ?? existing?.maxConcurrentDefault ?? 1,
        allowSameDayBookings:
          body.allowSameDayBookings ?? existing?.allowSameDayBookings ?? false,
        confirmationMode: existing?.confirmationMode ?? 'manual',
        cancellationPolicyId: nextCancellationPolicyId,
      };

      if (existing) {
        await tx.schedulingRule.update({
          where: { coachUserId: authUserId },
          data: nextData,
        });
      } else {
        await tx.schedulingRule.create({
          data: {
            coachUserId: authUserId,
            ...nextData,
          },
        });
      }
    });

    return this.getSchedulingRows(authUserId);
  }
}

const seedRepository = new StoreCoachSelfRepository(() => getMarketplaceSeedStore());
const dbRepository = new PrismaCoachSelfRepository();

export function resolveCoachSelfRepository(): CoachSelfRepository {
  return getApiDataBackend() === 'db' ? dbRepository : seedRepository;
}
