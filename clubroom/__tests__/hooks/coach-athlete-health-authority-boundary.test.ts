import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('coach health preserves API denials as terminal route state', () => {
  const hook = fs.readFileSync(path.join(ROOT, 'hooks/use-coach-athlete-health.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(ROOT, 'app/roster/[athleteId]/health.tsx'), 'utf8');
  const injuryForm = fs.readFileSync(path.join(ROOT, 'components/health/InjuryForm.tsx'), 'utf8');
  const injuryService = fs.readFileSync(path.join(ROOT, 'services/injury-service.ts'), 'utf8');

  assert.ok(hook.includes('function toHealthLoadError(error: unknown): ServiceError'));
  assert.ok(hook.includes('serviceErrorCode?: unknown;'));
  assert.ok(hook.includes('return err(toHealthLoadError(error));'));
  assert.ok(screen.includes("h.error?.code === 'NOT_FOUND' || h.error?.code === 'UNAUTHORIZED'"));
  assert.ok(screen.includes('onRetry={terminalAccessError ? undefined : h.retry}'));
  assert.ok(injuryForm.includes('useState(false)'));
  assert.equal(injuryService.match(/sharedWithCoach: params\.sharedWithCoach \?\? false/g)?.length, 2);
});
