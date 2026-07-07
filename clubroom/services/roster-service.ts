/**
 * Roster Service
 *
 * Handles coach athlete roster/directory management.
 * Provides athlete details, notes, and quick actions.
 *
 * Extends BaseService<RosterEntry> for standardized CRUD, caching (Map-based,
 * 30s TTL, O(1) getById), and storage operations.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/roster - Get roster
 * - GET /api/coaches/:id/roster/:athleteId - Get detail
 * - POST /api/coaches/:id/roster/:athleteId/notes - Add note
 * - PATCH /api/coaches/:id/roster/:athleteId - Update status/tags
 * - DELETE /api/coaches/:id/roster/:athleteId - Remove athlete
 * - GET /api/coaches/:id/roster/removed - Get removal history
 */

import { apiClient, apiFetch } from './api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { RosterNote, FootballObjective, RosterEntry } from '@/constants/types';
import {
  type Result,
  type ServiceError,
  ok,
  err,
  notFound,
  validationError,
  storageError,
  unsupportedError,
} from '@/types/result';
import { BaseService } from './base-service';
import { createLogger } from '@/utils/logger';
import { userService } from './user-service';
import { verificationService } from './verification-service';
import { emitTyped, ServiceEvents } from './event-bus';
import { normalizeLegacyMockDates } from '@/utils/mock-date-normalizer';

const logger = createLogger('RosterService');

/** Canonical list of roster statuses — use for filter chips, dropdowns, etc. */
export const ROSTER_STATUSES: readonly RosterEntry['status'][] = [
  'ACTIVE',
  'PAUSED',
  'GRADUATED',
  'INACTIVE',
] as const;

const STATUS_LABELS: Record<RosterEntry['status'], string> = {
  ACTIVE: 'Active',
  PAUSED: 'Paused',
  GRADUATED: 'Graduated',
  INACTIVE: 'Inactive',
};

const STATUS_COLORS: Record<RosterEntry['status'], string> = {
  ACTIVE: '#16A34A',
  PAUSED: '#CA8A04',
  GRADUATED: '#2563EB',
  INACTIVE: '#6B7280',
};

const USE_MOCK = api.useMock;

function rosterApiUnsupported(action: string, route = '/v1/coaches/:coachId/roster'): ServiceError {
  return unsupportedError(`${action} requires backend roster authority in API mode.`, { route });
}

async function resolveUserName(userId: string, fallback: string): Promise<string> {
  const userResult = await userService.getUserById(userId);
  if (!userResult.success) return fallback;
  return userResult.data.name || fallback;
}

export type RemovalReason = 'GRADUATED' | 'MOVED' | 'INACTIVE' | 'OTHER';

export interface AthleteRemovalRecord {
  id: string;
  coachId: string;
  athleteId: string;
  reason: RemovalReason;
  customReason?: string;
  archived: boolean; // true = archived (keep history), false = deleted
  removedAt: string;
  previousStatus: RosterEntry['status'];
  totalSessions: number;
  totalRevenue: number;
  // Store the full entry for potential undo
  originalEntry?: RosterEntry;
}

