"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const session_template_service_1 = require("@/services/session-template-service");
(0, node_test_1.describe)('sessionTemplateService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SESSION_TEMPLATES);
    });
    (0, node_test_1.it)('seeds default templates for a coach (happy path)', async () => {
        const templates = await session_template_service_1.sessionTemplateService.getTemplates('coach_templates_1');
        strict_1.default.ok(templates.length > 0);
        strict_1.default.ok(templates.every((item) => item.coachId === 'coach_templates_1'));
    });
    (0, node_test_1.it)('returns null for unknown template id (empty path)', async () => {
        const template = await session_template_service_1.sessionTemplateService.getTemplate('template_missing');
        strict_1.default.equal(template, null);
    });
    (0, node_test_1.it)('saves and deletes a template', async () => {
        const saved = await session_template_service_1.sessionTemplateService.saveTemplate({
            coachId: 'coach_templates_2',
            name: 'Extra Session',
            type: 'small-group',
            duration: 75,
            capacity: 6,
            defaultPrice: 40,
            description: 'Extra mixed session',
            skillsFocus: ['Passing'],
        });
        strict_1.default.ok(saved.id);
        const fetched = await session_template_service_1.sessionTemplateService.getTemplate(saved.id);
        strict_1.default.equal(fetched?.id, saved.id);
        await session_template_service_1.sessionTemplateService.deleteTemplate(saved.id);
        const afterDelete = await session_template_service_1.sessionTemplateService.getTemplate(saved.id);
        strict_1.default.equal(afterDelete, null);
    });
});
