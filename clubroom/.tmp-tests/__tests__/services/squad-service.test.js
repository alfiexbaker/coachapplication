"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const storage_keys_1 = require("@/constants/storage-keys");
const api_client_1 = require("@/services/api-client");
const squad_service_1 = require("@/services/squad-service");
(0, node_test_1.describe)('squadService', () => {
    (0, node_test_1.beforeEach)(async () => {
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.CLUB_SQUADS);
        await api_client_1.apiClient.remove(storage_keys_1.STORAGE_KEYS.SQUAD_MEMBERS);
    });
    (0, node_test_1.it)('gets squads for a club and creates a custom squad (happy path)', async () => {
        const initial = await squad_service_1.squadService.getSquads('club_lions');
        strict_1.default.ok(initial.length > 0);
        const created = await squad_service_1.squadService.createSquad({
            clubId: 'club_lions',
            name: 'U13 Dev Squad',
            level: 'U13 · Development',
            description: 'Development pathway squad',
            meetingLocation: 'Pitch 4',
        });
        strict_1.default.ok(created.id.startsWith('squad_'));
        const fetched = await squad_service_1.squadService.getSquad(created.id);
        strict_1.default.ok(fetched);
        strict_1.default.equal(fetched?.name, 'U13 Dev Squad');
    });
    (0, node_test_1.it)('returns null for missing squad id (empty path)', async () => {
        const squad = await squad_service_1.squadService.getSquad('squad_missing');
        strict_1.default.equal(squad, null);
    });
    (0, node_test_1.it)('returns squad summary and helper labels', async () => {
        const summary = await squad_service_1.squadService.getSquadSummary('squad_u15');
        strict_1.default.ok(summary.squad);
        strict_1.default.ok(summary.memberCount >= 0);
        strict_1.default.ok(summary.parentCount >= 0);
        if (!summary.squad)
            return;
        const label = squad_service_1.squadService.formatSquadLabel(summary.squad);
        strict_1.default.ok(label.includes(summary.squad.name));
        strict_1.default.equal(squad_service_1.squadService.getAgeGroupLabel(summary.squad), 'U15');
    });
});
