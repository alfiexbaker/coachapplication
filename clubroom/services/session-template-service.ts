/**
 * Session Template Service
 *
 * CRUD for coach session type presets (e.g. "1-on-1 Coaching", "Small Group", "Assessment").
 * These presets auto-fill duration, price, and capacity when creating invites.
 *
 * API Integration Notes:
 * - GET/POST /v1/coaches/me/session-templates
 * - GET/PATCH/DELETE /v1/coaches/me/session-templates/:id
 */

import { apiFetch } from './api-client';
import { api } from '@/constants/config';
import type { SessionTemplate } from '@/constants/session-types';
import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from './event-bus';

const logger = createLogger('SessionTemplateService');
const USE_MOCK = api.useMock;

interface SessionTemplateListResponse {
  templates: SessionTemplate[];
  total: number;
  requestId: string;
}

interface SessionTemplateResponse {
  template: SessionTemplate;
  requestId: string;
}

function toWritePayload(
  template: Omit<SessionTemplate, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
) {
  return {
    name: template.name,
    type: template.type,
    duration: template.duration,
    capacity: template.capacity,
    defaultPrice: template.defaultPrice,
    description: template.description,
    defaultLocation: template.defaultLocation,
    skillsFocus: template.skillsFocus,
  };
}

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

let mockTemplates: SessionTemplate[] = [];

function cloneTemplate(template: SessionTemplate): SessionTemplate {
  return {
    ...template,
    skillsFocus: [...template.skillsFocus],
  };
}

async function loadTemplates(): Promise<SessionTemplate[]> {
  return mockTemplates.map(cloneTemplate);
}

async function saveTemplates(templates: SessionTemplate[]): Promise<void> {
  mockTemplates = templates.map(cloneTemplate);
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

    const result = await apiFetch<SessionTemplateListResponse>(
      '/v1/coaches/me/session-templates',
      {
        method: 'GET',
      },
    );
    if (!result.success) {
      logger.error('Failed to load authoritative coach session templates', {
        coachId,
        error: result.error.message,
      });
      throw new Error(result.error.message);
    }
    return result.data.templates;
  },

  /**
   * Get a single template by ID.
   */
  async getTemplate(templateId: string): Promise<SessionTemplate | null> {
    if (USE_MOCK) {
      const all = await loadTemplates();
      return all.find((t) => t.id === templateId) ?? null;
    }

    const result = await apiFetch<SessionTemplateResponse>(
      `/v1/coaches/me/session-templates/${templateId}`,
      {
        method: 'GET',
      },
    );
    if (result.success) {
      return result.data.template;
    }
    if (result.error.code === 'NOT_FOUND') {
      return null;
    }
    throw new Error(result.error.message);
  },

  /**
   * Create or update a session type preset.
   */
  async saveTemplate(
    template: Omit<SessionTemplate, 'id' | 'createdAt'> & { id?: string; createdAt?: string },
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

    const result = await apiFetch<SessionTemplateResponse>(
      template.id
        ? `/v1/coaches/me/session-templates/${template.id}`
        : '/v1/coaches/me/session-templates',
      {
        method: template.id ? 'PATCH' : 'POST',
        body: JSON.stringify(toWritePayload(template)),
      },
    );
    if (!result.success) {
      throw new Error(result.error.message);
    }
    return result.data.template;
  },

  /**
   * Delete a session type preset.
   */
  async deleteTemplate(templateId: string): Promise<void> {
    if (USE_MOCK) {
      const all = await loadTemplates();
      const existing = all.find((t) => t.id === templateId);
      const filtered = all.filter((t) => t.id !== templateId);
      await saveTemplates(filtered);
      emitTyped(ServiceEvents.SESSION_TEMPLATE_DELETED, {
        templateId,
        coachId: existing?.coachId,
      });
      return;
    }

    const result = await apiFetch<void>(`/v1/coaches/me/session-templates/${templateId}`, {
      method: 'DELETE',
    });
    if (!result.success) {
      throw new Error(result.error.message);
    }
    emitTyped(ServiceEvents.SESSION_TEMPLATE_DELETED, { templateId });
  },

  /**
   * Return the default presets (for display before seeding).
   */
  getDefaults(): Omit<SessionTemplate, 'id' | 'coachId' | 'createdAt'>[] {
    return [...DEFAULT_TEMPLATES];
  },

  __resetMockTemplates(): void {
    mockTemplates = [];
  },
};