// Mock roster data
const MOCK_ROSTER: RosterEntry[] = normalizeLegacyMockDates([
  {
    id: 'roster_1',
    coachId: 'coach1',
    athleteId: 'user1',
    parentId: 'parent1',
    status: 'ACTIVE',
    startDate: '2025-06-15',
    lastSessionDate: '2026-01-08',
    nextSessionDate: '2026-01-15',
    totalSessions: 24,
    totalRevenue: 1440,
    averageRating: 4.5,
    notes: [
      {
        id: 'note_1',
        content: 'Strong dribbler, needs work on weak foot',
        createdAt: '2025-12-01T10:00:00Z',
      },
      {
        id: 'note_2',
        content: 'Very motivated, responds well to challenges',
        createdAt: '2026-01-05T14:00:00Z',
      },
    ],
    tags: ['striker', 'high-potential', 'academy-track'],
    primaryFocus: 'Finishing',
    notificationPreference: 'ALL',
  },
  {
    id: 'roster_2',
    coachId: 'coach1',
    athleteId: 'user2',
    parentId: 'parent1',
    status: 'ACTIVE',
    startDate: '2025-09-01',
    lastSessionDate: '2026-01-05',
    nextSessionDate: '2026-01-12',
    totalSessions: 12,
    totalRevenue: 720,
    averageRating: 4.8,
    notes: [
      {
        id: 'note_3',
        content: 'Excellent attitude, picks up skills quickly',
        createdAt: '2025-11-15T09:00:00Z',
      },
    ],
    tags: ['midfielder', 'new-starter'],
    primaryFocus: 'Passing',
    notificationPreference: 'ALL',
  },
  {
    id: 'roster_3',
    coachId: 'coach1',
    athleteId: 'user3',
    parentId: 'parent2',
    status: 'ACTIVE',
    startDate: '2024-03-10',
    lastSessionDate: '2026-01-10',
    nextSessionDate: '2026-01-17',
    totalSessions: 48,
    totalRevenue: 2880,
    averageRating: 4.7,
    notes: [
      {
        id: 'note_4',
        content: 'Team captain material, great leadership',
        createdAt: '2025-10-20T11:00:00Z',
      },
      {
        id: 'note_5',
        content: 'Working towards academy trials in March',
        createdAt: '2026-01-10T16:00:00Z',
      },
    ],
    tags: ['defender', 'captain', 'academy-track', 'long-term'],
    primaryFocus: 'Defending',
    notificationPreference: 'IMPORTANT',
  },
  {
    id: 'roster_4',
    coachId: 'coach1',
    athleteId: 'user4',
    parentId: 'parent3',
    status: 'PAUSED',
    startDate: '2025-04-01',
    lastSessionDate: '2025-11-20',
    totalSessions: 18,
    totalRevenue: 1080,
    averageRating: 4.3,
    notes: [
      {
        id: 'note_6',
        content: 'On break due to school exams, returning Feb',
        createdAt: '2025-11-15T10:00:00Z',
      },
    ],
    tags: ['goalkeeper', 'on-break'],
    primaryFocus: 'Goalkeeping',
    notificationPreference: 'NONE',
  },
  {
    id: 'roster_5',
    coachId: 'coach1',
    athleteId: 'user5',
    parentId: 'parent4',
    status: 'GRADUATED',
    startDate: '2023-01-15',
    lastSessionDate: '2025-08-30',
    totalSessions: 96,
    totalRevenue: 5760,
    averageRating: 4.9,
    notes: [
      {
        id: 'note_7',
        content: 'Signed with Chelsea Academy U15',
        createdAt: '2025-08-30T17:00:00Z',
      },
    ],
    tags: ['success-story', 'academy-signed'],
    primaryFocus: 'Dribbling',
    notificationPreference: 'NONE',
  },
]);

export interface RosterFilters {
  status?: RosterEntry['status'];
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  tags?: string[];
  search?: string;
}

export interface RosterStats {
  total: number;
  active: number;
  paused: number;
  graduated: number;
  totalSessions: number;
  totalRevenue: number;
  averageSessionsPerAthlete: number;
}

interface RosterApiListResponse {
  entries: RosterEntry[];
}

interface RosterApiEntryResponse {
  entry: RosterEntry;
}

interface RosterApiNoteResponse {
  note: RosterNote;
}

interface RosterApiRemovalResponse {
  removal: AthleteRemovalRecord;
}

interface RosterApiRemovalHistoryResponse {
  removals: AthleteRemovalRecord[];
}

function rosterEntryApiPath(coachId: string, athleteId: string): string {
  return `/v1/coaches/${encodeURIComponent(coachId)}/roster/${encodeURIComponent(athleteId)}`;
}

function rosterNoteApiPath(coachId: string, athleteId: string, noteId?: string): string {
  const base = `${rosterEntryApiPath(coachId, athleteId)}/notes`;
  return noteId ? `${base}/${encodeURIComponent(noteId)}` : base;
}

