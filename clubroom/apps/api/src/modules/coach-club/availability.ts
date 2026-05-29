import { getApiDataBackend } from '../../lib/data-backend.js';
import { getDbFixtureStore } from '../../lib/db-fixture-store.js';
import { getMarketplaceSeedStore } from '../../lib/marketplace-seed-store.js';
import { badRequest } from '../../lib/http-errors.js';
import { getPrismaClientOrThrow, shouldUseDbFixtureFallback } from '../../lib/prisma-runtime.js';
import { normalizeForJson } from '../../repositories/p0/normalize.js';
type SeedRow = Record<string, unknown>;
type SeedTables = Record<string, SeedRow[]>;
function toSeedRows<T>(values: T[]): SeedRow[] {
  return normalizeForJson(values) as unknown as SeedRow[];
}
export async function resolveCoachAvailabilityTables(coachUserId: string): Promise<{
  tables: SeedTables;
  dataVersion: string | null;
}> {
  if (getApiDataBackend() !== 'db') {
    const store = getMarketplaceSeedStore();
    return {
      tables: store.tables,
      dataVersion: store.version,
    };
  }
  if (shouldUseDbFixtureFallback()) {
    const store = getDbFixtureStore();
    return {
      tables: store.tables,
      dataVersion: store.version,
    };
  }
  const prisma = getPrismaClientOrThrow();
  const [
    availabilityTemplates,
    availabilityOverrides,
    schedulingRules,
    bookings,
    groupSessions,
    invites,
  ] = await Promise.all([
    prisma.availabilityTemplate.findMany({
      where: {
        coachUserId,
        active: true,
        deletedAt: null,
      },
    }),
    prisma.availabilityOverride.findMany({
      where: {
        coachUserId,
        active: true,
        deletedAt: null,
      },
    }),
    prisma.schedulingRule.findMany({
      where: {
        coachUserId,
      },
    }),
    prisma.booking.findMany({
      where: {
        coachUserId,
        deletedAt: null,
      },
    }),
    prisma.groupSession.findMany({
      where: {
        coachUserId,
        deletedAt: null,
      },
    }),
    prisma.invite.findMany({
      where: {
        senderUserId: coachUserId,
      },
    }),
  ]);
  const inviteIds = invites.map((invite) => invite.id);
  const inviteTargets =
    inviteIds.length > 0
      ? await prisma.inviteTarget.findMany({
          where: {
            inviteId: {
              in: inviteIds,
            },
          },
        })
      : [];
  return {
    tables: {
      availabilityTemplates: toSeedRows(availabilityTemplates),
      availabilityOverrides: toSeedRows(availabilityOverrides),
      schedulingRules: toSeedRows(schedulingRules),
      bookings: toSeedRows(bookings),
      groupSessions: toSeedRows(groupSessions),
      invites: toSeedRows(invites),
      inviteTargets: toSeedRows(inviteTargets),
    },
    dataVersion: null,
  };
}
export interface CoachAvailabilitySlot {
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  bookedCount: number;
  maxBookings: number;
  location?: string;
}
interface InternalCoachAvailabilitySlot extends CoachAvailabilitySlot {
  startsAt: Date;
  endsAt: Date;
  sessionTemplateId?: string;
}
interface BusyWindow {
  startsAt: Date;
  endsAt: Date;
  kind: 'booking' | 'group_session' | 'invite_hold';
}
const asRows = (value: unknown): SeedRow[] => (Array.isArray(value) ? (value as SeedRow[]) : []);
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const asNumber = (value: unknown): number | undefined =>
  typeof value === 'number' ? value : undefined;
const asBoolean = (value: unknown): boolean | undefined =>
  typeof value === 'boolean' ? value : undefined;
