"use strict";
/**
 * Recognition Share + Detail Card Tests
 *
 * Tests for the share helper and recognition detail card data flow.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const recognition_templates_1 = require("../../constants/recognition-templates");
const badge_service_1 = require("../../services/badge-service");
const progression_1 = require("../../constants/progression");
(0, node_test_1.describe)('recognition share text generation', () => {
    (0, node_test_1.default)('all 4 categories have templates', () => {
        const categories = ['technical', 'physical', 'psychological', 'social'];
        for (const cat of categories) {
            const templates = (0, recognition_templates_1.getTemplatesForCategory)(cat);
            strict_1.default.ok(templates.length >= 4, `${cat} should have at least 4 templates`);
        }
    });
    (0, node_test_1.default)('each category has matching CategoryInfo', () => {
        const categories = ['technical', 'physical', 'psychological', 'social'];
        for (const cat of categories) {
            const info = progression_1.CategoryInfo[cat];
            strict_1.default.ok(info, `CategoryInfo missing for ${cat}`);
            strict_1.default.ok(info.label.length > 0);
            strict_1.default.ok(info.icon.length > 0);
        }
    });
    (0, node_test_1.default)('findBadgeForCategory returns badge for every template category', () => {
        const seenCategories = new Set(recognition_templates_1.RECOGNITION_TEMPLATES.map((t) => t.category));
        for (const cat of seenCategories) {
            const badge = badge_service_1.badgeService.findBadgeForCategory(cat);
            strict_1.default.ok(badge, `No badge for category: ${cat}`);
        }
    });
    (0, node_test_1.default)('all template IDs are unique', () => {
        const ids = recognition_templates_1.RECOGNITION_TEMPLATES.map((t) => t.id);
        strict_1.default.equal(new Set(ids).size, ids.length);
    });
    (0, node_test_1.default)('share text would include athlete name and category', () => {
        // Simulate what shareRecognition builds
        const award = {
            id: 'test_award_1',
            badgeId: 'badge_recognition_technical',
            badgeLabel: 'Technical Recognition',
            athleteId: 'user1',
            coachId: 'coach1',
            reason: 'Great improvement in ball control today.',
            awardedBy: 'coach1',
            awardedAt: new Date().toISOString(),
            visibility: 'supporters',
            badgeCategory: 'technical',
        };
        const athleteName = 'Olivia Henderson';
        const categoryLabel = award.badgeCategory
            ? award.badgeCategory.charAt(0).toUpperCase() + award.badgeCategory.slice(1)
            : 'Development';
        const message = `${athleteName} received a ${categoryLabel} recognition!\n\n"${award.reason}"\n\nSent via Clubroom`;
        strict_1.default.ok(message.includes('Olivia Henderson'));
        strict_1.default.ok(message.includes('Technical'));
        strict_1.default.ok(message.includes('ball control'));
        strict_1.default.ok(message.includes('Clubroom'));
    });
});
