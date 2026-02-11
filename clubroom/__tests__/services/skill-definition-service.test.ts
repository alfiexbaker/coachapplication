import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { skillDefinitionService } from '@/services/skills/skill-definition-service';
import type { SkillTree } from '@/constants/types';

describe('skillDefinitionService', () => {
  it('returns all skill trees (happy path)', async () => {
    const result = await skillDefinitionService.getSkillTrees();
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.ok(result.data.length > 0);
    assert.ok(result.data[0].nodes.length > 0);
  });

  it('returns null for unknown category (empty path)', async () => {
    const result = await skillDefinitionService.getSkillTree('UNKNOWN' as never);
    assert.equal(result.success, true);
    if (!result.success) return;

    assert.equal(result.data, null);
  });

  it('finds node by id and validates tree structure', async () => {
    const trees = await skillDefinitionService.getSkillTrees();
    assert.equal(trees.success, true);
    if (!trees.success) return;

    const firstNodeId = trees.data[0].nodes[0].id;
    const found = skillDefinitionService.findNodeById(firstNodeId);
    assert.ok(found);
    assert.equal(found?.node.id, firstNodeId);

    const valid = skillDefinitionService.validateTreeStructure(trees.data[0]);
    assert.equal(valid, true);

    const invalidTree: SkillTree = {
      ...trees.data[0],
      nodes: [
        ...trees.data[0].nodes.slice(0, 1),
        {
          ...trees.data[0].nodes[1],
          prerequisites: ['node_that_does_not_exist'],
        },
      ],
    };
    assert.strictEqual(skillDefinitionService.validateTreeStructure(invalidTree), false);
  });
});
