export interface ApiSkillHistoryPoint {
  date: string;
  level: number;
}

export interface ApiSkillHistorySkill {
  skillName: string;
  category: string;
  currentLevel: number;
  previousLevel: number;
  changePercent: number;
  averageLevel?: number;
  history: ApiSkillHistoryPoint[];
}

export interface ApiSkillHistoryResponse {
  athleteId: string;
  skills: ApiSkillHistorySkill[];
  seedVersion: string | null;
  requestId: string;
}

export interface ApiSkillAssessment {
  id: string;
  athleteId: string;
  skillDefinitionId: string;
  assessorUserId: string;
  score: number;
  notes: string | null;
  bookingId: string | null;
  assessedAt: string;
  createdAt: string;
}

export interface ApiSkillDefinition {
  id: string;
  code: string;
  name: string;
  category: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiSkillUpdateResponse {
  athleteId: string;
  skillAssessment: ApiSkillAssessment;
  skillDefinition: ApiSkillDefinition;
  previousScore: number | null;
  score: number;
  replayed: boolean;
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

function isBoundedNumber(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum
  );
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maximum;
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

function isPrefixedId(value: unknown, prefix: string): value is string {
  return typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9-]+$`).test(value);
}

function isApiSkillAssessment(value: unknown): value is ApiSkillAssessment {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'id',
      'athleteId',
      'skillDefinitionId',
      'assessorUserId',
      'score',
      'notes',
      'bookingId',
      'assessedAt',
      'createdAt',
    ]) &&
    isPrefixedId(value.id, 'ska') &&
    isPrefixedId(value.athleteId, 'ath') &&
    isPrefixedId(value.skillDefinitionId, 'skd') &&
    isPrefixedId(value.assessorUserId, 'usr') &&
    isBoundedNumber(value.score, 1, 10) &&
    Number.isInteger(value.score) &&
    (value.notes === null || isBoundedText(value.notes, 1000)) &&
    (value.bookingId === null || isBoundedText(value.bookingId, 120)) &&
    isTimestamp(value.assessedAt) &&
    isTimestamp(value.createdAt)
  );
}

function isApiSkillDefinition(value: unknown): value is ApiSkillDefinition {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'id',
      'code',
      'name',
      'category',
      'description',
      'active',
      'createdAt',
      'updatedAt',
    ]) &&
    isPrefixedId(value.id, 'skd') &&
    typeof value.code === 'string' &&
    /^[A-Z0-9_]+$/.test(value.code) &&
    value.code.length <= 120 &&
    isBoundedText(value.name, 120) &&
    isBoundedText(value.category, 120) &&
    (value.description === null || isBoundedText(value.description, 500)) &&
    typeof value.active === 'boolean' &&
    isTimestamp(value.createdAt) &&
    isTimestamp(value.updatedAt)
  );
}

function isSkillHistoryPoint(value: unknown): value is ApiSkillHistoryPoint {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['date', 'level']) &&
    typeof value.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    isBoundedNumber(value.level, 0, 100)
  );
}

export function isApiSkillHistorySkill(value: unknown): value is ApiSkillHistorySkill {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      'skillName',
      'category',
      'currentLevel',
      'previousLevel',
      'changePercent',
      'averageLevel',
      'history',
    ]) &&
    isBoundedText(value.skillName, 120) &&
    isBoundedText(value.category, 120) &&
    isBoundedNumber(value.currentLevel, 0, 100) &&
    isBoundedNumber(value.previousLevel, 0, 100) &&
    typeof value.changePercent === 'number' &&
    Number.isFinite(value.changePercent) &&
    (value.averageLevel === undefined || isBoundedNumber(value.averageLevel, 0, 100)) &&
    Array.isArray(value.history) &&
    value.history.length > 0 &&
    value.history.every(isSkillHistoryPoint)
  );
}

export function parseApiSkillHistoryResponse(
  value: unknown,
  expectedAthleteId: string,
): ApiSkillHistoryResponse | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['athleteId', 'skills', 'seedVersion', 'requestId']) ||
    value.athleteId !== expectedAthleteId ||
    !Array.isArray(value.skills) ||
    !value.skills.every(isApiSkillHistorySkill) ||
    (value.seedVersion !== null && typeof value.seedVersion !== 'string') ||
    typeof value.requestId !== 'string' ||
    value.requestId.length === 0
  ) {
    return null;
  }

  return value as unknown as ApiSkillHistoryResponse;
}

export function parseApiSkillUpdateResponse(
  value: unknown,
  expectedAthleteId: string,
): ApiSkillUpdateResponse | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'athleteId',
      'skillAssessment',
      'skillDefinition',
      'previousScore',
      'score',
      'replayed',
      'seedVersion',
      'requestId',
    ]) ||
    value.athleteId !== expectedAthleteId ||
    !isApiSkillAssessment(value.skillAssessment) ||
    value.skillAssessment.athleteId !== expectedAthleteId ||
    !isApiSkillDefinition(value.skillDefinition) ||
    value.skillDefinition.id !== value.skillAssessment.skillDefinitionId ||
    !isBoundedNumber(value.score, 1, 10) ||
    !Number.isInteger(value.score) ||
    value.score !== value.skillAssessment.score ||
    !(
      value.previousScore === null ||
      (isBoundedNumber(value.previousScore, 1, 10) && Number.isInteger(value.previousScore))
    ) ||
    typeof value.replayed !== 'boolean' ||
    (value.seedVersion !== null && typeof value.seedVersion !== 'string') ||
    typeof value.requestId !== 'string' ||
    value.requestId.length === 0
  ) {
    return null;
  }

  return value as unknown as ApiSkillUpdateResponse;
}
