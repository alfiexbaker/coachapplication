import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('invite session flow surfaces API session load failures instead of starting a new flow', () => {
  const hookSource = readSource('hooks/use-invite-session-flow.ts');
  const catchStart = hookSource.indexOf("logger.error('Failed to load upcoming sessions', error);");
  const choiceStart = hookSource.indexOf('const handleChoiceSelect', catchStart);
  const errorGuardStart = hookSource.indexOf('if (sessionLoadError && !api.useMock)', choiceStart);
  const emptyFallbackStart = hookSource.indexOf('if (upcomingSessions.length === 0)', choiceStart);

  assert.ok(catchStart >= 0, 'test should find upcoming session load failure branch');
  assert.ok(choiceStart > catchStart, 'test should find choice handler after load branch');
  assert.ok(errorGuardStart > choiceStart, 'test should find load-error guard');
  assert.ok(emptyFallbackStart > choiceStart, 'test should find empty-session fallback branch');

  const loadFailureBlock = hookSource.slice(catchStart, choiceStart);
  const loadingGuardBlock = hookSource.slice(choiceStart, errorGuardStart);
  const choiceGuardBlock = hookSource.slice(errorGuardStart, emptyFallbackStart);

  assert.ok(
    loadFailureBlock.includes('if (!api.useMock) {') &&
      loadFailureBlock.includes('setUpcomingSessions([]);') &&
      /setSessionLoadError\(\s*'Failed to load existing sessions\. Please retry before adding athletes\.',\s*\);/.test(
        loadFailureBlock,
      ),
    'API mode must retain an explicit existing-session load error',
  );
  assert.match(
    choiceGuardBlock,
    /if \(sessionLoadError && !api\.useMock\) \{[\s\S]*uiFeedback\.showToast\(sessionLoadError, 'error'\);[\s\S]*setStep\('select-session'\);[\s\S]*return;/,
    'API load failures must stop before the empty-session create-new fallback',
  );
  assert.match(
    loadingGuardBlock,
    /if \(sessionLoading && !api\.useMock\) \{[\s\S]*setStep\('select-session'\);[\s\S]*return;/,
    'API in-flight reads must stop before the empty-session create-new fallback',
  );
  assert.ok(
    hookSource.includes('sessionLoading,') &&
      hookSource.includes('sessionLoadError,') &&
      hookSource.includes(
        'retryLoadUpcomingSessions: () => setSessionReloadKey((value) => value + 1),',
      ),
    'hook should expose the load error and retry action to the modal',
  );

  const flowSource = readSource('components/coach/invite-session-flow.tsx');
  assert.ok(flowSource.includes('loading={flow.sessionLoading}'));
  assert.ok(flowSource.includes('loadError={flow.sessionLoadError}'));
  assert.ok(flowSource.includes('onRetry={flow.retryLoadUpcomingSessions}'));

  const listSource = readSource('components/coach/invite-session-list-step.tsx');
  const loadingRenderStart = listSource.indexOf('{loading ? (');
  const errorRenderStart = listSource.indexOf(': loadError ? (', loadingRenderStart);
  const emptyRenderStart = listSource.indexOf(': sessions.length === 0', errorRenderStart);

  assert.ok(loadingRenderStart >= 0, 'test should find the loading render branch');
  assert.ok(errorRenderStart >= 0, 'test should find the load-error render branch');
  assert.ok(
    emptyRenderStart > errorRenderStart,
    'test should find empty render after error branch',
  );

  const errorRenderBlock = listSource.slice(errorRenderStart, emptyRenderStart);
  assert.ok(errorRenderBlock.includes('Retry'));
  assert.doesNotMatch(
    errorRenderBlock,
    /Create New Session/,
    'error state should not render the empty-session create-new action',
  );
});

test('invite list card keeps its open and inline actions as sibling controls', () => {
  const source = readSource('components/invite/invite-list-card.tsx');

  assert.ok(
    source.includes('<SurfaceCard style={st.card}>') &&
      !source.includes('<SurfaceCard style={st.card} onPress={onPress}>'),
    'the card container must not wrap inline actions in a pressable',
  );
  assert.ok(
    source.includes('accessibilityLabel="View invite details"') &&
      source.includes('name="chevron-forward"'),
    'the header should retain an explicit and visible details action',
  );
});
