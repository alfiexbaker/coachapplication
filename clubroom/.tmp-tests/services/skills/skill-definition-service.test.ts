import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { skillDefinitionService } from '@/services/skills/skill-definition-service';

describe('SkillDefinitionService', () => {
  describe('getAllTrees', () => {
    it('should return all skill trees', () => {
      const trees = skillDefinitionService.getAllTrees();

      // Should return array of skill trees
      assert.ok(Array.isArray(trees));
    });
  });

  describe('getTreeById', () => {
    it('should return null for non-existent tree', () => {
      const tree = skillDefinitionService.getTreeById('nonexistent-tree');

      assert.equal(tree, null);
    });
  });

  describe('getTreesByCategory', () => {
    it('should return trees for category', () => {
      const trees = skillDefinitionService.getTreesByCategory('Technical');

      // Should return array (may be empty)
      assert.ok(Array.isArray(trees));
    });
  });

  describe('findNodeById', () => {
    it('should return null for non-existent node', () => {
      const result = skillDefinitionService.findNodeById('nonexistent-node');

      assert.equal(result, null);
    });
  });

  describe('getChildNodes', () => {
    it('should return child nodes for a node', () => {
      const children = skillDefinitionService.getChildNodes('some-node-id');

      // Should return array (may be empty for non-existent or leaf nodes)
      assert.ok(Array.isArray(children));
    });
  });

  describe('getRootNodes', () => {
    it('should return root nodes for a tree', () => {
      const roots = skillDefinitionService.getRootNodes('some-tree-id');

      // Should return array (may be empty for non-existent tree)
      assert.ok(Array.isArray(roots));
    });
  });
});