async function patchApiRosterEntry(
  coachId: string,
  athleteId: string,
  updates: {
    status?: RosterEntry['status'];
    tags?: string[];
    primaryFocus?: FootballObjective | null;
    notificationPreference?: RosterEntry['notificationPreference'];
  },
): Promise<Result<RosterEntry, ServiceError>> {
  const response = await apiFetch<RosterApiEntryResponse>(rosterEntryApiPath(coachId, athleteId), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  if (!response.success) return err(response.error);
  return ok(response.data.entry);
}

async function createApiRosterEntry(
  input: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<Result<RosterEntry, ServiceError>> {
  const response = await apiFetch<RosterApiEntryResponse>(
    `/v1/coaches/${encodeURIComponent(input.coachId)}/roster`,
    {
      method: 'POST',
      body: JSON.stringify({
        athleteId: input.athleteId,
        status: input.status,
        tags: input.tags,
        primaryFocus: input.primaryFocus,
        notificationPreference: input.notificationPreference,
      }),
    },
  );
  if (!response.success) return err(response.error);
  return ok(response.data.entry);
}

async function createApiRosterNote(
  coachId: string,
  athleteId: string,
  content: string,
): Promise<Result<RosterNote, ServiceError>> {
  const response = await apiFetch<RosterApiNoteResponse>(rosterNoteApiPath(coachId, athleteId), {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  if (!response.success) return err(response.error);
  return ok(response.data.note);
}

async function updateApiRosterNote(
  coachId: string,
  athleteId: string,
  noteId: string,
  content: string,
): Promise<Result<RosterNote, ServiceError>> {
  const response = await apiFetch<RosterApiNoteResponse>(
    rosterNoteApiPath(coachId, athleteId, noteId),
    {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    },
  );
  if (!response.success) return err(response.error);
  return ok(response.data.note);
}

async function deleteApiRosterNote(
  coachId: string,
  athleteId: string,
  noteId: string,
): Promise<Result<void, ServiceError>> {
  const response = await apiFetch<{ removed: boolean }>(
    rosterNoteApiPath(coachId, athleteId, noteId),
    { method: 'DELETE' },
  );
  if (!response.success) return err(response.error);
  return ok(undefined);
}

async function deleteApiRosterEntry(
  coachId: string,
  athleteId: string,
  reason: RemovalReason,
  options?: {
    customReason?: string;
    archive?: boolean;
  },
): Promise<Result<AthleteRemovalRecord, ServiceError>> {
  const response = await apiFetch<RosterApiRemovalResponse>(rosterEntryApiPath(coachId, athleteId), {
    method: 'DELETE',
    body: JSON.stringify({
      reason,
      customReason: options?.customReason,
      archive: options?.archive ?? true,
    }),
  });
  if (!response.success) return err(response.error);
  return ok(response.data.removal);
}

async function fetchApiRemovalHistory(
  coachId: string,
): Promise<Result<AthleteRemovalRecord[], ServiceError>> {
  const response = await apiFetch<RosterApiRemovalHistoryResponse>(
    `/v1/coaches/${encodeURIComponent(coachId)}/roster/removals`,
    { method: 'GET' },
  );
  if (!response.success) {
    return err(response.error);
  }
  return ok(response.data.removals);
}

async function undoApiRemoval(
  coachId: string,
  removalId: string,
): Promise<Result<RosterEntry, ServiceError>> {
  const response = await apiFetch<RosterApiEntryResponse>(
    `/v1/coaches/${encodeURIComponent(coachId)}/roster/removals/${encodeURIComponent(removalId)}/undo`,
    { method: 'POST' },
  );
  if (!response.success) return err(response.error);
  return ok(response.data.entry);
}

// ============================================================================
// REMOVAL HISTORY HELPERS
// ============================================================================

let removalHistoryCache: AthleteRemovalRecord[] = [];

async function loadRemovalHistory(): Promise<AthleteRemovalRecord[]> {
  try {
    if (!apiClient.isMockMode) {
      return [];
    }

    return await apiClient.get<AthleteRemovalRecord[]>(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, []);
  } catch (error) {
    logger.error('Failed to load removal history', error);
  }
  return [];
}

async function saveRemovalHistory(
  history: AthleteRemovalRecord[],
): Promise<Result<void, ServiceError>> {
  try {
    if (!apiClient.isMockMode) {
      return err(rosterApiUnsupported('Roster removal history updates'));
    }

    await apiClient.set(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, history);
    return ok(undefined);
  } catch (error) {
    logger.error('Failed to save removal history', error);
    return err(storageError(`Failed to save removal history: ${String(error)}`));
  }
}

function filterRosterEntries(
  roster: RosterEntry[],
  filters?: RosterFilters,
): RosterEntry[] {
  let filtered = roster;

  if (filters?.status) {
    filtered = filtered.filter((r) => r.status === filters.status);
  }
  if (filters?.skillLevel) {
    filtered = filtered.filter((r) => {
      const skillLevel = (r as unknown as { athleteSkillLevel?: RosterFilters['skillLevel'] })
        .athleteSkillLevel;
      return skillLevel === filters.skillLevel;
    });
  }
  if (filters?.tags?.length) {
    filtered = filtered.filter((r) => filters.tags!.some((tag) => r.tags.includes(tag)));
  }
  if (filters?.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter((entry) => {
      const athleteName = entry.athleteName ?? '';
      const parentName = entry.parentName ?? '';
      return athleteName.toLowerCase().includes(search) || parentName.toLowerCase().includes(search);
    });
  }

  return Array.from(filtered).sort((a, b) => {
    if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
    if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
    return (a.athleteName || '').localeCompare(b.athleteName || '');
  });
}

// ============================================================================
// ROSTER SERVICE (extends BaseService)
// ============================================================================

class RosterServiceImpl extends BaseService<RosterEntry> {
  protected storageKey = STORAGE_KEYS.ROSTER;
  protected entityName = 'RosterEntry';

  constructor() {
    super();
    this.useMock = USE_MOCK;
    this.mockData = [...MOCK_ROSTER];
  }

  // --------------------------------------------------------------------------
  // Query methods
  // --------------------------------------------------------------------------

  async create(
    input: Omit<RosterEntry, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<RosterEntry, ServiceError>> {
    if (!apiClient.isMockMode) {
      return createApiRosterEntry(input);
    }
    return super.create(input);
  }

  async update(
    id: string,
    updates: Partial<RosterEntry>,
  ): Promise<Result<RosterEntry, ServiceError>> {
    if (!apiClient.isMockMode) {
      return err(rosterApiUnsupported('Roster entry updates'));
    }
    return super.update(id, updates);
  }

  async delete(id: string): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      return err(rosterApiUnsupported('Roster entry removal'));
    }
    return super.delete(id);
  }

  async hardDelete(id: string): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      return err(rosterApiUnsupported('Roster entry removal'));
    }
    return super.hardDelete(id);
  }

  /**
   * Check if coach has valid DBS verification.
   */
  async isDbsValid(coachId: string): Promise<boolean> {
    const verificationResult = await verificationService.getStatus(coachId);
    if (!verificationResult.success) return false;
    const dbs = verificationResult.data.backgroundCheck;
    if (dbs.status !== 'VERIFIED') return false;
    if (dbs.expiresAt && new Date(dbs.expiresAt) < new Date()) return false;
    return true;
  }

  /**
   * Get full roster for a coach, with optional filters and sorting.
   */
  async getRoster(coachId: string, filters?: RosterFilters): Promise<RosterEntry[]> {
    if (!apiClient.isMockMode) {
      const response = await apiFetch<RosterApiListResponse>(
        `/v1/coaches/${encodeURIComponent(coachId)}/roster`,
        { method: 'GET' },
      );
      if (!response.success) {
        logger.warn('Failed to load roster via API', {
          coachId,
          error: response.error,
        });
        throw response.error;
      }
      return filterRosterEntries(response.data.entries, filters);
    }

    const result = await this.getAll({ filter: { coachId } as Partial<RosterEntry> });
    if (!result.success) {
      logger.error('Failed to get roster', result.error);
      return [];
    }

    let filtered = result.data;

    // Cross-coach isolation safeguard: filter out athletes assigned to other coaches
    const incorrectlyAssigned = filtered.filter(
      (entry) => entry.coachId && entry.coachId !== coachId,
    );
    if (incorrectlyAssigned.length > 0) {
      logger.warn('Roster data contains entries from other coaches - possible data leak', {
        coachId,
        incorrectCount: incorrectlyAssigned.length,
      });
      filtered = filtered.filter((entry) => !entry.coachId || entry.coachId === coachId);
    }

    const entryNames = new Map<string, { athleteName: string; parentName: string }>();
    await Promise.all(
      filtered.map(async (entry) => {
        const [athleteName, parentName] = await Promise.all([
          resolveUserName(entry.athleteId, 'Athlete'),
          resolveUserName(entry.parentId, 'Parent'),
        ]);
        entryNames.set(entry.id, { athleteName, parentName });
      }),
    );

    return filterRosterEntries(
      filtered.map((entry) => ({
        ...entry,
        athleteName: entry.athleteName ?? entryNames.get(entry.id)?.athleteName,
        parentName: entry.parentName ?? entryNames.get(entry.id)?.parentName,
      })),
      filters,
    );
  }

  /**
   * Get single roster entry by coach + athlete lookup.
   */
  async getRosterEntry(coachId: string, athleteId: string): Promise<RosterEntry | null> {
    if (!apiClient.isMockMode) {
      const response = await apiFetch<RosterApiEntryResponse>(
        `/v1/coaches/${encodeURIComponent(coachId)}/roster/${encodeURIComponent(athleteId)}`,
        { method: 'GET' },
      );
      if (!response.success) {
        logger.warn('Failed to load roster entry via API', {
          coachId,
          athleteId,
          error: response.error,
        });
        if (response.error.code !== 'NOT_FOUND') {
          throw response.error;
        }
        return null;
      }
      return response.data.entry;
    }

    const result = await this.findOne({ coachId, athleteId } as Partial<RosterEntry>);
    if (!result.success) {
      logger.error('Failed to get roster entry', result.error);
      return null;
    }
    return result.data;
  }

  // --------------------------------------------------------------------------
  // Note methods
  // --------------------------------------------------------------------------

  /**
   * Add note to athlete
   */
  async addNote(
    coachId: string,
    athleteId: string,
    content: string,
  ): Promise<Result<RosterNote, ServiceError>> {
    if (!apiClient.isMockMode) {
      return createApiRosterNote(coachId, athleteId, content);
    }

    const note: RosterNote = {
      id: apiClient.generateId('note'),
      content,
      createdAt: new Date().toISOString(),
    };

    const data = await this.loadFromStorage();
    const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
    if (entry) {
      entry.notes.push(note);
      await this.saveToStorage(data);
      return ok(note);
    }
    return err(notFound('Roster entry', athleteId));
  }

  /**
   * Update note
   */
  async updateNote(
    coachId: string,
    athleteId: string,
    noteId: string,
    content: string,
  ): Promise<Result<RosterNote, ServiceError>> {
    if (!apiClient.isMockMode) {
      return updateApiRosterNote(coachId, athleteId, noteId, content);
    }

    const data = await this.loadFromStorage();
    const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
    if (entry) {
      const note = entry.notes.find((n: RosterNote) => n.id === noteId);
      if (note) {
        note.content = content;
        note.updatedAt = new Date().toISOString();
        await this.saveToStorage(data);
        return ok(note);
      }
    }
    return err(notFound('Note', noteId));
  }

  /**
   * Delete note
   */
  async deleteNote(
    coachId: string,
    athleteId: string,
    noteId: string,
  ): Promise<Result<void, ServiceError>> {
    if (!apiClient.isMockMode) {
      const result = await deleteApiRosterNote(coachId, athleteId, noteId);
      if (!result.success) return result;
      emitTyped(ServiceEvents.ROSTER_NOTE_DELETED, {
        athleteId,
        noteId,
        coachId,
      });
      return ok(undefined);
    }

    const data = await this.loadFromStorage();
    const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
    if (entry) {
      entry.notes = entry.notes.filter((n: RosterNote) => n.id !== noteId);
      await this.saveToStorage(data);
      emitTyped(ServiceEvents.ROSTER_NOTE_DELETED, {
        athleteId,
        noteId,
        coachId,
      });
      return ok(undefined);
    }
    return err(notFound('Note', noteId));
  }

  // --------------------------------------------------------------------------
  // Status / tags / focus updates
  // --------------------------------------------------------------------------

  /**
   * Update athlete status
   */
  async updateStatus(
    coachId: string,
    athleteId: string,
    status: RosterEntry['status'],
  ): Promise<Result<RosterEntry, ServiceError>> {
    if (!apiClient.isMockMode) {
      return patchApiRosterEntry(coachId, athleteId, { status });
    }

    const data = await this.loadFromStorage();
    const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
    if (!entry) return err(notFound('Roster entry', athleteId));

    entry.status = status;
    await this.saveToStorage(data);
    return ok(entry);
  }

  /**
   * Update tags
   */
  async updateTags(
    coachId: string,
    athleteId: string,
    tags: string[],
  ): Promise<Result<RosterEntry, ServiceError>> {
    if (!apiClient.isMockMode) {
      return patchApiRosterEntry(coachId, athleteId, { tags });
    }

    const data = await this.loadFromStorage();
    const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
    if (!entry) return err(notFound('Roster entry', athleteId));

    entry.tags = tags;
    await this.saveToStorage(data);
    return ok(entry);
  }

  /**
   * Update primary focus
   */
  async updatePrimaryFocus(
    coachId: string,
    athleteId: string,
    focus: FootballObjective,
  ): Promise<Result<RosterEntry, ServiceError>> {
    if (!apiClient.isMockMode) {
      return patchApiRosterEntry(coachId, athleteId, { primaryFocus: focus });
    }

    const data = await this.loadFromStorage();
    const entry = data.find((r) => r.coachId === coachId && r.athleteId === athleteId);
    if (!entry) return err(notFound('Roster entry', athleteId));

    entry.primaryFocus = focus;
    await this.saveToStorage(data);
    return ok(entry);
  }

  // --------------------------------------------------------------------------
  // Statistics & Tags
  // --------------------------------------------------------------------------

  /**
   * Get roster statistics
   */
  async getStats(coachId: string): Promise<RosterStats> {
    const roster = await this.getRoster(coachId);

    const total = roster.length;
    const active = roster.filter((r) => r.status === 'ACTIVE').length;
    const paused = roster.filter((r) => r.status === 'PAUSED').length;
    const graduated = roster.filter((r) => r.status === 'GRADUATED').length;
    const totalSessions = roster.reduce((sum, r) => sum + r.totalSessions, 0);
    const totalRevenue = roster.reduce((sum, r) => sum + r.totalRevenue, 0);
    const averageSessionsPerAthlete = total > 0 ? Math.round(totalSessions / total) : 0;

    return {
      total,
      active,
      paused,
      graduated,
      totalSessions,
      totalRevenue,
      averageSessionsPerAthlete,
    };
  }

  /**
   * Get all unique tags used in roster
   */
  async getAllTags(coachId: string): Promise<string[]> {
    const roster = await this.getRoster(coachId);
    const tags = new Set<string>();
    roster.forEach((r: RosterEntry) => r.tags.forEach((t: string) => tags.add(t)));
    return Array.from(tags).sort();
  }

  /**
   * Get athletes by tag
   */
  async getByTag(coachId: string, tag: string): Promise<RosterEntry[]> {
    return this.getRoster(coachId, { tags: [tag] });
  }

  // --------------------------------------------------------------------------
  // Formatters (pure, no state)
  // --------------------------------------------------------------------------

  /**
   * Format revenue for display
   */
  formatRevenue(amount: number, currency: string = 'GBP'): string {
    return amount.toLocaleString('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    });
  }

  /**
   * Format status for display
   */
  formatStatus(status: RosterEntry['status']): string {
    return STATUS_LABELS[status] || status;
  }

  /**
   * Get status color
   */
  getStatusColor(status: RosterEntry['status']): string {
    return STATUS_COLORS[status] || '#6B7280';
  }

  // --------------------------------------------------------------------------
  // Removal / Archival
  // --------------------------------------------------------------------------

  /**
   * Remove athlete from roster
   */
  async removeAthlete(
    coachId: string,
    athleteId: string,
    reason: RemovalReason,
    options?: {
      customReason?: string;
      archive?: boolean; // If true, keep a restore snapshot; if false, remove without undo.
    },
  ): Promise<Result<AthleteRemovalRecord, ServiceError>> {
    if (!apiClient.isMockMode) {
      return deleteApiRosterEntry(coachId, athleteId, reason, options);
    }

    const archive = options?.archive ?? true; // Default to archiving

    const data = await this.loadFromStorage();
    const entryIndex = data.findIndex((r) => r.coachId === coachId && r.athleteId === athleteId);

    if (entryIndex === -1) {
      return err(notFound('Athlete', athleteId));
    }

    const entry = data[entryIndex];

    // Create removal record
    const removalRecord: AthleteRemovalRecord = {
      id: apiClient.generateId('removal'),
      coachId,
      athleteId,
      reason,
      customReason: options?.customReason,
      archived: archive,
      removedAt: new Date().toISOString(),
      previousStatus: entry.status,
      totalSessions: entry.totalSessions,
      totalRevenue: entry.totalRevenue,
      originalEntry: archive ? entry : undefined,
    };

    // Remove from roster
    data.splice(entryIndex, 1);
    await this.saveToStorage(data);

    // Save to removal history
    removalHistoryCache = await loadRemovalHistory();
    removalHistoryCache.unshift(removalRecord);
    await saveRemovalHistory(removalHistoryCache);

    return ok(removalRecord);
  }

  /**
   * Undo athlete removal (restore from archive)
   */
  async undoRemoval(
    coachId: string,
    removalId: string,
  ): Promise<Result<RosterEntry, ServiceError>> {
    if (!apiClient.isMockMode) {
      return undoApiRemoval(coachId, removalId);
    }

    removalHistoryCache = await loadRemovalHistory();
    const recordIndex = removalHistoryCache.findIndex(
      (r) => r.id === removalId && r.coachId === coachId,
    );

    if (recordIndex === -1) {
      return err(notFound('Removal record', removalId));
    }

    const record = removalHistoryCache[recordIndex];

    if (!record.originalEntry) {
      return err(validationError('Cannot restore - removal did not keep a restore snapshot'));
    }

    // Restore to roster
    const data = await this.loadFromStorage();
    data.push(record.originalEntry);
    await this.saveToStorage(data);

    // Remove from removal history
    removalHistoryCache.splice(recordIndex, 1);
    await saveRemovalHistory(removalHistoryCache);

    return ok(record.originalEntry);
  }

  /**
   * Get removal history for a coach
   */
  async getRemovalHistory(coachId: string): Promise<AthleteRemovalRecord[]> {
    if (!apiClient.isMockMode) {
      const response = await fetchApiRemovalHistory(coachId);
      if (!response.success) {
        logger.warn('Failed to load roster removal history via API', {
          coachId,
          error: response.error,
        });
        throw response.error;
      }
      return response.data;
    }

    removalHistoryCache = await loadRemovalHistory();
    return removalHistoryCache.filter((r) => r.coachId === coachId);
  }

  /**
   * Format removal reason for display
   */
  formatRemovalReason(reason: RemovalReason): string {
    const labels: Record<RemovalReason, string> = {
      GRADUATED: 'Graduated',
      MOVED: 'Moved away',
      INACTIVE: 'Inactive',
      OTHER: 'Other',
    };
    return labels[reason] || reason;
  }
}

export const rosterService = new RosterServiceImpl();
