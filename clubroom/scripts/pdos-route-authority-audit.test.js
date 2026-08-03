const assert = require('node:assert/strict');
const { test } = require('node:test');

const { extractRuntimeServiceImports, filterRiskFlags } = require('./pdos-route-authority-audit');

test('PDOS service import scanning ignores type-only imports', () => {
  assert.deepEqual(
    extractRuntimeServiceImports(`
      import type { ChildProfile } from '@/services/child-service';
      import { type ChildMembership } from '../../services/family-service';
    `),
    [],
  );
});

test('PDOS service import scanning keeps runtime imports', () => {
  assert.deepEqual(
    extractRuntimeServiceImports(`
      import { childService, type ChildProfile } from '@/services/child-service';
      import authService from '../services/auth-service';
    `),
    ['child-service', 'auth-service'],
  );
});

test('PDOS sensitive-read checks ignore auth-only route plumbing', () => {
  assert.deepEqual(
    filterRiskFlags(['sensitive-read-audit-check'], 'Medical details', {
      serviceImports: ['api-client', 'auth-service'],
    }),
    [],
  );
});

test('PDOS sensitive-read checks retain sensitive service calls', () => {
  assert.deepEqual(
    filterRiskFlags(['sensitive-read-audit-check'], 'Medical details', {
      serviceImports: ['child-service'],
    }),
    ['sensitive-read-audit-check'],
  );
});
