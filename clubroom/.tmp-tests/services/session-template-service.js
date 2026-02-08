"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionTemplateService = void 0;
const api_client_1 = require("./api-client");
const config_1 = require("@/constants/config");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('SessionTemplateService');
const USE_MOCK = config_1.api.useMock;
// Default presets seeded on first load
const DEFAULT_TEMPLATES = [
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
async function loadTemplates() {
    try {
        const stored = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.SESSION_TEMPLATES, null);
        if (stored)
            return stored;
    }
    catch (error) {
        logger.error('Failed to load session templates', error);
    }
    return [];
}
async function saveTemplates(templates) {
    try {
        await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.SESSION_TEMPLATES, templates);
    }
    catch (error) {
        logger.error('Failed to save session templates', error);
    }
}
exports.sessionTemplateService = {
    /**
     * Get all session type presets for a coach.
     * Seeds defaults on first call if none exist.
     */
    async getTemplates(coachId) {
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
    async getTemplate(templateId) {
        if (USE_MOCK) {
            const all = await loadTemplates();
            return all.find((t) => t.id === templateId) ?? null;
        }
        const response = await fetch(`/api/session-templates/${templateId}`);
        if (!response.ok)
            return null;
        return response.json();
    },
    /**
     * Create or update a session type preset.
     */
    async saveTemplate(template) {
        const saved = {
            ...template,
            id: template.id || `stmpl_${Date.now()}`,
            createdAt: template.createdAt || new Date().toISOString(),
        };
        if (USE_MOCK) {
            const all = await loadTemplates();
            const existingIndex = all.findIndex((t) => t.id === saved.id);
            if (existingIndex >= 0) {
                all[existingIndex] = saved;
            }
            else {
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
    async deleteTemplate(templateId) {
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
    getDefaults() {
        return [...DEFAULT_TEMPLATES];
    },
};