const asObject = (value: unknown): SeedRow | undefined =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as SeedRow) : undefined;
function getActiveRows(rows: SeedRow[]): SeedRow[] {
  return rows.filter((row) => row.active !== false && !asString(row.deletedAt));
}
function normalizeTime(value: string | undefined): string {
  return value?.slice(0, 5) ?? '00:00';
}
function toDateOnly(value: string | undefined): string {
  if (!value) {
    return '';
  }
  return value.includes('T') ? value.slice(0, 10) : value;
}
function buildUtcDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00.000Z`);
}
function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}
function overlaps(params: {
  leftStart: Date;
  leftEnd: Date;
  rightStart: Date;
  rightEnd: Date;
}): boolean {
  return params.leftStart < params.rightEnd && params.rightStart < params.leftEnd;
}
function getDateRangeWindow(
  startDate: string,
  endDate: string,
): {
  startsAt: Date;
  endsAt: Date;
} {
  const startsAt = buildUtcDateTime(startDate, '00:00');
  const inclusiveEnd = buildUtcDateTime(endDate, '00:00');
  return {
    startsAt,
    endsAt: addMinutes(inclusiveEnd, 24 * 60),
  };
}
function parseBooleanQueryValue(value: unknown): boolean {
  return value === true || value === 'true' || value === '1' || value === 1;
}
function getCoachSchedulingConfig(tables: SeedTables, coachUserId: string) {
  const rule = getActiveRows(asRows(tables.schedulingRules)).find(
    (row) => asString(row.coachUserId) === coachUserId,
  );
  return {
    minimumAdvanceBookingHours: Math.max(0, Number(rule?.minimumAdvanceBookingHours ?? 24)),
    maxAdvanceBookingDays: Math.max(1, Number(rule?.maxAdvanceBookingDays ?? 30)),
    bufferMinutesDefault: Math.max(0, Number(rule?.bufferMinutesDefault ?? 15)),
    maxConcurrentDefault: Math.max(1, Number(rule?.maxConcurrentDefault ?? 1)),
    allowSameDayBookings: rule?.allowSameDayBookings === true,
  };
}
function buildTemplateSlotsForDate(params: {
  date: string;
  durationMinutes: number;
  template: SeedRow;
  defaults: ReturnType<typeof getCoachSchedulingConfig>;
}): InternalCoachAvailabilitySlot[] {
  const startTime = normalizeTime(asString(params.template.startTimeLocal));
  const endTime = normalizeTime(asString(params.template.endTimeLocal));
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  const templateStartMinutes = startHour * 60 + startMinute;
  const templateEndMinutes = endHour * 60 + endMinute;
  const bufferMinutes = Math.max(
    0,
    Number(params.template.bufferMinutes ?? params.defaults.bufferMinutesDefault),
  );
  const maxBookings = Math.max(
    1,
    Number(params.template.maxConcurrent ?? params.defaults.maxConcurrentDefault),
  );
  const location = asString(params.template.location);
  const sessionTemplateId = asString(params.template.sessionTemplateId);
  const slots: InternalCoachAvailabilitySlot[] = [];
  for (
    let slotStart = templateStartMinutes;
    slotStart + params.durationMinutes <= templateEndMinutes;
    slotStart += params.durationMinutes + bufferMinutes
  ) {
    const slotStartHour = Math.floor(slotStart / 60);
    const slotStartMinute = slotStart % 60;
    const slotEndMinutes = slotStart + params.durationMinutes;
    const slotEndHour = Math.floor(slotEndMinutes / 60);
    const slotEndMinute = slotEndMinutes % 60;
    const slotStartTime = `${slotStartHour.toString().padStart(2, '0')}:${slotStartMinute.toString().padStart(2, '0')}`;
    const slotEndTime = `${slotEndHour.toString().padStart(2, '0')}:${slotEndMinute.toString().padStart(2, '0')}`;
    const startsAt = buildUtcDateTime(params.date, slotStartTime);
    const endsAt = buildUtcDateTime(params.date, slotEndTime);
    slots.push({
      date: params.date,
      startTime: slotStartTime,
      endTime: slotEndTime,
      isAvailable: true,
      bookedCount: 0,
      maxBookings,
      location,
      startsAt,
      endsAt,
      sessionTemplateId,
    });
  }
  return slots;
}
function pickTemplateForCustomSlot(params: {
  templates: SeedRow[];
  startTime: string;
  endTime: string;
}): SeedRow | null {
  const startMinutes = toMinutes(params.startTime);
  const endMinutes = toMinutes(params.endTime);
  if (startMinutes === null || endMinutes === null) {
    return params.templates[0] ?? null;
  }
  const containing = params.templates.find((template) => {
    const templateStart = toMinutes(normalizeTime(asString(template.startTimeLocal)));
    const templateEnd = toMinutes(normalizeTime(asString(template.endTimeLocal)));
    return (
      templateStart !== null &&
      templateEnd !== null &&
      templateStart <= startMinutes &&
      templateEnd >= endMinutes
    );
  });
  return containing ?? params.templates[0] ?? null;
}
function buildOverrideSlotsForDate(params: {
  date: string;
  override: SeedRow;
  dayTemplates: SeedRow[];
  defaults: ReturnType<typeof getCoachSchedulingConfig>;
}): InternalCoachAvailabilitySlot[] {
  const startTime = normalizeTime(asString(params.override.startTimeLocal));
  const endTime = normalizeTime(asString(params.override.endTimeLocal));
  if (!asString(params.override.startTimeLocal) || !asString(params.override.endTimeLocal)) {
    return [];
  }
  const sourceTemplate = pickTemplateForCustomSlot({
    templates: params.dayTemplates,
    startTime,
    endTime,
  });
  const startsAt = buildUtcDateTime(params.date, startTime);
  const endsAt = buildUtcDateTime(params.date, endTime);
  const location = asString(params.override.location) ?? asString(sourceTemplate?.location);
  const maxBookings = Math.max(
    1,
    Number(sourceTemplate?.maxConcurrent ?? params.defaults.maxConcurrentDefault),
  );
  return [
    {
      date: params.date,
      startTime,
      endTime,
      isAvailable: true,
      bookedCount: 0,
      maxBookings,
      location,
      startsAt,
      endsAt,
      sessionTemplateId: asString(sourceTemplate?.sessionTemplateId),
    },
  ];
}
function toMinutes(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}
function getBookingBusyWindows(params: {
  tables: SeedTables;
  coachUserId: string;
  rangeStart: Date;
  rangeEnd: Date;
}): BusyWindow[] {
  return getActiveRows(asRows(params.tables.bookings)).flatMap((item) =>
    ((row) =>
      asString(row.coachUserId) === params.coachUserId &&
      (asString(row.status) ?? '').toUpperCase() !== 'CANCELLED')(item)
      ? ((row) => {
          const mapped = (() => {
            const startsAtIso = asString(row.scheduledAt);
            const startsAt = startsAtIso ? new Date(startsAtIso) : null;
            const durationMinutes = Math.max(1, Number(row.durationMinutes ?? 60));
            if (!startsAt || Number.isNaN(startsAt.getTime())) {
              return null;
            }
            const endsAt = addMinutes(startsAt, durationMinutes);
            if (
              !overlaps({
                leftStart: startsAt,
                leftEnd: endsAt,
                rightStart: params.rangeStart,
                rightEnd: params.rangeEnd,
              })
            ) {
              return null;
            }
            return {
              startsAt,
              endsAt,
              kind: 'booking' as const,
            };
          })();
          return mapped !== null ? [mapped] : [];
        })(item)
      : [],
  ) as BusyWindow[];
}
function parseGroupScheduleEntries(value: unknown): Array<{
  startsAt: string;
  endsAt: string;
}> {
  return asRows(value).flatMap((row) => {
    const mapped = (() => {
      const startsAt = asString(row.startsAt);
      const endsAt = asString(row.endsAt);
      if (!startsAt || !endsAt) {
        return null;
      }
      return {
        startsAt,
        endsAt,
      };
    })();
    return mapped !== null ? [mapped] : [];
  });
}
function getGroupSessionBusyWindows(params: {
  tables: SeedTables;
  coachUserId: string;
  rangeStart: Date;
  rangeEnd: Date;
}): BusyWindow[] {
  return getActiveRows(asRows(params.tables.groupSessions)).flatMap((item) =>
    ((row) => asString(row.coachUserId) === params.coachUserId)(item)
      ? ((row) => {
          if (
            !(() => {
              const status = (asString(row.status) ?? '').toUpperCase();
              return status !== 'DRAFT' && status !== 'CANCELLED' && status !== 'COMPLETED';
            })()
          )
            return [];
          return parseGroupScheduleEntries(row.scheduleJson).flatMap((item1) => {
            const mapped = ((entry) => {
              const startsAt = new Date(entry.startsAt);
              const endsAt = new Date(entry.endsAt);
              if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
                return null;
              }
              if (
                !overlaps({
                  leftStart: startsAt,
                  leftEnd: endsAt,
                  rightStart: params.rangeStart,
                  rightEnd: params.rangeEnd,
                })
              ) {
                return null;
              }
              return {
                startsAt,
                endsAt,
                kind: 'group_session' as const,
              };
            })(item1);
            return ((window) => window !== null)(mapped) ? [mapped] : [];
          }) as BusyWindow[];
        })(item)
      : [],
  );
}
function isInviteDismissed(target: SeedRow | undefined): boolean {
  const responsePayload = asObject(target?.responsePayloadJson);
  return asBoolean(responsePayload?.dismissed) === true;
}
function buildInviteProposedSlotsFromMetadata(metadata: SeedRow | undefined): Array<{
  date: string;
  startTime: string;
  endTime: string;
}> {
  return asRows(metadata?.proposedSlots).flatMap((entry) => {
    const mapped = (() => {
      const date = asString(entry.date);
      const startTime = asString(entry.startTime);
      const endTime = asString(entry.endTime);
      if (!date || !startTime || !endTime) {
        return null;
      }
      return {
        date,
        startTime: normalizeTime(startTime),
        endTime: normalizeTime(endTime),
      };
    })();
    return mapped !== null ? [mapped] : [];
  });
}
function getInviteHoldBusyWindows(params: {
  tables: SeedTables;
  coachUserId: string;
  rangeStart: Date;
  rangeEnd: Date;
  now: Date;
}): BusyWindow[] {
  const inviteTargetsByInviteId = new Map<string, SeedRow[]>();
  for (const target of asRows(params.tables.inviteTargets)) {
    const inviteId = asString(target.inviteId);
    if (!inviteId) {
      continue;
    }
    const rows = inviteTargetsByInviteId.get(inviteId) ?? [];
    rows.push(target);
    inviteTargetsByInviteId.set(inviteId, rows);
  }
  return asRows(params.tables.invites).flatMap((row) => {
    if (
      asString(row.senderUserId) !== params.coachUserId ||
      asString(row.revokedAt) ||
      (asString(row.status) ?? 'PENDING').toUpperCase() !== 'PENDING'
    ) {
      return [];
    }
    const expiresAt = asString(row.expiresAt);
    if (expiresAt) {
      const parsed = new Date(expiresAt);
      if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= params.now.getTime()) {
        return [];
      }
    }
    const targets = inviteTargetsByInviteId.get(asString(row.id) ?? '') ?? [];
    const hasPendingTarget = targets.some((target) => {
      const status = (asString(target.status) ?? 'PENDING').toUpperCase();
      return status === 'PENDING' && !isInviteDismissed(target);
    });
    if (!hasPendingTarget) {
      return [];
    }
    const metadata = asObject(row.metadataJson);
    return buildInviteProposedSlotsFromMetadata(metadata).flatMap((slot) => {
      const startsAt = buildUtcDateTime(slot.date, slot.startTime);
      const endsAt = buildUtcDateTime(slot.date, slot.endTime);
      if (
        !overlaps({
          leftStart: startsAt,
          leftEnd: endsAt,
          rightStart: params.rangeStart,
          rightEnd: params.rangeEnd,
        })
      ) {
        return [];
      }
      return [{ startsAt, endsAt, kind: 'invite_hold' as const }];
    });
  });
}
function applySchedulingRuleFilter(params: {
  slot: InternalCoachAvailabilitySlot;
  rules: ReturnType<typeof getCoachSchedulingConfig>;
  now: Date;
}): boolean {
  if (params.slot.endsAt.getTime() <= params.now.getTime()) {
    return false;
  }
  const sameDay = params.slot.date === params.now.toISOString().slice(0, 10);
  if (sameDay && !params.rules.allowSameDayBookings) {
    return false;
  }
  const hoursUntilStart = (params.slot.startsAt.getTime() - params.now.getTime()) / 3_600_000;
  if (hoursUntilStart < params.rules.minimumAdvanceBookingHours) {
    return false;
  }
  const maxAdvanceHours = params.rules.maxAdvanceBookingDays * 24;
  if (hoursUntilStart > maxAdvanceHours) {
    return false;
  }
  return true;
}
export function resolveCoachAvailabilitySlots(params: {
  tables: SeedTables;
  coachUserId: string;
  startDate: string;
  endDate: string;
  durationMinutes: number;
  sessionTemplateId?: string;
  excludePendingInvites?: boolean;
  applySchedulingRules?: boolean;
  now?: Date;
}): CoachAvailabilitySlot[] {
  const now = params.now ?? new Date();
  const rules = getCoachSchedulingConfig(params.tables, params.coachUserId);
  const templates = getActiveRows(asRows(params.tables.availabilityTemplates)).filter(
    (row) => asString(row.coachUserId) === params.coachUserId,
  );
  const overrides = getActiveRows(asRows(params.tables.availabilityOverrides)).filter(
    (row) => asString(row.coachUserId) === params.coachUserId,
  );
  const range = getDateRangeWindow(params.startDate, params.endDate);
  const bookingWindows = getBookingBusyWindows({
    tables: params.tables,
    coachUserId: params.coachUserId,
    rangeStart: range.startsAt,
    rangeEnd: range.endsAt,
  });
  const groupSessionWindows = getGroupSessionBusyWindows({
    tables: params.tables,
    coachUserId: params.coachUserId,
    rangeStart: range.startsAt,
    rangeEnd: range.endsAt,
  });
  const inviteHoldWindows = params.excludePendingInvites
    ? getInviteHoldBusyWindows({
        tables: params.tables,
        coachUserId: params.coachUserId,
        rangeStart: range.startsAt,
        rangeEnd: range.endsAt,
        now,
      })
    : [];
  const excludePendingInvites = params.excludePendingInvites === true;
  const applySchedulingRules = params.applySchedulingRules === true;
  const templatesByDayOfWeek = new Map<number, SeedRow[]>();
  for (const template of templates) {
    const dayOfWeek = Number(template.dayOfWeek ?? -1);
    const existing = templatesByDayOfWeek.get(dayOfWeek);
    if (existing) {
      existing.push(template);
    } else {
      templatesByDayOfWeek.set(dayOfWeek, [template]);
    }
  }
  const overrideByDate = new Map(
    overrides.flatMap((row) => {
      const date = toDateOnly(asString(row.overrideDate));
      return date ? [[date, row] as const] : [];
    }),
  );
  const slots: InternalCoachAvailabilitySlot[] = [];
  for (
    let cursor = new Date(range.startsAt);
    cursor < range.endsAt;
    cursor = addMinutes(cursor, 24 * 60)
  ) {
    const date = cursor.toISOString().slice(0, 10);
    const dayOfWeek = cursor.getUTCDay();
    const dayTemplates = templatesByDayOfWeek.get(dayOfWeek) ?? [];
    const override = overrideByDate.get(date);
    let daySlots: InternalCoachAvailabilitySlot[] = [];
    if (override?.isBlocked === true) {
      continue;
    }
    if (override && asString(override.startTimeLocal) && asString(override.endTimeLocal)) {
      daySlots = buildOverrideSlotsForDate({
        date,
        override,
        dayTemplates,
        defaults: rules,
      });
    } else {
      daySlots = dayTemplates.flatMap((template) =>
        buildTemplateSlotsForDate({
          date,
          durationMinutes: params.durationMinutes,
          template,
          defaults: rules,
        }),
      );
    }
    for (const slot of daySlots) {
      if (
        params.sessionTemplateId &&
        slot.sessionTemplateId &&
        slot.sessionTemplateId !== params.sessionTemplateId
      ) {
        continue;
      }
      if (
        applySchedulingRules &&
        !applySchedulingRuleFilter({
          slot,
          rules,
          now,
        })
      ) {
        continue;
      }
      let bookedCount = bookingWindows.filter((window) =>
        overlaps({
          leftStart: slot.startsAt,
          leftEnd: slot.endsAt,
          rightStart: window.startsAt,
          rightEnd: window.endsAt,
        }),
      ).length;
      if (
        groupSessionWindows.some((window) =>
          overlaps({
            leftStart: slot.startsAt,
            leftEnd: slot.endsAt,
            rightStart: window.startsAt,
            rightEnd: window.endsAt,
          }),
        )
      ) {
        bookedCount = Math.max(bookedCount, slot.maxBookings);
      }
      if (
        excludePendingInvites &&
        inviteHoldWindows.some((window) =>
          overlaps({
            leftStart: slot.startsAt,
            leftEnd: slot.endsAt,
            rightStart: window.startsAt,
            rightEnd: window.endsAt,
          }),
        )
      ) {
        bookedCount = Math.max(bookedCount, slot.maxBookings);
      }
      slots.push({
        ...slot,
        bookedCount,
        isAvailable: bookedCount < slot.maxBookings,
      });
    }
  }
  return slots
    .sort((left, right) => left.startsAt.getTime() - right.startsAt.getTime())
    .map(
      ({ startsAt: _startsAt, endsAt: _endsAt, sessionTemplateId: _sessionTemplateId, ...slot }) =>
        slot,
    );
}
function getSlotQueryWindow(params: { scheduledAt: string; durationMinutes: number }): {
  date: string;
  startTime: string;
  endTime: string;
} {
  const startsAt = new Date(params.scheduledAt);
  if (Number.isNaN(startsAt.getTime())) {
    throw badRequest('scheduledAt must be a valid ISO datetime');
  }
  const endsAt = addMinutes(startsAt, params.durationMinutes);
  return {
    date: startsAt.toISOString().slice(0, 10),
    startTime: startsAt.toISOString().slice(11, 16),
    endTime: endsAt.toISOString().slice(11, 16),
  };
}
export function assertCoachAvailabilitySlotOpen(params: {
  tables: SeedTables;
  coachUserId: string;
  scheduledAt: string;
  durationMinutes: number;
  sessionTemplateId?: string;
  excludePendingInvites?: boolean;
  applySchedulingRules?: boolean;
  now?: Date;
}): CoachAvailabilitySlot {
  const { date, startTime, endTime } = getSlotQueryWindow({
    scheduledAt: params.scheduledAt,
    durationMinutes: params.durationMinutes,
  });
  const slots = resolveCoachAvailabilitySlots({
    tables: params.tables,
    coachUserId: params.coachUserId,
    startDate: date,
    endDate: date,
    durationMinutes: params.durationMinutes,
    sessionTemplateId: params.sessionTemplateId,
    excludePendingInvites: params.excludePendingInvites,
    applySchedulingRules: params.applySchedulingRules,
    now: params.now,
  });
  const slot = slots.find(
    (candidate) =>
      candidate.date === date && candidate.startTime === startTime && candidate.endTime === endTime,
  );
  if (!slot) {
    throw badRequest('Selected slot is outside the coach availability window', {
      coachUserId: params.coachUserId,
      date,
      startTime,
      endTime,
    });
  }
  if (!slot.isAvailable) {
    throw badRequest('Selected slot is no longer available', {
      coachUserId: params.coachUserId,
      date,
      startTime,
      endTime,
      bookedCount: slot.bookedCount,
      maxBookings: slot.maxBookings,
    });
  }
  return slot;
}
export function parseAvailabilitySlotQuery(query: Record<string, unknown>) {
  const startDate = asString(query.start);
  const endDate = asString(query.end);
  if (!startDate || !endDate) {
    throw badRequest('start and end query parameters are required');
  }
  const start = buildUtcDateTime(startDate, '00:00');
  const end = buildUtcDateTime(endDate, '00:00');
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start.getTime() > end.getTime()
  ) {
    throw badRequest('start and end must be valid ISO dates with start <= end');
  }
  const durationMinutes = Number(query.durationMinutes ?? 60);
  if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 1440) {
    throw badRequest('durationMinutes must be between 15 and 1440');
  }
  return {
    startDate,
    endDate,
    durationMinutes,
    sessionTemplateId: asString(query.sessionTemplateId),
    excludePendingInvites: parseBooleanQueryValue(query.excludePendingInvites),
    applySchedulingRules: parseBooleanQueryValue(query.applySchedulingRules),
  };
}
export function slotToScheduledAt(slot: { date: string; startTime: string }): string {
  return buildUtcDateTime(slot.date, slot.startTime).toISOString();
}
