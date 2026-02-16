"use strict";
/**
 * Tests for child-service event emissions (CHILD_PROFILES_UPDATED)
 *
 * Verifies that createChild, updateChild, deleteChild emit the correct
 * typed event on the event bus.
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
const event_bus_1 = require("../../services/event-bus");
const api_client_1 = require("../../services/api-client");
const storage_keys_1 = require("../../constants/storage-keys");
/** Collect all CHILD_PROFILES_UPDATED events during a test. */
function collectEvents() {
    const events = [];
    const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.CHILD_PROFILES_UPDATED, (payload) => events.push(payload));
    return { events, unsub };
}
const TEST_PARENT_ID = 'test-parent-evt-1';
const baseInput = {
    firstName: 'Test',
    lastName: 'Child',
    gender: 'MALE',
    relationship: 'SON',
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+44 7700 000001',
    emergencyContactRelation: 'Mother',
};
// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
(0, node_test_1.beforeEach)(async () => {
    // Clear storage to start with empty state per test
    await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES);
    // Seed with an empty array so loadFromStorage returns [] instead of mock defaults
    await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.CHILDREN_PROFILES, []);
});
(0, node_test_1.afterEach)(() => {
    event_bus_1.eventBus.clearAll();
});
// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
(0, node_test_1.describe)('child-service event emissions', () => {
    (0, node_test_1.default)('createChild emits CHILD_PROFILES_UPDATED with action=created', async () => {
        const { events, unsub } = collectEvents();
        const created = await child_service_1.childService.createChild(TEST_PARENT_ID, baseInput);
        unsub();
        strict_1.default.equal(events.length, 1);
        strict_1.default.equal(events[0].parentId, TEST_PARENT_ID);
        strict_1.default.equal(events[0].action, 'created');
        strict_1.default.equal(events[0].childId, created.id);
    });
    (0, node_test_1.default)('updateChild emits CHILD_PROFILES_UPDATED with action=updated', async () => {
        // Create a child first
        const created = await child_service_1.childService.createChild(TEST_PARENT_ID, baseInput);
        event_bus_1.eventBus.clearAll(); // Reset events from create
        const { events, unsub } = collectEvents();
        const result = await child_service_1.childService.updateChild(created.id, { firstName: 'Updated' });
        unsub();
        strict_1.default.equal(result.success, true);
        strict_1.default.equal(events.length, 1);
        strict_1.default.equal(events[0].parentId, TEST_PARENT_ID);
        strict_1.default.equal(events[0].action, 'updated');
        strict_1.default.equal(events[0].childId, created.id);
    });
    (0, node_test_1.default)('updateChild returns NOT_FOUND for non-existent child', async () => {
        const { events, unsub } = collectEvents();
        const result = await child_service_1.childService.updateChild('non-existent-xyz', { firstName: 'Nope' });
        unsub();
        strict_1.default.equal(result.success, false);
        if (!result.success) {
            strict_1.default.equal(result.error.code, 'NOT_FOUND');
        }
        // No event should be emitted on failure
        strict_1.default.equal(events.length, 0);
    });
    (0, node_test_1.default)('deleteChild emits CHILD_PROFILES_UPDATED with action=deleted', async () => {
        const created = await child_service_1.childService.createChild(TEST_PARENT_ID, baseInput);
        event_bus_1.eventBus.clearAll();
        const { events, unsub } = collectEvents();
        await child_service_1.childService.deleteChild(created.id);
        unsub();
        strict_1.default.equal(events.length, 1);
        strict_1.default.equal(events[0].parentId, TEST_PARENT_ID);
        strict_1.default.equal(events[0].action, 'deleted');
        strict_1.default.equal(events[0].childId, created.id);
    });
    (0, node_test_1.default)('deleteChild does not emit when child does not exist', async () => {
        const { events, unsub } = collectEvents();
        await child_service_1.childService.deleteChild('non-existent-xyz');
        unsub();
        // No event because deletedChild was not found
        strict_1.default.equal(events.length, 0);
    });
    (0, node_test_1.default)('setActiveChildId emits FAMILY_ACTIVE_CHILD_CHANGED', async () => {
        const events = [];
        const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => events.push(payload));
        await child_service_1.childService.setActiveChildId('child-abc', 'Tom');
        unsub();
        strict_1.default.equal(events.length, 1);
        strict_1.default.equal(events[0].childId, 'child-abc');
        strict_1.default.equal(events[0].childName, 'Tom');
    });
    (0, node_test_1.default)('setActiveChildId with null clears active child', async () => {
        const events = [];
        const unsub = event_bus_1.eventBus.on(event_bus_1.ServiceEvents.FAMILY_ACTIVE_CHILD_CHANGED, (payload) => events.push(payload));
        await child_service_1.childService.setActiveChildId(null);
        unsub();
        strict_1.default.equal(events.length, 1);
        strict_1.default.equal(events[0].childId, null);
    });
    (0, node_test_1.default)('getActiveChildId returns stored value', async () => {
        await child_service_1.childService.setActiveChildId('child-xyz', 'Lily');
        const result = await child_service_1.childService.getActiveChildId();
        strict_1.default.equal(result, 'child-xyz');
    });
    (0, node_test_1.default)('getActiveChildId returns null when no active child set', async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.ACTIVE_CHILD_ID);
        const result = await child_service_1.childService.getActiveChildId();
        strict_1.default.equal(result, null);
    });
});
