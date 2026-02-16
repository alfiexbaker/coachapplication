"use strict";
/**
 * Child Service Tests
 *
 * Tests for child profiles: CRUD, disabilities, special needs,
 * age calculation, search by name, coach summary.
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
const child_service_1 = require("../../services/child-service");
const api_client_1 = require("../../services/api-client");
const rid = () => Math.random().toString(36).slice(2, 10);
function makeChildInput(overrides = {}) {
    return {
        firstName: `First_${rid()}`,
        lastName: `Last_${rid()}`,
        gender: 'MALE',
        relationship: 'SON',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+44 7700 123456',
        emergencyContactRelation: 'Mother',
        ...overrides,
    };
}
(0, node_test_1.describe)('childService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove('children_profiles');
    });
    // ---------------------------------------------------------------------------
    // createChild + getChild
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('createChild + getChild', () => {
        (0, node_test_1.default)('creates a child with correct fields', async () => {
            const parentId = `p_${rid()}`;
            const child = await child_service_1.childService.createChild(parentId, makeChildInput({
                firstName: 'Alice',
                lastName: 'Smith',
            }));
            strict_1.default.ok(child.id);
            strict_1.default.equal(child.parentId, parentId);
            strict_1.default.equal(child.firstName, 'Alice');
            strict_1.default.equal(child.gender, 'MALE');
        });
        (0, node_test_1.default)('getChild returns created child', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            const found = await child_service_1.childService.getChild(child.id);
            strict_1.default.ok(found);
            strict_1.default.equal(found.id, child.id);
        });
        (0, node_test_1.default)('getChild returns null for unknown id', async () => {
            const result = await child_service_1.childService.getChild(`unknown_${rid()}`);
            strict_1.default.equal(result, null);
        });
    });
    // ---------------------------------------------------------------------------
    // getChildren
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getChildren', () => {
        (0, node_test_1.default)('returns children for parent', async () => {
            const parentId = `p_${rid()}`;
            await child_service_1.childService.createChild(parentId, makeChildInput());
            await child_service_1.childService.createChild(parentId, makeChildInput());
            await child_service_1.childService.createChild(`other_${rid()}`, makeChildInput());
            const children = await child_service_1.childService.getChildren(parentId);
            strict_1.default.equal(children.length, 2);
        });
    });
    // ---------------------------------------------------------------------------
    // updateChild
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('updateChild', () => {
        (0, node_test_1.default)('updates child and returns ok', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            const result = await child_service_1.childService.updateChild(child.id, { firstName: 'Updated' });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.firstName, 'Updated');
            }
        });
        (0, node_test_1.default)('returns err for unknown child', async () => {
            const result = await child_service_1.childService.updateChild(`unknown_${rid()}`, { firstName: 'X' });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // deleteChild
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('deleteChild', () => {
        (0, node_test_1.default)('removes child from storage', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            await child_service_1.childService.deleteChild(child.id);
            const found = await child_service_1.childService.getChild(child.id);
            strict_1.default.equal(found, null);
        });
    });
    // ---------------------------------------------------------------------------
    // addDisability / removeDisability
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('addDisability + removeDisability', () => {
        (0, node_test_1.default)('adds a disability to a child', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            const result = await child_service_1.childService.addDisability(child.id, {
                type: 'ADHD',
                description: 'Mild ADHD',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.disabilities.length, 1);
                strict_1.default.equal(result.data.disabilities[0].type, 'ADHD');
                strict_1.default.equal(result.data.hasSpecialNeeds, true);
            }
        });
        (0, node_test_1.default)('removes a disability from a child', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            const added = await child_service_1.childService.addDisability(child.id, { type: 'Dyslexia' });
            if (!added.success)
                return;
            const disId = added.data.disabilities[0].id;
            const result = await child_service_1.childService.removeDisability(child.id, disId);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.disabilities.length, 0);
            }
        });
        (0, node_test_1.default)('addDisability returns err for unknown child', async () => {
            const result = await child_service_1.childService.addDisability(`unknown_${rid()}`, { type: 'X' });
            strict_1.default.strictEqual(result.success, false);
        });
    });
    // ---------------------------------------------------------------------------
    // addSpecialNeed / removeSpecialNeed
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('addSpecialNeed + removeSpecialNeed', () => {
        (0, node_test_1.default)('adds a special need', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            const result = await child_service_1.childService.addSpecialNeed(child.id, {
                category: 'BEHAVIORAL',
                name: 'Needs structure',
            });
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.specialNeeds.length, 1);
                strict_1.default.equal(result.data.hasSpecialNeeds, true);
            }
        });
        (0, node_test_1.default)('removes a special need', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput());
            const added = await child_service_1.childService.addSpecialNeed(child.id, {
                category: 'SENSORY',
                name: 'Noise sensitivity',
            });
            if (!added.success)
                return;
            const snId = added.data.specialNeeds[0].id;
            const result = await child_service_1.childService.removeSpecialNeed(child.id, snId);
            strict_1.default.equal(result.success, true);
            if (result.success) {
                strict_1.default.equal(result.data.specialNeeds.length, 0);
            }
        });
    });
    // ---------------------------------------------------------------------------
    // getAge
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getAge', () => {
        (0, node_test_1.default)('returns age for valid date', () => {
            const dob = '2012-01-01';
            const age = child_service_1.childService.getAge(dob);
            strict_1.default.ok(age !== null && age >= 13);
        });
        (0, node_test_1.default)('returns null for undefined', () => {
            strict_1.default.equal(child_service_1.childService.getAge(undefined), null);
        });
    });
    // ---------------------------------------------------------------------------
    // getChildrenWithSpecialNeeds
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getChildrenWithSpecialNeeds', () => {
        (0, node_test_1.default)('returns only children with special needs', async () => {
            const parentId = `p_${rid()}`;
            const c1 = await child_service_1.childService.createChild(parentId, makeChildInput());
            await child_service_1.childService.createChild(parentId, makeChildInput());
            await child_service_1.childService.addDisability(c1.id, { type: 'ADHD' });
            const result = await child_service_1.childService.getChildrenWithSpecialNeeds(parentId);
            strict_1.default.equal(result.length, 1);
            strict_1.default.equal(result[0].id, c1.id);
        });
    });
    // ---------------------------------------------------------------------------
    // getChildByName
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getChildByName', () => {
        (0, node_test_1.default)('finds child by first and last name', async () => {
            const fn = `Unique_${rid()}`;
            const ln = `Name_${rid()}`;
            await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput({ firstName: fn, lastName: ln }));
            const found = await child_service_1.childService.getChildByName(fn, ln);
            strict_1.default.ok(found);
            strict_1.default.equal(found.firstName, fn);
        });
        (0, node_test_1.default)('returns null for unknown name', async () => {
            const result = await child_service_1.childService.getChildByName('Nobody', 'Exists');
            strict_1.default.equal(result, null);
        });
    });
    // ---------------------------------------------------------------------------
    // getCoachSummary
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getCoachSummary', () => {
        (0, node_test_1.default)('returns summary with name and notes', async () => {
            const child = await child_service_1.childService.createChild(`p_${rid()}`, makeChildInput({
                firstName: 'Test',
                lastName: 'Kid',
                communicationNotes: 'Be gentle',
                allergies: ['Peanuts'],
            }));
            const summary = child_service_1.childService.getCoachSummary(child);
            strict_1.default.equal(summary.name, 'Test Kid');
            strict_1.default.ok(summary.quickNotes.includes('Be gentle'));
            strict_1.default.ok(summary.allergies.includes('Peanuts'));
        });
    });
});
