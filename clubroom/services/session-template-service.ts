/**
 * Session Template Service
 *
 * CRUD for coach session type presets (e.g. "1-on-1 Coaching", "Small Group", "Assessment").
 * These presets auto-fill duration, price, and capacity when creating invites.
 *
 * API Integration Notes:
 * - GET /api/coaches/:id/session-templates
 * - POST /api/coaches/:id/session-templates
 * - PUT /api/session-templates/:id
 * - DELETE /api/session-templates/:id
 */

import { apiClient } from './api-client';
import { api } from '@/constants/config';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import type { SessionTemplate } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('SessionTemplateService');
const USE_MOCK = api.useMock;

// Default presets seeded on first load
const DEFAULT_TEMPLATES: Omit<SessionTemplate, 'id' | 'coachId' | 'createdAt'>[] = [
  {
    name: '1-on-1 Coaching',
    type: '1-to-1',
    duration: 60,
    capacity: 1,
    defaultPrice: 60,
    description: 'Individual session tailored to the athlete.',
    skillsFocus: [],
  },
  {
    name: 'Group Training',
    type: 'small-group',
    duration: 60,
    capacity: 4,
    defaultPrice: 35,
    description: 'Group training for focused development.',
    skillsFocus: [],
  },
];

async function loadTemplates(): Promise<SessionTemplate[]> {
  try {
    const stored = await apiClient.get<SessionTemplate[] | null>(STORAGE_KEYS.SESSION_TEMPLATES, null);
    if (stored) return stored;
  } catch (error) {
    logger.error('Failed to load session templates', error);
  }
  return [];
}

async function saveTemplates(templates: SessionTemplate[]): Promise<void> {
  try {
    await apiClient.set(STORAGE_KEYS.SESSION_TEMPLATES, templates);
  } catch (error) {
    logger.error('Failed to save session templates', error);
  }
}

export const sessionTemplateService = {
  /**
   * Get all session type presets for a coach.
   * Seeds defaults on first call if none exist.
   */
  async getTemplates(coachId: string): Promise<SessionTemplate[]> {
    if (USE_MOCK) {
      let all = await loadTemplates();
      let coachTemplates = all.filter((t) => t.coachId === coachId);

      // Seed defaults if this coach has none
      if (coachTemplates.length === 0) {
        const seeded = DEFAULT_TEMPLATES.map((def, i) => ({
          ...def,
          id: `stmpl_${coachId}_${i}`,
          coachId,
          createdAt: new Date().toISOString(),
        }));
        all = [...all, ...seeded];
        await saveTemplates(all);
        return seeded;
      }

      // Clean up legacy types that are no longer offered
      const ACTIVE_TYPES = new Set(['1-to-1', 'small-group']);
      const legacyCount = coachTemplates.filter((t) => !ACTIVE_TYPES.has(t.type)).length;
      if (legacyCount > 0) {
        all = all.filter((t) => t.coachId !== coachId || ACTIVE_TYPES.has(t.type));
        await saveTemplates(all);
        coachTemplates = all.filter((t) => t.coachId === coachId);
      }

      return coachTemplates;
    }

    const response = await fetch(`/api/coaches/${coachId}/session-templates`);
    return response.json();
  },

  /**
   * Get a single template by ID.
   */
  async getTemplate(templateId: string): Promise<SessionTemplate | null> {
    if (USE_MOCK) {
      const all = await loadTemplates();
      return all.find((t) => t.id === templateId) ?? null;
    }

    const response = await fetch(`/api/session-templates/${templateId}`);
    if (!response.ok) return null;
    return response.json();
  },

  /**
   * Create or update a session type preset.
   */
  async saveTemplate(
    template: Omit<SessionTemplate, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Promise<SessionTemplate> {
    const saved: SessionTemplate = {
      ...template,
      id: template.id || `stmpl_${Date.now()}`,
      createdAt: template.createdAt || new Date().toISOString(),
    };

    if (USE_MOCK) {
      const all = await loadTemplates();
      const existingIndex = all.findIndex((t) => t.id === saved.id);

      if (existingIndex >= 0) {
        all[existingIndex] = saved;
      } else {
        all.push(saved);
      }

      await saveTemplates(all);
      return saved;
    }

    const response = await fetch(`/api/session-templates/${saved.id}`, {
      method: template.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saved),
    });
    return response.json();
  },

  /**
   * Delete a session type preset.
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (USE_MOCK) {
      const all = await loadTemplates();
      const filtered = all.filter((t) => t.id !== templateId);
      await saveTemplates(filtered);
      return;
    }

    await fetch(`/api/session-templates/${templateId}`, { method: 'DELETE' });
  },

  /**
   * Return the default presets (for display before seeding).
   */
  getDefaults(): Omit<SessionTemplate, 'id' | 'coachId' | 'createdAt'>[] {
    return [...DEFAULT_TEMPLATES];
  },
};
