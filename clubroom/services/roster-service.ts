/**
 * Roster Service
 *
 * Handles coach athlete roster/directory management.
 * Provides athlete details, notes, and quick actions.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/roster - Get roster
 * - GET /api/coaches/:id/roster/:athleteId - Get detail
 * - POST /api/coaches/:id/roster/:athleteId/notes - Add note
 * - PATCH /api/coaches/:id/roster/:athleteId - Update status/tags
 * - DELETE /api/coaches/:id/roster/:athleteId - Remove athlete
 * - GET /api/coaches/:id/roster/removed - Get removal history
 */

import { apiClient } from './api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { RosterEntry, RosterNote, FootballObjective } from '@/constants/types';
const USE_MOCK = true;

export type RemovalReason = 'GRADUATED' | 'MOVED' | 'INACTIVE' | 'OTHER';

export interface AthleteRemovalRecord {
  id: string;
  coachId: string;
  athleteId: string;
  athleteName: string;
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
const MOCK_ROSTER: RosterEntry[] = [
  {
    id: 'roster_1',
    coachId: 'coach_1',
    athleteId: 'athlete_1',
    athleteName: 'Tom Baker',
    athleteAge: 11,
    athletePhotoUrl: 'https://randomuser.me/api/portraits/boys/1.jpg',
    athleteSkillLevel: 'INTERMEDIATE',
    parentId: 'parent_1',
    parentName: 'Sarah Baker',
    parentEmail: 'sarah.baker@email.com',
    parentPhone: '+44 7700 900001',
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
    coachId: 'coach_1',
    athleteId: 'athlete_2',
    athleteName: 'Lucy Baker',
    athleteAge: 9,
    athletePhotoUrl: 'https://randomuser.me/api/portraits/girls/1.jpg',
    athleteSkillLevel: 'BEGINNER',
    parentId: 'parent_1',
    parentName: 'Sarah Baker',
    parentEmail: 'sarah.baker@email.com',
    parentPhone: '+44 7700 900001',
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
    coachId: 'coach_1',
    athleteId: 'athlete_3',
    athleteName: 'James Wilson',
    athleteAge: 12,
    athletePhotoUrl: 'https://randomuser.me/api/portraits/boys/2.jpg',
    athleteSkillLevel: 'ADVANCED',
    parentId: 'parent_2',
    parentName: 'Mike Wilson',
    parentEmail: 'mike.wilson@email.com',
    parentPhone: '+44 7700 900002',
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
    coachId: 'coach_1',
    athleteId: 'athlete_4',
    athleteName: 'Emma Thompson',
    athleteAge: 10,
    athletePhotoUrl: 'https://randomuser.me/api/portraits/girls/2.jpg',
    athleteSkillLevel: 'INTERMEDIATE',
    parentId: 'parent_3',
    parentName: 'David Thompson',
    parentEmail: 'david.thompson@email.com',
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
    coachId: 'coach_1',
    athleteId: 'athlete_5',
    athleteName: 'Oliver Chen',
    athleteAge: 14,
    athletePhotoUrl: 'https://randomuser.me/api/portraits/boys/3.jpg',
    athleteSkillLevel: 'ADVANCED',
    parentId: 'parent_4',
    parentName: 'Wei Chen',
    parentEmail: 'wei.chen@email.com',
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
];

let rosterCache: RosterEntry[] = [...MOCK_ROSTER];
let removalHistoryCache: AthleteRemovalRecord[] = [];

async function loadRemovalHistory(): Promise<AthleteRemovalRecord[]> {
  try {
    return await apiClient.get<AthleteRemovalRecord[]>(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, []);
  } catch (error) {
    console.error('[RosterService] Failed to load removal history:', error);
  }
  return [];
}

async function saveRemovalHistory(history: AthleteRemovalRecord[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.ROSTER_REMOVAL_HISTORY, history);
  } catch (error) {
    console.error('[RosterService] Failed to save removal history:', error);
  }
}

async function loadFromStorage(): Promise<RosterEntry[]> {
  try {
    const stored = await apiClient.get<RosterEntry[] | null>(STORAGE_KEYS.ROSTER, null);
    if (stored) return stored;
  } catch (error) {
    console.error('[RosterService] Failed to load from storage:', error);
  }
  return [...MOCK_ROSTER];
}

async function saveToStorage(roster: RosterEntry[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.ROSTER, roster);
  } catch (error) {
    console.error('[RosterService] Failed to save to storage:', error);
  }
}

