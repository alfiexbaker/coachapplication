"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = require("node:test");
const skill_definition_service_1 = require("@/services/skills/skill-definition-service");
(0, node_test_1.describe)('skillDefinitionService', () => {
    (0, node_test_1.it)('returns all skill trees (happy path)', async () => {
        const result = await skill_definition_service_1.skillDefinitionService.getSkillTrees();
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.ok(result.data.length > 0);
        strict_1.default.ok(result.data[0].nodes.length > 0);
    });
    (0, node_test_1.it)('returns null for unknown category (empty path)', async () => {
        const result = await skill_definition_service_1.skillDefinitionService.getSkillTree('UNKNOWN');
        strict_1.default.equal(result.success, true);
        if (!result.success)
            return;
        strict_1.default.equal(result.data, null);
    });
    (0, node_test_1.it)('finds node by id and validates tree structure', async () => {
        const trees = await skill_definition_service_1.skillDefinitionService.getSkillTrees();
        strict_1.default.equal(trees.success, true);
        if (!trees.success)
            return;
        const firstNodeId = trees.data[0].nodes[0].id;
        const found = skill_definition_service_1.skillDefinitionService.findNodeById(firstNodeId);
        strict_1.default.ok(found);
        strict_1.default.equal(found?.node.id, firstNodeId);
        const valid = skill_definition_service_1.skillDefinitionService.validateTreeStructure(trees.data[0]);
        strict_1.default.equal(valid, true);
        const invalidTree = {
            ...trees.data[0],
            nodes: [
                ...trees.data[0].nodes.slice(0, 1),
                {
                    ...trees.data[0].nodes[1],
                    prerequisites: ['node_that_does_not_exist'],
                },
            ],
        };
        strict_1.default.strictEqual(skill_definition_service_1.skillDefinitionService.validateTreeStructure(invalidTree), false);
    });
});
