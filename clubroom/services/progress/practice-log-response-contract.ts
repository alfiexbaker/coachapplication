export interface ApiPracticeLogEntry {
  id: string;
  athleteId: string;
  authorUserId: string;
  dateKey: string;
  minutes: number;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPracticeLogListResponse {
  athleteId: string;
  logs: ApiPracticeLogEntry[];
  total: number;
  seedVersion: string | null;
  requestId: string;
}

export interface ApiPracticeLogTodayResponse {
  athleteId: string;
  log: ApiPracticeLogEntry | null;
  dateKey: string;
  timeZone: string;
  seedVersion: string | null;
  requestId: string;
}

export interface ApiPracticeLogMutationResponse {
  athleteId: string;
  log: ApiPracticeLogEntry;
  addedMinutes: number;
  created: boolean;
  replayed: boolean;
  timeZone: string;
  seedVersion: string | null;
  requestId: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isPrefixedId(value: unknown, prefix: string): value is string {
  return typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9-]+$`).test(value);
}

function isDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isMinutes(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 24 * 60;
}

function isOptionalSeedVersion(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isTimeZone(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 80;
}

function isApiPracticeLogEntry(value: unknown): value is ApiPracticeLogEntry {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'id',
      'athleteId',
      'authorUserId',
      'dateKey',
      'minutes',
      'note',
      'createdAt',
      'updatedAt',
    ]) &&
    isPrefixedId(value.id, 'plog') &&
    isPrefixedId(value.athleteId, 'ath') &&
    isPrefixedId(value.authorUserId, 'usr') &&
    isDateKey(value.dateKey) &&
    isMinutes(value.minutes) &&
    (value.note === null ||
      (typeof value.note === 'string' &&
        value.note.trim().length > 0 &&
        value.note.trim().length <= 1000)) &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt)
  );
}

export function parseApiPracticeLogListResponse(
  value: unknown,
  expectedAthleteId: string,
): ApiPracticeLogListResponse | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['athleteId', 'logs', 'total', 'seedVersion', 'requestId']) ||
    value.athleteId !== expectedAthleteId ||
    !Array.isArray(value.logs) ||
    value.logs.length > 100 ||
    !value.logs.every(
      (log) => isApiPracticeLogEntry(log) && log.athleteId === expectedAthleteId,
    ) ||
    typeof value.total !== 'number' ||
    !Number.isInteger(value.total) ||
    value.total < value.logs.length ||
    !isOptionalSeedVersion(value.seedVersion) ||
    !isRequestId(value.requestId)
  ) {
    return null;
  }
  return value as unknown as ApiPracticeLogListResponse;
}

export function parseApiPracticeLogTodayResponse(
  value: unknown,
  expectedAthleteId: string,
): ApiPracticeLogTodayResponse | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'athleteId',
      'log',
      'dateKey',
      'timeZone',
      'seedVersion',
      'requestId',
    ]) ||
    value.athleteId !== expectedAthleteId ||
    !isDateKey(value.dateKey) ||
    !isTimeZone(value.timeZone) ||
    !isOptionalSeedVersion(value.seedVersion) ||
    !isRequestId(value.requestId) ||
    !(
      value.log === null ||
      (isApiPracticeLogEntry(value.log) &&
        value.log.athleteId === expectedAthleteId &&
        value.log.dateKey === value.dateKey)
    )
  ) {
    return null;
  }
  return value as unknown as ApiPracticeLogTodayResponse;
}

export function parseApiPracticeLogMutationResponse(
  value: unknown,
  expectedAthleteId: string,
): ApiPracticeLogMutationResponse | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'athleteId',
      'log',
      'addedMinutes',
      'created',
      'replayed',
      'timeZone',
      'seedVersion',
      'requestId',
    ]) ||
    value.athleteId !== expectedAthleteId ||
    !isApiPracticeLogEntry(value.log) ||
    value.log.athleteId !== expectedAthleteId ||
    !isMinutes(value.addedMinutes) ||
    typeof value.created !== 'boolean' ||
    typeof value.replayed !== 'boolean' ||
    !isTimeZone(value.timeZone) ||
    !isOptionalSeedVersion(value.seedVersion) ||
    !isRequestId(value.requestId)
  ) {
    return null;
  }
  return value as unknown as ApiPracticeLogMutationResponse;
}
