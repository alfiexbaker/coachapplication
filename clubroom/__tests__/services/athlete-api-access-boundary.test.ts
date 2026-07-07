import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function assertScopedAthleteRead(params: {
  file: string;
  helperName: string;
  routeFragment: string;
}): void {
  const source = readSource(params.file);
  const helperStart = source.indexOf(`async function ${params.helperName}`);
  const readStart = source.indexOf(params.routeFragment);

  assert.ok(helperStart >= 0, `${params.file} should define ${params.helperName}`);
  assert.ok(readStart >= 0, `${params.file} should call ${params.routeFragment}`);
  assert.ok(
    source.includes('toApiAthleteId(athleteId)'),
    `${params.file} should normalize athlete ids before API reads`,
  );
  assert.ok(
    source.includes('buildApiAuthHeaders({'),
    `${params.file} should build scoped API auth headers`,
  );
  assert.ok(
    source.includes('{ headers: access.headers }'),
    `${params.file} should pass scoped headers to apiFetch`,
  );
  assert.ok(
    helperStart < readStart,
    `${params.file} should resolve scoped access before the sensitive athlete read`,
  );
}

test('sensitive athlete read services pass scoped API auth headers', () => {
  assertScopedAthleteRead({
    file: 'services/media-service.ts',
    helperName: 'resolveMediaApiAccess',
    routeFragment: '/session-media`',
  });
  assertScopedAthleteRead({
    file: 'services/progress/progress-feedback-service.ts',
    helperName: 'resolveFeedbackApiAccess',
    routeFragment: '/session-feedback?',
  });
  assertScopedAthleteRead({
    file: 'services/progress/progress-position-service.ts',
    helperName: 'resolvePositionApiAccess',
    routeFragment: '/session-feedback?',
  });

  const positionSource = readSource('services/progress/progress-position-service.ts');
  assert.ok(
    positionSource.includes('viewerRole: access.viewerRole'),
    'position history should use the resolved viewer role instead of hard-coding coach',
  );
});
