import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components/coach/trial-session-editor.tsx'),
  'utf8',
);

test('trial pricing loads through an active coach-scoped request', () => {
  assert.match(source, /let active = true;/);
  assert.match(
    source,
    /const existing = await trialService\.getTrialOffering\(coachId\);\s*if \(!active\) return;/,
  );
  assert.match(source, /return \(\) => \{\s*active = false;/);
  assert.match(source, /\}, \[coachId, loadVersion\]\);/);
});

test('trial pricing load failures block editing and expose retry', () => {
  assert.match(source, /setLoadError\('Trial settings could not be loaded\.'\)/);
  assert.match(source, /if \(loadError\) \{/);
  assert.match(source, /title="Trial settings unavailable"/);
  assert.match(source, /onRetry=\{\(\) => setLoadVersion\(\(version\) => version \+ 1\)\}/);
});

test('a successful empty response resets every field to explicit defaults', () => {
  assert.match(source, /setEnabled\(existing\?\.enabled \?\? DEFAULT_TRIAL_FORM\.enabled\)/);
  assert.match(
    source,
    /setTrialPrice\(String\(existing\?\.trialPrice \?\? DEFAULT_TRIAL_FORM\.trialPrice\)\)/,
  );
  assert.match(
    source,
    /setDescription\(existing\?\.description \?\? DEFAULT_TRIAL_FORM\.description\)/,
  );
});
