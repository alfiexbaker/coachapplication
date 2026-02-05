"use strict";
/**
 * Skill Tree Service Tests
 *
 * Unit tests for the skill tree service functionality including
 * fetching trees, tracking progress, and unlocking nodes.
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
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const skills_1 = require("../../services/skills");
const TEST_USER_ID = 'test_user_skills';
// Reset progress before each test
(0, node_test_1.beforeEach)(async () => {
    await skills_1.skillTreeService.resetUserProgress(TEST_USER_ID);
});
// Clean up after all tests
(0, node_test_1.after)(async () => {
    await skills_1.skillTreeService.resetUserProgress(TEST_USER_ID);
});
(0, node_test_1.describe)('Skill Tree Service', () => {
    (0, node_test_1.describe)('getSkillTrees', () => {
        (0, node_test_1.default)('should return all skill trees', async () => {
            const trees = await skills_1.skillTreeService.getSkillTrees();
            node_assert_1.default.ok(Array.isArray(trees));
            node_assert_1.default.ok(trees.length >= 6, 'Should have at least 6 skill trees');
            trees.forEach((tree) => {
                node_assert_1.default.ok(tree.id);
                node_assert_1.default.ok(tree.category);
                node_assert_1.default.ok(tree.name);
                node_assert_1.default.ok(tree.nodes.length > 0);
                node_assert_1.default.ok(tree.themeColor);
            });
        });
        (0, node_test_1.default)('should have valid category for each tree', async () => {
            const trees = await skills_1.skillTreeService.getSkillTrees();
            const validCategories = [
                'DRIBBLING',
                'PASSING',
                'SHOOTING',
                'DEFENDING',
                'GOALKEEPING',
                'FITNESS',
                'TACTICS',
            ];
            trees.forEach((tree) => {
                node_assert_1.default.ok(validCategories.includes(tree.category), `Invalid category: ${tree.category}`);
            });
        });
    });
    (0, node_test_1.describe)('getSkillTree', () => {
        (0, node_test_1.default)('should return a specific skill tree by category', async () => {
            const tree = await skills_1.skillTreeService.getSkillTree('DRIBBLING');
            node_assert_1.default.ok(tree);
            node_assert_1.default.strictEqual(tree.category, 'DRIBBLING');
            node_assert_1.default.strictEqual(tree.name, 'Ball Mastery');
            node_assert_1.default.ok(tree.nodes.length > 0);
        });
        (0, node_test_1.default)('should return null for invalid category', async () => {
            // @ts-expect-error Testing invalid input
            const tree = await skills_1.skillTreeService.getSkillTree('INVALID_CATEGORY');
            node_assert_1.default.strictEqual(tree, null);
        });
    });
    (0, node_test_1.describe)('getUserProgress', () => {
        (0, node_test_1.default)('should return null for user with no progress', async () => {
            const progress = await skills_1.skillTreeService.getUserProgress(TEST_USER_ID, 'tree_dribbling');
            node_assert_1.default.strictEqual(progress, null);
        });
        (0, node_test_1.default)('should return progress after XP is added', async () => {
            await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 50);
            const progress = await skills_1.skillTreeService.getUserProgress(TEST_USER_ID, 'tree_dribbling');
            node_assert_1.default.ok(progress);
            node_assert_1.default.strictEqual(progress.userId, TEST_USER_ID);
            node_assert_1.default.strictEqual(progress.treeId, 'tree_dribbling');
            node_assert_1.default.ok(progress.nodeProgress['drib_1_basic']);
            node_assert_1.default.strictEqual(progress.nodeProgress['drib_1_basic'].currentXp, 50);
        });
    });
    (0, node_test_1.describe)('addXpToNode', () => {
        (0, node_test_1.default)('should add XP to a node with no prerequisites', async () => {
            const result = await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 50);
            node_assert_1.default.ok(result);
            node_assert_1.default.strictEqual(result.progress.currentXp, 50);
            node_assert_1.default.strictEqual(result.justUnlocked, false);
            node_assert_1.default.strictEqual(result.node.xpCurrent, 50);
        });
        (0, node_test_1.default)('should unlock node when XP reaches threshold', async () => {
            const result = await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 100);
            node_assert_1.default.ok(result);
            node_assert_1.default.strictEqual(result.progress.currentXp, 100);
            node_assert_1.default.strictEqual(result.progress.isUnlocked, true);
            node_assert_1.default.strictEqual(result.justUnlocked, true);
            node_assert_1.default.ok(result.progress.unlockedAt);
        });
        (0, node_test_1.default)('should not exceed max XP', async () => {
            await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 100);
            const result = await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 50);
            node_assert_1.default.ok(result);
            node_assert_1.default.strictEqual(result.progress.currentXp, 100); // Capped at max
        });
        (0, node_test_1.default)('should return null for invalid node ID', async () => {
            const result = await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'invalid_node_id', 50);
            node_assert_1.default.strictEqual(result, null);
        });
        (0, node_test_1.default)('should fail when prerequisites not met', async () => {
            // Try to add XP to a node that requires prerequisites
            const result = await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_2_turns', 50);
            node_assert_1.default.strictEqual(result, null);
        });
        (0, node_test_1.default)('should succeed after prerequisites are unlocked', async () => {
            // Unlock prerequisite nodes first
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_running');
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_shield');
            // Now should be able to add XP to drib_2_turns
            const result = await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_2_turns', 50);
            node_assert_1.default.ok(result);
            node_assert_1.default.strictEqual(result.progress.currentXp, 50);
        });
    });
    (0, node_test_1.describe)('unlockNode', () => {
        (0, node_test_1.default)('should directly unlock a node', async () => {
            const result = await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
            node_assert_1.default.ok(result);
            node_assert_1.default.strictEqual(result.progress.isUnlocked, true);
            node_assert_1.default.strictEqual(result.progress.currentXp, result.progress.maxXp);
        });
        (0, node_test_1.default)('should return null for invalid node', async () => {
            const result = await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'invalid_node');
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('calculateTreeProgress', () => {
        (0, node_test_1.default)('should return zero progress for new user', async () => {
            const progress = await skills_1.skillTreeService.calculateTreeProgress(TEST_USER_ID, 'tree_dribbling');
            node_assert_1.default.strictEqual(progress.unlockedNodes, 0);
            node_assert_1.default.strictEqual(progress.percentComplete, 0);
            node_assert_1.default.strictEqual(progress.totalXp, 0);
        });
        (0, node_test_1.default)('should calculate progress after unlocking nodes', async () => {
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
            const progress = await skills_1.skillTreeService.calculateTreeProgress(TEST_USER_ID, 'tree_dribbling');
            node_assert_1.default.strictEqual(progress.unlockedNodes, 1);
            node_assert_1.default.ok(progress.percentComplete > 0);
            node_assert_1.default.ok(progress.totalXp > 0);
        });
    });
    (0, node_test_1.describe)('getTreesSummary', () => {
        (0, node_test_1.default)('should return summary for all trees', async () => {
            const summary = await skills_1.skillTreeService.getTreesSummary(TEST_USER_ID);
            node_assert_1.default.ok(Array.isArray(summary));
            node_assert_1.default.ok(summary.length >= 6);
            summary.forEach((tree) => {
                node_assert_1.default.ok(tree.treeId);
                node_assert_1.default.ok(tree.category);
                node_assert_1.default.ok(tree.name);
                node_assert_1.default.ok(tree.icon);
                node_assert_1.default.ok(tree.themeColor);
                node_assert_1.default.ok(typeof tree.totalNodes === 'number');
                node_assert_1.default.ok(typeof tree.unlockedNodes === 'number');
                node_assert_1.default.ok(typeof tree.percentComplete === 'number');
            });
        });
    });
    (0, node_test_1.describe)('canUnlockNode', () => {
        (0, node_test_1.default)('should return true for node with no prerequisites', async () => {
            const canUnlock = await skills_1.skillTreeService.canUnlockNode(TEST_USER_ID, 'drib_1_basic');
            node_assert_1.default.strictEqual(canUnlock, true);
        });
        (0, node_test_1.default)('should return false for node with unmet prerequisites', async () => {
            const canUnlock = await skills_1.skillTreeService.canUnlockNode(TEST_USER_ID, 'drib_2_turns');
            node_assert_1.default.strictEqual(canUnlock, false);
        });
        (0, node_test_1.default)('should return true after prerequisites are met', async () => {
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_running');
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_shield');
            const canUnlock = await skills_1.skillTreeService.canUnlockNode(TEST_USER_ID, 'drib_2_turns');
            node_assert_1.default.strictEqual(canUnlock, true);
        });
        (0, node_test_1.default)('should return false for invalid node', async () => {
            const canUnlock = await skills_1.skillTreeService.canUnlockNode(TEST_USER_ID, 'invalid_node');
            node_assert_1.default.strictEqual(canUnlock, false);
        });
    });
    (0, node_test_1.describe)('getSkillTreeWithProgress', () => {
        (0, node_test_1.default)('should merge progress into tree nodes', async () => {
            await skills_1.skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 50);
            const tree = await skills_1.skillTreeService.getSkillTreeWithProgress(TEST_USER_ID, 'DRIBBLING');
            node_assert_1.default.ok(tree);
            const basicNode = tree.nodes.find((n) => n.id === 'drib_1_basic');
            node_assert_1.default.ok(basicNode);
            node_assert_1.default.strictEqual(basicNode.xpCurrent, 50);
            node_assert_1.default.strictEqual(basicNode.progress, 50);
        });
        (0, node_test_1.default)('should update unlocked count', async () => {
            await skills_1.skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
            const tree = await skills_1.skillTreeService.getSkillTreeWithProgress(TEST_USER_ID, 'DRIBBLING');
            node_assert_1.default.ok(tree);
            node_assert_1.default.strictEqual(tree.unlockedNodes, 1);
            node_assert_1.default.ok(tree.progressPercent > 0);
        });
    });
    (0, node_test_1.describe)('getCategoryInfo', () => {
        (0, node_test_1.default)('should return info for valid category', () => {
            const info = skills_1.skillTreeService.getCategoryInfo('DRIBBLING');
            node_assert_1.default.ok(info);
            node_assert_1.default.strictEqual(info.label, 'Ball Mastery');
            node_assert_1.default.ok(info.icon);
            node_assert_1.default.ok(info.color);
        });
        (0, node_test_1.default)('should return default for invalid category', () => {
            // @ts-expect-error Testing invalid input
            const info = skills_1.skillTreeService.getCategoryInfo('INVALID');
            node_assert_1.default.ok(info);
            node_assert_1.default.strictEqual(info.icon, 'help-outline');
        });
    });
    (0, node_test_1.describe)('SKILL_TREE_CATEGORIES', () => {
        (0, node_test_1.default)('should have all categories defined', () => {
            const expectedCategories = [
                'DRIBBLING',
                'PASSING',
                'SHOOTING',
                'DEFENDING',
                'GOALKEEPING',
                'FITNESS',
                'TACTICS',
            ];
            expectedCategories.forEach((category) => {
                node_assert_1.default.ok(skills_1.SKILL_TREE_CATEGORIES[category], `Missing category: ${category}`);
                node_assert_1.default.ok(skills_1.SKILL_TREE_CATEGORIES[category].label);
                node_assert_1.default.ok(skills_1.SKILL_TREE_CATEGORIES[category].icon);
                node_assert_1.default.ok(skills_1.SKILL_TREE_CATEGORIES[category].color);
            });
        });
    });
    (0, node_test_1.describe)('Node Structure Validation', () => {
        (0, node_test_1.default)('all nodes should have required fields', async () => {
            const trees = await skills_1.skillTreeService.getSkillTrees();
            trees.forEach((tree) => {
                tree.nodes.forEach((node) => {
                    node_assert_1.default.ok(node.id, `Node missing id in ${tree.category}`);
                    node_assert_1.default.ok(node.name, `Node ${node.id} missing name`);
                    node_assert_1.default.ok(node.description, `Node ${node.id} missing description`);
                    node_assert_1.default.ok([1, 2, 3].includes(node.level), `Node ${node.id} has invalid level`);
                    node_assert_1.default.ok(Array.isArray(node.prerequisites), `Node ${node.id} prerequisites not array`);
                    node_assert_1.default.ok(node.icon, `Node ${node.id} missing icon`);
                    node_assert_1.default.ok(node.position, `Node ${node.id} missing position`);
                    node_assert_1.default.ok(typeof node.position.x === 'number', `Node ${node.id} position.x not number`);
                    node_assert_1.default.ok(typeof node.position.y === 'number', `Node ${node.id} position.y not number`);
                    node_assert_1.default.ok(typeof node.xpRequired === 'number', `Node ${node.id} xpRequired not number`);
                });
            });
        });
        (0, node_test_1.default)('all prerequisite references should be valid', async () => {
            const trees = await skills_1.skillTreeService.getSkillTrees();
            trees.forEach((tree) => {
                const nodeIds = new Set(tree.nodes.map((n) => n.id));
                tree.nodes.forEach((node) => {
                    node.prerequisites.forEach((prereqId) => {
                        node_assert_1.default.ok(nodeIds.has(prereqId), `Node ${node.id} has invalid prerequisite: ${prereqId}`);
                    });
                });
            });
        });
        (0, node_test_1.default)('level 1 nodes should have no prerequisites', async () => {
            const trees = await skills_1.skillTreeService.getSkillTrees();
            trees.forEach((tree) => {
                const level1Nodes = tree.nodes.filter((n) => n.level === 1);
                level1Nodes.forEach((node) => {
                    // At least one level 1 node should have no prerequisites (entry point)
                    const hasEntryNode = level1Nodes.some((n) => n.prerequisites.length === 0);
                    node_assert_1.default.ok(hasEntryNode, `Tree ${tree.category} has no entry point (level 1 node with no prerequisites)`);
                });
            });
        });
    });
});