export interface RosterFilters {
  status?: RosterEntry['status'];
  skillLevel?: RosterEntry['athleteSkillLevel'];
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

export const rosterService = {
  /**
   * Get full roster for a coach
   */
  async getRoster(coachId: string, filters?: RosterFilters): Promise<RosterEntry[]> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      let filtered = rosterCache.filter((r) => r.coachId === coachId);

      if (filters?.status) {
        filtered = filtered.filter((r) => r.status === filters.status);
      }
      if (filters?.skillLevel) {
        filtered = filtered.filter((r) => r.athleteSkillLevel === filters.skillLevel);
      }
      if (filters?.tags?.length) {
        filtered = filtered.filter((r) =>
          filters.tags!.some((tag) => r.tags.includes(tag))
        );
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(
          (r) =>
            r.athleteName.toLowerCase().includes(search) ||
            r.parentName.toLowerCase().includes(search)
        );
      }

      return filtered.sort((a, b) => {
        // Active first, then by name
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
        return a.athleteName.localeCompare(b.athleteName);
      });
    }

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.skillLevel) params.append('level', filters.skillLevel);
    if (filters?.tags?.length) params.append('tags', filters.tags.join(','));
    if (filters?.search) params.append('q', filters.search);

    const response = await fetch(`/api/coaches/${coachId}/roster?${params.toString()}`);
    return response.json();
  },

  /**
   * Get single roster entry
   */
  async getRosterEntry(coachId: string, athleteId: string): Promise<RosterEntry | null> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      return (
        rosterCache.find((r) => r.coachId === coachId && r.athleteId === athleteId) || null
      );
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Add note to athlete
   */
  async addNote(coachId: string, athleteId: string, content: string): Promise<RosterNote> {
    const note: RosterNote = {
      id: `note_${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
    };

    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entry = rosterCache.find(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );
      if (entry) {
        entry.notes.push(note);
        await saveToStorage(rosterCache);
      }
      return note;
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return response.json();
  },

  /**
   * Update note
   */
  async updateNote(coachId: string, athleteId: string, noteId: string, content: string): Promise<RosterNote> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entry = rosterCache.find(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );
      if (entry) {
        const note = entry.notes.find((n) => n.id === noteId);
        if (note) {
          note.content = content;
          note.updatedAt = new Date().toISOString();
          await saveToStorage(rosterCache);
          return note;
        }
      }
      throw new Error('Note not found');
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}/notes/${noteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return response.json();
  },

  /**
   * Delete note
   */
  async deleteNote(coachId: string, athleteId: string, noteId: string): Promise<void> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entry = rosterCache.find(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );
      if (entry) {
        entry.notes = entry.notes.filter((n) => n.id !== noteId);
        await saveToStorage(rosterCache);
      }
      return;
    }

    await fetch(`/api/coaches/${coachId}/roster/${athleteId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Update athlete status
   */
  async updateStatus(
    coachId: string,
    athleteId: string,
    status: RosterEntry['status']
  ): Promise<RosterEntry> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entry = rosterCache.find(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );
      if (!entry) throw new Error('Roster entry not found');

      entry.status = status;
      await saveToStorage(rosterCache);
      return entry;
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return response.json();
  },

  /**
   * Update tags
   */
  async updateTags(coachId: string, athleteId: string, tags: string[]): Promise<RosterEntry> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entry = rosterCache.find(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );
      if (!entry) throw new Error('Roster entry not found');

      entry.tags = tags;
      await saveToStorage(rosterCache);
      return entry;
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    return response.json();
  },

  /**
   * Update primary focus
   */
  async updatePrimaryFocus(
    coachId: string,
    athleteId: string,
    focus: FootballObjective
  ): Promise<RosterEntry> {
    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entry = rosterCache.find(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );
      if (!entry) throw new Error('Roster entry not found');

      entry.primaryFocus = focus;
      await saveToStorage(rosterCache);
      return entry;
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryFocus: focus }),
    });
    return response.json();
  },

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
  },

  /**
   * Get all unique tags used in roster
   */
  async getAllTags(coachId: string): Promise<string[]> {
    const roster = await this.getRoster(coachId);
    const tags = new Set<string>();
    roster.forEach((r) => r.tags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  },

  /**
   * Get athletes by tag
   */
  async getByTag(coachId: string, tag: string): Promise<RosterEntry[]> {
    return this.getRoster(coachId, { tags: [tag] });
  },

  /**
   * Format revenue for display
   */
  formatRevenue(amount: number, currency: string = 'GBP'): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  },

  /**
   * Format status for display
   */
  formatStatus(status: RosterEntry['status']): string {
    const labels: Record<RosterEntry['status'], string> = {
      ACTIVE: 'Active',
      PAUSED: 'Paused',
      GRADUATED: 'Graduated',
      INACTIVE: 'Inactive',
    };
    return labels[status] || status;
  },

  /**
   * Get status color
   */
  getStatusColor(status: RosterEntry['status']): string {
    const colors: Record<RosterEntry['status'], string> = {
      ACTIVE: '#16A34A',
      PAUSED: '#CA8A04',
      GRADUATED: '#2563EB',
      INACTIVE: '#6B7280',
    };
    return colors[status] || '#6B7280';
  },

  /**
   * Remove athlete from roster
   */
  async removeAthlete(
    coachId: string,
    athleteId: string,
    reason: RemovalReason,
    options?: {
      customReason?: string;
      archive?: boolean; // If true, keep history; if false, permanently delete
    }
  ): Promise<AthleteRemovalRecord> {
    const archive = options?.archive ?? true; // Default to archiving

    if (USE_MOCK) {
      rosterCache = await loadFromStorage();
      const entryIndex = rosterCache.findIndex(
        (r) => r.coachId === coachId && r.athleteId === athleteId
      );

      if (entryIndex === -1) {
        throw new Error('Athlete not found in roster');
      }

      const entry = rosterCache[entryIndex];

      // Create removal record
      const removalRecord: AthleteRemovalRecord = {
        id: `removal_${Date.now()}`,
        coachId,
        athleteId,
        athleteName: entry.athleteName,
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
      rosterCache.splice(entryIndex, 1);
      await saveToStorage(rosterCache);

      // Save to removal history
      removalHistoryCache = await loadRemovalHistory();
      removalHistoryCache.unshift(removalRecord);
      await saveRemovalHistory(removalHistoryCache);

      return removalRecord;
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/${athleteId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, customReason: options?.customReason, archive }),
    });
    return response.json();
  },

  /**
   * Undo athlete removal (restore from archive)
   */
  async undoRemoval(coachId: string, removalId: string): Promise<RosterEntry | null> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      const recordIndex = removalHistoryCache.findIndex(
        (r) => r.id === removalId && r.coachId === coachId
      );

      if (recordIndex === -1) {
        throw new Error('Removal record not found');
      }

      const record = removalHistoryCache[recordIndex];

      if (!record.originalEntry) {
        throw new Error('Cannot restore - athlete was permanently deleted');
      }

      // Restore to roster
      rosterCache = await loadFromStorage();
      rosterCache.push(record.originalEntry);
      await saveToStorage(rosterCache);

      // Remove from removal history
      removalHistoryCache.splice(recordIndex, 1);
      await saveRemovalHistory(removalHistoryCache);

      return record.originalEntry;
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/removed/${removalId}/undo`, {
      method: 'POST',
    });
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Get removal history for a coach
   */
  async getRemovalHistory(coachId: string): Promise<AthleteRemovalRecord[]> {
    if (USE_MOCK) {
      removalHistoryCache = await loadRemovalHistory();
      return removalHistoryCache.filter((r) => r.coachId === coachId);
    }

    const response = await fetch(`/api/coaches/${coachId}/roster/removed`);
    return response.json();
  },

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
  },
};
