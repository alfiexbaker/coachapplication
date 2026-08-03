import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('coach observation read failures surface for authorised managers', () => {
  const hook = readProjectFile('hooks/use-coach-observations.ts');
  const observations = readProjectFile('components/development/special-needs-observations.tsx');
  const screen = readProjectFile('app/development/athlete/[athleteId]/special-needs.tsx');

  assert.ok(
    hook.includes('const [error, setError] = useState<string | null>(null);'),
    'hook should retain read error state',
  );
  assert.ok(
    hook.includes("setError(result.error.message || 'Failed to load coach observations.');"),
    'service Result errors should be visible to the UI',
  );
  assert.ok(
    hook.includes('setObservations([]);'),
    'failed reads should clear stale observations rather than presenting cached truth',
  );
  assert.ok(
    hook.includes(
      'retry: () => loadCoachObservations(athleteId, setObservations, setLoading, setError),',
    ),
    'hook should expose a retry path for the live read',
  );

  const loadingBranch = observations.indexOf('loading ? (');
  const errorBranch = observations.indexOf(') : error ? (');
  const emptyBranch = observations.indexOf(') : observations.length === 0 ? (');
  assert.ok(loadingBranch >= 0, 'component should render loading state before empty state');
  assert.ok(errorBranch > loadingBranch, 'component should render errors before empty state');
  assert.ok(emptyBranch > errorBranch, 'empty observations should only render after clean reads');
  assert.ok(observations.includes('accessibilityLabel="Retry loading observations"'));

  assert.ok(screen.includes('error={obsHook.error}'));
  assert.ok(screen.includes('onRetry={obsHook.retry}'));
  assert.ok(screen.includes("currentUser?.role === 'COACH'"));
  assert.ok(screen.includes("currentUser?.role === 'ADMIN'"));
  assert.ok(screen.includes('canManageCoachObservations && athleteId'));

  const sectionStart = screen.indexOf('function CoachObservationsSection');
  const screenStart = screen.indexOf('export default function SpecialNeedsScreen');
  assert.ok(sectionStart >= 0 && sectionStart < screenStart);
  assert.ok(
    screen.slice(sectionStart, screenStart).includes('useCoachObservations(athleteId)'),
    'the coach-only child component should own the observation request',
  );
  assert.equal(
    screen.slice(screenStart).includes('useCoachObservations('),
    false,
    'parent and athlete renders must not instantiate the observation hook',
  );
  assert.equal(screen.includes('No Special Needs'), false);
  assert.equal(observations.includes('Add first observation'), false);
  assert.equal(
    observations.match(/accessibilityLabel="Add observation"/g)?.length ?? 0,
    1,
    'the authorised empty state should expose one add action',
  );
});

test('needs and notes presentation uses the complete recorded profile', () => {
  const hook = readProjectFile('hooks/use-special-needs.ts');
  const hero = readProjectFile('components/development/special-needs-hero.tsx');
  const card = readProjectFile('components/development/dev-special-needs-card.tsx');
  const notes = readProjectFile('components/development/special-needs-notes-section.tsx');

  assert.ok(hero.includes('<Avatar uri={avatar} name={name} size="md" />'));
  assert.equal(hero.includes('{avatar ||'), false);
  assert.ok(hero.includes("totalCount > 0 ? summary : 'Nothing recorded'"));
  assert.equal(card.includes('styles.counter'), false);

  for (const field of [
    'disabilities',
    'specialNeeds',
    'allergies',
    'medicalConditions',
    'medications',
    'communicationNotes',
    'behavioralNotes',
  ]) {
    assert.ok(hook.includes(`childProfile?.${field}`), `hook should count ${field}`);
    assert.ok(card.includes(`childProfile?.${field}`), `card should count ${field}`);
  }

  assert.ok(notes.includes('childProfile.medicalConditions.length > 0'));
  assert.ok(notes.includes('childProfile.medicalConditions.map((condition)'));
});

test('coach observation API failure logs do not include raw note text', () => {
  const source = readProjectFile('services/coach-observation-service.ts');

  assert.doesNotMatch(
    source,
    /logger\.error\('create_observation_api_failed',\s*\{\s*input,/,
    'create failure logs must not include the full observation input',
  );
  assert.doesNotMatch(
    source,
    /logger\.error\('update_observation_api_failed',[\s\S]*\bupdates,/,
    'update failure logs must not include raw update payloads',
  );
  assert.match(
    source,
    /textLength: input\.text\.trim\(\)\.length/,
    'create failure logs should keep only text length for diagnostics',
  );
  assert.match(
    source,
    /textLength: updates\.text\?\.trim\(\)\.length/,
    'update failure logs should keep only text length for diagnostics',
  );
});

test('coach observations never carry an account frame or a sharing promise across the trust boundary', () => {
  const screen = readProjectFile('app/development/athlete/[athleteId]/special-needs.tsx');
  const observations = readProjectFile('components/development/special-needs-observations.tsx');
  const modal = readProjectFile('components/development/coach-observation-modal.tsx');
  const hook = readProjectFile('hooks/use-coach-observations.ts');

  assert.match(screen, /key=\{currentUser\?\.id \?\? 'unknown'\}/);
  assert.match(screen, /currentUserId=\{currentUser\?\.id \?\? ''\}/);
  assert.match(observations, /canManage=\{obs\.coachId === currentUserId\}/);
  assert.match(observations, /\{canManage \? \(/);
  assert.equal(modal.includes('Only visible to you'), false);
  assert.equal(modal.includes('<Switch'), false);
  assert.match(hook, /isPrivate: true,/);
});
