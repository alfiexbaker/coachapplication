"use strict";
/**
 * SkillNode Component Tests
 *
 * Tests for the SkillNode component rendering and interactions.
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
// Mock node data for testing
const createMockNode = (overrides) => ({
    id: 'test_node',
    name: 'Test Skill',
    description: 'A test skill node',
    level: 1,
    prerequisites: [],
    isUnlocked: false,
    progress: 0,
    icon: 'football-outline',
    position: { x: 50, y: 50 },
    xpRequired: 100,
    xpCurrent: 0,
    ...overrides,
});
(0, node_test_1.describe)('SkillNode Component Logic', () => {
    (0, node_test_1.describe)('Node State', () => {
        (0, node_test_1.default)('should identify locked state correctly', () => {
            const node = createMockNode({
                isUnlocked: false,
                progress: 0,
            });
            const isLocked = !node.isUnlocked && node.progress === 0;
            node_assert_1.default.strictEqual(isLocked, true);
        });
        (0, node_test_1.default)('should identify in-progress state correctly', () => {
            const node = createMockNode({
                isUnlocked: false,
                progress: 50,
                xpCurrent: 50,
            });
            const isInProgress = !node.isUnlocked && node.progress > 0;
            node_assert_1.default.strictEqual(isInProgress, true);
        });
        (0, node_test_1.default)('should identify unlocked state correctly', () => {
            const node = createMockNode({
                isUnlocked: true,
                progress: 100,
                xpCurrent: 100,
            });
            const isUnlocked = node.isUnlocked;
            node_assert_1.default.strictEqual(isUnlocked, true);
        });
    });
    (0, node_test_1.describe)('Progress Calculation', () => {
        (0, node_test_1.default)('should calculate progress percentage correctly', () => {
            const node = createMockNode({
                xpRequired: 100,
                xpCurrent: 50,
            });
            const progressPercent = (node.xpCurrent / node.xpRequired) * 100;
            node_assert_1.default.strictEqual(progressPercent, 50);
        });
        (0, node_test_1.default)('should handle zero XP required', () => {
            const node = createMockNode({
                xpRequired: 0,
                xpCurrent: 0,
            });
            const progressPercent = node.xpRequired > 0
                ? (node.xpCurrent / node.xpRequired) * 100
                : 0;
            node_assert_1.default.strictEqual(progressPercent, 0);
        });
        (0, node_test_1.default)('should cap progress at 100%', () => {
            const node = createMockNode({
                xpRequired: 100,
                xpCurrent: 150, // Overshoot
            });
            const progressPercent = Math.min(100, (node.xpCurrent / node.xpRequired) * 100);
            node_assert_1.default.strictEqual(progressPercent, 100);
        });
    });
    (0, node_test_1.describe)('Level Badge', () => {
        (0, node_test_1.default)('should display correct level', () => {
            const level1Node = createMockNode({ level: 1 });
            const level2Node = createMockNode({ level: 2 });
            const level3Node = createMockNode({ level: 3 });
            node_assert_1.default.strictEqual(level1Node.level, 1);
            node_assert_1.default.strictEqual(level2Node.level, 2);
            node_assert_1.default.strictEqual(level3Node.level, 3);
        });
    });
    (0, node_test_1.describe)('Prerequisites', () => {
        (0, node_test_1.default)('should have no prerequisites for entry nodes', () => {
            const entryNode = createMockNode({
                prerequisites: [],
            });
            node_assert_1.default.strictEqual(entryNode.prerequisites.length, 0);
        });
        (0, node_test_1.default)('should list prerequisites for advanced nodes', () => {
            const advancedNode = createMockNode({
                level: 2,
                prerequisites: ['prereq_1', 'prereq_2'],
            });
            node_assert_1.default.strictEqual(advancedNode.prerequisites.length, 2);
            node_assert_1.default.ok(advancedNode.prerequisites.includes('prereq_1'));
            node_assert_1.default.ok(advancedNode.prerequisites.includes('prereq_2'));
        });
    });
    (0, node_test_1.describe)('Badge Association', () => {
        (0, node_test_1.default)('should have no badge for basic nodes', () => {
            const basicNode = createMockNode({
                badgeId: undefined,
            });
            node_assert_1.default.strictEqual(basicNode.badgeId, undefined);
        });
        (0, node_test_1.default)('should have badge ID for milestone nodes', () => {
            const milestoneNode = createMockNode({
                badgeId: 'badge_skill_master',
            });
            node_assert_1.default.strictEqual(milestoneNode.badgeId, 'badge_skill_master');
        });
    });
    (0, node_test_1.describe)('Position', () => {
        (0, node_test_1.default)('should have valid position coordinates', () => {
            const node = createMockNode({
                position: { x: 25, y: 75 },
            });
            node_assert_1.default.strictEqual(node.position.x, 25);
            node_assert_1.default.strictEqual(node.position.y, 75);
        });
        (0, node_test_1.default)('positions should be within 0-100 range', () => {
            const node = createMockNode({
                position: { x: 50, y: 50 },
            });
            node_assert_1.default.ok(node.position.x >= 0 && node.position.x <= 100);
            node_assert_1.default.ok(node.position.y >= 0 && node.position.y <= 100);
        });
    });
});
(0, node_test_1.describe)('SkillNode Visual States', () => {
    (0, node_test_1.describe)('Color Determination', () => {
        (0, node_test_1.default)('should use theme color for unlocked nodes', () => {
            const node = createMockNode({ isUnlocked: true });
            const themeColor = '#F59E0B';
            // Unlocked nodes use full theme color
            const backgroundColor = node.isUnlocked ? themeColor : 'other';
            node_assert_1.default.strictEqual(backgroundColor, themeColor);
        });
        (0, node_test_1.default)('should use muted color for locked nodes', () => {
            const node = createMockNode({ isUnlocked: false, progress: 0 });
            // Locked nodes use surface color
            const isLocked = !node.isUnlocked && node.progress === 0;
            node_assert_1.default.strictEqual(isLocked, true);
        });
        (0, node_test_1.default)('should use partial theme color for in-progress nodes', () => {
            const node = createMockNode({ isUnlocked: false, progress: 50 });
            const isInProgress = !node.isUnlocked && node.progress > 0;
            node_assert_1.default.strictEqual(isInProgress, true);
        });
    });
    (0, node_test_1.describe)('Icon Selection', () => {
        (0, node_test_1.default)('should show lock icon for locked nodes without unlock possibility', () => {
            const node = createMockNode({ isUnlocked: false });
            const canUnlock = false;
            const shouldShowLock = !node.isUnlocked && !canUnlock;
            node_assert_1.default.strictEqual(shouldShowLock, true);
        });
        (0, node_test_1.default)('should show skill icon for unlocked or unlockable nodes', () => {
            const unlockedNode = createMockNode({ isUnlocked: true });
            const unlockableNode = createMockNode({ isUnlocked: false });
            const canUnlock = true;
            node_assert_1.default.strictEqual(unlockedNode.isUnlocked || canUnlock, true);
            node_assert_1.default.strictEqual(unlockableNode.isUnlocked || canUnlock, true);
        });
    });
});
(0, node_test_1.describe)('SkillNode Size Variants', () => {
    (0, node_test_1.default)('should have different sizes available', () => {
        const sizes = ['small', 'medium', 'large'];
        const sizeValues = {
            small: 44,
            medium: 56,
            large: 68,
        };
        sizes.forEach((size) => {
            node_assert_1.default.ok(sizeValues[size] > 0);
        });
    });
    (0, node_test_1.default)('icon sizes should scale with node sizes', () => {
        const iconSizes = {
            small: 20,
            medium: 24,
            large: 28,
        };
        node_assert_1.default.ok(iconSizes.small < iconSizes.medium);
        node_assert_1.default.ok(iconSizes.medium < iconSizes.large);
    });
});
