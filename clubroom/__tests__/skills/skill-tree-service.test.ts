/**
 * Skill Tree Service Tests
 *
 * Unit tests for the skill tree service functionality including
 * fetching trees, tracking progress, and unlocking nodes.
 */

import assert from 'node:assert';
import test, { describe, beforeEach, after } from 'node:test';

import { skillTreeService, SKILL_TREE_CATEGORIES } from '../../services/skills';
import type { SkillTreeCategory } from '../../constants/types';

const TEST_USER_ID = 'test_user_skills';

// Reset progress before each test
beforeEach(async () => {
  await skillTreeService.resetUserProgress(TEST_USER_ID);
});

// Clean up after all tests
after(async () => {
  await skillTreeService.resetUserProgress(TEST_USER_ID);
});

describe('Skill Tree Service', () => {
  describe('getSkillTrees', () => {
    test('should return all skill trees', async () => {
      const trees = await skillTreeService.getSkillTrees();

      assert.ok(Array.isArray(trees));
      assert.ok(trees.length >= 6, 'Should have at least 6 skill trees');

      trees.forEach((tree) => {
        assert.ok(tree.id);
        assert.ok(tree.category);
        assert.ok(tree.name);
        assert.ok(tree.nodes.length > 0);
        assert.ok(tree.themeColor);
      });
    });

    test('should have valid category for each tree', async () => {
      const trees = await skillTreeService.getSkillTrees();
      const validCategories: SkillTreeCategory[] = [
        'DRIBBLING',
        'PASSING',
        'SHOOTING',
        'DEFENDING',
        'GOALKEEPING',
        'FITNESS',
        'TACTICS',
      ];

      trees.forEach((tree) => {
        assert.ok(
          validCategories.includes(tree.category),
          `Invalid category: ${tree.category}`
        );
      });
    });
  });

  describe('getSkillTree', () => {
    test('should return a specific skill tree by category', async () => {
      const tree = await skillTreeService.getSkillTree('DRIBBLING');

      assert.ok(tree);
      assert.strictEqual(tree.category, 'DRIBBLING');
      assert.strictEqual(tree.name, 'Ball Mastery');
      assert.ok(tree.nodes.length > 0);
    });

    test('should return null for invalid category', async () => {
      // @ts-expect-error Testing invalid input
      const tree = await skillTreeService.getSkillTree('INVALID_CATEGORY');

      assert.strictEqual(tree, null);
    });
  });

  describe('getUserProgress', () => {
    test('should return null for user with no progress', async () => {
      const progress = await skillTreeService.getUserProgress(
        TEST_USER_ID,
        'tree_dribbling'
      );

      assert.strictEqual(progress, null);
    });

    test('should return progress after XP is added', async () => {
      await skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 50);

      const progress = await skillTreeService.getUserProgress(
        TEST_USER_ID,
        'tree_dribbling'
      );

      assert.ok(progress);
      assert.strictEqual(progress.userId, TEST_USER_ID);
      assert.strictEqual(progress.treeId, 'tree_dribbling');
      assert.ok(progress.nodeProgress['drib_1_basic']);
      assert.strictEqual(progress.nodeProgress['drib_1_basic'].currentXp, 50);
    });
  });

  describe('addXpToNode', () => {
    test('should add XP to a node with no prerequisites', async () => {
      const result = await skillTreeService.addXpToNode(
        TEST_USER_ID,
        'drib_1_basic',
        50
      );

      assert.ok(result);
      assert.strictEqual(result.progress.currentXp, 50);
      assert.strictEqual(result.justUnlocked, false);
      assert.strictEqual(result.node.xpCurrent, 50);
    });

    test('should unlock node when XP reaches threshold', async () => {
      const result = await skillTreeService.addXpToNode(
        TEST_USER_ID,
        'drib_1_basic',
        100
      );

      assert.ok(result);
      assert.strictEqual(result.progress.currentXp, 100);
      assert.strictEqual(result.progress.isUnlocked, true);
      assert.strictEqual(result.justUnlocked, true);
      assert.ok(result.progress.unlockedAt);
    });

    test('should not exceed max XP', async () => {
      await skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 100);
      const result = await skillTreeService.addXpToNode(
        TEST_USER_ID,
        'drib_1_basic',
        50
      );

      assert.ok(result);
      assert.strictEqual(result.progress.currentXp, 100); // Capped at max
    });

    test('should return null for invalid node ID', async () => {
      const result = await skillTreeService.addXpToNode(
        TEST_USER_ID,
        'invalid_node_id',
        50
      );

      assert.strictEqual(result, null);
    });

    test('should fail when prerequisites not met', async () => {
      // Try to add XP to a node that requires prerequisites
      const result = await skillTreeService.addXpToNode(
        TEST_USER_ID,
        'drib_2_turns',
        50
      );

      assert.strictEqual(result, null);
    });

    test('should succeed after prerequisites are unlocked', async () => {
      // Unlock prerequisite nodes first
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_running');
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_shield');

      // Now should be able to add XP to drib_2_turns
      const result = await skillTreeService.addXpToNode(
        TEST_USER_ID,
        'drib_2_turns',
        50
      );

      assert.ok(result);
      assert.strictEqual(result.progress.currentXp, 50);
    });
  });

  describe('unlockNode', () => {
    test('should directly unlock a node', async () => {
      const result = await skillTreeService.unlockNode(
        TEST_USER_ID,
        'drib_1_basic'
      );

      assert.ok(result);
      assert.strictEqual(result.progress.isUnlocked, true);
      assert.strictEqual(result.progress.currentXp, result.progress.maxXp);
    });

    test('should return null for invalid node', async () => {
      const result = await skillTreeService.unlockNode(
        TEST_USER_ID,
        'invalid_node'
      );

      assert.strictEqual(result, null);
    });
  });

  describe('calculateTreeProgress', () => {
    test('should return zero progress for new user', async () => {
      const progress = await skillTreeService.calculateTreeProgress(
        TEST_USER_ID,
        'tree_dribbling'
      );

      assert.strictEqual(progress.unlockedNodes, 0);
      assert.strictEqual(progress.percentComplete, 0);
      assert.strictEqual(progress.totalXp, 0);
    });

    test('should calculate progress after unlocking nodes', async () => {
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');

      const progress = await skillTreeService.calculateTreeProgress(
        TEST_USER_ID,
        'tree_dribbling'
      );

      assert.strictEqual(progress.unlockedNodes, 1);
      assert.ok(progress.percentComplete > 0);
      assert.ok(progress.totalXp > 0);
    });
  });

  describe('getTreesSummary', () => {
    test('should return summary for all trees', async () => {
      const summary = await skillTreeService.getTreesSummary(TEST_USER_ID);

      assert.ok(Array.isArray(summary));
      assert.ok(summary.length >= 6);

      summary.forEach((tree) => {
        assert.ok(tree.treeId);
        assert.ok(tree.category);
        assert.ok(tree.name);
        assert.ok(tree.icon);
        assert.ok(tree.themeColor);
        assert.ok(typeof tree.totalNodes === 'number');
        assert.ok(typeof tree.unlockedNodes === 'number');
        assert.ok(typeof tree.percentComplete === 'number');
      });
    });
  });

  describe('canUnlockNode', () => {
    test('should return true for node with no prerequisites', async () => {
      const canUnlock = await skillTreeService.canUnlockNode(
        TEST_USER_ID,
        'drib_1_basic'
      );

      assert.strictEqual(canUnlock, true);
    });

    test('should return false for node with unmet prerequisites', async () => {
      const canUnlock = await skillTreeService.canUnlockNode(
        TEST_USER_ID,
        'drib_2_turns'
      );

      assert.strictEqual(canUnlock, false);
    });

    test('should return true after prerequisites are met', async () => {
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_running');
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_shield');

      const canUnlock = await skillTreeService.canUnlockNode(
        TEST_USER_ID,
        'drib_2_turns'
      );

      assert.strictEqual(canUnlock, true);
    });

    test('should return false for invalid node', async () => {
      const canUnlock = await skillTreeService.canUnlockNode(
        TEST_USER_ID,
        'invalid_node'
      );

      assert.strictEqual(canUnlock, false);
    });
  });

  describe('getSkillTreeWithProgress', () => {
    test('should merge progress into tree nodes', async () => {
      await skillTreeService.addXpToNode(TEST_USER_ID, 'drib_1_basic', 50);

      const tree = await skillTreeService.getSkillTreeWithProgress(
        TEST_USER_ID,
        'DRIBBLING'
      );

      assert.ok(tree);
      const basicNode = tree.nodes.find((n) => n.id === 'drib_1_basic');
      assert.ok(basicNode);
      assert.strictEqual(basicNode.xpCurrent, 50);
      assert.strictEqual(basicNode.progress, 50);
    });

    test('should update unlocked count', async () => {
      await skillTreeService.unlockNode(TEST_USER_ID, 'drib_1_basic');

      const tree = await skillTreeService.getSkillTreeWithProgress(
        TEST_USER_ID,
        'DRIBBLING'
      );

      assert.ok(tree);
      assert.strictEqual(tree.unlockedNodes, 1);
      assert.ok(tree.progressPercent > 0);
    });
  });

  describe('getCategoryInfo', () => {
    test('should return info for valid category', () => {
      const info = skillTreeService.getCategoryInfo('DRIBBLING');

      assert.ok(info);
      assert.strictEqual(info.label, 'Ball Mastery');
      assert.ok(info.icon);
      assert.ok(info.color);
    });

    test('should return default for invalid category', () => {
      // @ts-expect-error Testing invalid input
      const info = skillTreeService.getCategoryInfo('INVALID');

      assert.ok(info);
      assert.strictEqual(info.icon, 'help-outline');
    });
  });

  describe('SKILL_TREE_CATEGORIES', () => {
    test('should have all categories defined', () => {
      const expectedCategories: SkillTreeCategory[] = [
        'DRIBBLING',
        'PASSING',
        'SHOOTING',
        'DEFENDING',
        'GOALKEEPING',
        'FITNESS',
        'TACTICS',
      ];

      expectedCategories.forEach((category) => {
        assert.ok(
          SKILL_TREE_CATEGORIES[category],
          `Missing category: ${category}`
        );
        assert.ok(SKILL_TREE_CATEGORIES[category].label);
        assert.ok(SKILL_TREE_CATEGORIES[category].icon);
        assert.ok(SKILL_TREE_CATEGORIES[category].color);
      });
    });
  });

  describe('Node Structure Validation', () => {
    test('all nodes should have required fields', async () => {
      const trees = await skillTreeService.getSkillTrees();

      trees.forEach((tree) => {
        tree.nodes.forEach((node) => {
          assert.ok(node.id, `Node missing id in ${tree.category}`);
          assert.ok(node.name, `Node ${node.id} missing name`);
          assert.ok(node.description, `Node ${node.id} missing description`);
          assert.ok([1, 2, 3].includes(node.level), `Node ${node.id} has invalid level`);
          assert.ok(Array.isArray(node.prerequisites), `Node ${node.id} prerequisites not array`);
          assert.ok(node.icon, `Node ${node.id} missing icon`);
          assert.ok(node.position, `Node ${node.id} missing position`);
          assert.ok(typeof node.position.x === 'number', `Node ${node.id} position.x not number`);
          assert.ok(typeof node.position.y === 'number', `Node ${node.id} position.y not number`);
          assert.ok(typeof node.xpRequired === 'number', `Node ${node.id} xpRequired not number`);
        });
      });
    });

    test('all prerequisite references should be valid', async () => {
      const trees = await skillTreeService.getSkillTrees();

      trees.forEach((tree) => {
        const nodeIds = new Set(tree.nodes.map((n) => n.id));

        tree.nodes.forEach((node) => {
          node.prerequisites.forEach((prereqId) => {
            assert.ok(
              nodeIds.has(prereqId),
              `Node ${node.id} has invalid prerequisite: ${prereqId}`
            );
          });
        });
      });
    });

    test('level 1 nodes should have no prerequisites', async () => {
      const trees = await skillTreeService.getSkillTrees();

      trees.forEach((tree) => {
        const level1Nodes = tree.nodes.filter((n) => n.level === 1);

        level1Nodes.forEach((node) => {
          // At least one level 1 node should have no prerequisites (entry point)
          const hasEntryNode = level1Nodes.some((n) => n.prerequisites.length === 0);
          assert.ok(
            hasEntryNode,
            `Tree ${tree.category} has no entry point (level 1 node with no prerequisites)`
          );
        });
      });
    });
  });
});
