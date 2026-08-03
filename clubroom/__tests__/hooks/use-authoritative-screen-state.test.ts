import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { resolveAuthoritativeScreenState } from '../../hooks/use-authoritative-screen-state';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('authoritative screens stay blocked until live authority recovers', () => {
  assert.deepEqual(
    resolveAuthoritativeScreenState({
      status: 'success',
      isPending: false,
      hasRequestedTruthfulFrame: true,
      hasSilentError: false,
    }),
    { blocked: false, status: 'success' },
  );
  assert.deepEqual(
    resolveAuthoritativeScreenState({
      status: 'success',
      isPending: false,
      hasRequestedTruthfulFrame: true,
      hasSilentError: true,
    }),
    { blocked: true, status: 'error' },
  );
  assert.deepEqual(
    resolveAuthoritativeScreenState({
      status: 'success',
      isPending: true,
      hasRequestedTruthfulFrame: true,
      hasSilentError: false,
    }),
    { blocked: true, status: 'loading' },
  );
  assert.deepEqual(
    resolveAuthoritativeScreenState({
      status: 'success',
      isPending: false,
      hasRequestedTruthfulFrame: true,
      hasSilentError: false,
    }),
    { blocked: false, status: 'success' },
  );
});

test('authoritative screens block unresolved query identities and cold errors', () => {
  assert.deepEqual(
    resolveAuthoritativeScreenState({
      status: 'success',
      isPending: false,
      hasRequestedTruthfulFrame: false,
      hasSilentError: false,
    }),
    { blocked: true, status: 'loading' },
  );
  assert.deepEqual(
    resolveAuthoritativeScreenState({
      status: 'error',
      isPending: false,
      hasRequestedTruthfulFrame: false,
      hasSilentError: false,
    }),
    { blocked: true, status: 'error' },
  );
});

test('coach discovery screens use query-keyed live frames without global snapshots', () => {
  for (const relativePath of ['app/book-coach.tsx', 'app/discover/map.tsx']) {
    const source = readSource(relativePath);
    assert.equal(source.includes('lastFindCoachSnapshot'), false);
    assert.equal(source.includes('lastMapSnapshot'), false);
    assert.ok(source.includes('const queryKey = JSON.stringify(filters)'));
    assert.ok(source.includes('dataKey: queryKey'));
    assert.ok(source.includes('resolveAuthoritativeScreenState({'));
    assert.ok(source.includes('const resolvedData = searchBlocked ? null : data'));
  }

  const mapSource = readSource('app/discover/map.tsx');
  assert.ok(mapSource.includes('location: next.location ?? prev.location ?? DEFAULT_LOCATION'));
  assert.ok(
    mapSource.includes('const hasActiveFilters = discoverService.hasActiveFilters(filters)'),
  );
  assert.ok(
    mapSource.includes('onPressAction={hasActiveFilters ? handleClearFilters : onRefresh}'),
  );

  const useScreenSource = readSource('hooks/use-screen.ts');
  assert.ok(useScreenSource.includes('createLatestScreenRequestCoordinator'));
  assert.ok(
    useScreenSource.includes(
      "requestCoordinator.begin(mode === 'silent' ? 'background' : 'foreground')",
    ),
  );
  assert.ok(useScreenSource.includes('if (!request.isCurrent())'));
  assert.ok(useScreenSource.includes('if (isCurrentRequest())'));
});
