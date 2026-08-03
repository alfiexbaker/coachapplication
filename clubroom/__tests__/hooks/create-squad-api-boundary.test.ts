import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('create squad resolves backend authority and fails closed before rendering controls', () => {
  const source = readSource('hooks/use-create-squad.ts');
  const screen = readSource('app/club/squad/create.tsx');

  assert.ok(source.includes('const { currentUser, isLoading: authLoading } = useAuth();'));
  assert.ok(source.includes('const result = await clubAuthorityService.listClubs();'));
  assert.ok(source.includes('canManageClubUi(membership)'));
  assert.ok(source.includes("status: 'denied'"));
  assert.ok(source.includes("status: 'empty'"));
  assert.ok(source.includes("status: 'error'"));
  assert.ok(screen.includes("composer.contextStatus === 'loading'"));
  assert.ok(screen.includes("composer.contextStatus === 'error'"));
  assert.ok(screen.includes("composer.contextStatus === 'denied'"));
  assert.ok(screen.includes("composer.contextStatus === 'empty'"));
  assert.ok(screen.includes("const isReady = composer.contextStatus === 'ready';"));
  assert.ok(
    screen.includes('{isReady ? ('),
    'create control must render only for authorized users',
  );
});

test('create squad sends only persisted fields and protects submission', () => {
  const source = readSource('hooks/use-create-squad.ts');
  const service = readSource('services/squad-service.ts');
  const createStart = source.indexOf('const newSquad = await squadService.createSquad({');
  const createEnd = source.indexOf('});', createStart);
  const createPayload = source.slice(createStart, createEnd);
  const serviceCreateStart = service.indexOf('async createSquad(input: {');
  const serviceCreateEnd = service.indexOf('async updateSquad(', serviceCreateStart);
  const serviceCreate = service.slice(serviceCreateStart, serviceCreateEnd);

  assert.ok(createStart >= 0 && createEnd > createStart);
  assert.ok(createPayload.includes('clubId: squadContext.club!.id'));
  assert.ok(createPayload.includes('ageGroup: selectedAgeGroup!'));
  assert.ok(createPayload.includes('skillLevel: selectedLevel!'));
  assert.doesNotMatch(createPayload, /description|meetingLocation|focusAreas/);
  assert.doesNotMatch(serviceCreate, /description|meetingLocation|focusAreas/);
  assert.ok(source.includes('submissionInFlight.current || !canCreate'));
  assert.ok(source.includes('submissionInFlight.current = true'));
  assert.ok(source.includes('submissionInFlight.current = false'));
  assert.ok(source.includes('setSubmitError('));
});

test('canonical squad creator is lean and accessible; dead modal is removed', () => {
  const screen = readSource('app/club/squad/create.tsx');
  const routes = readSource('navigation/routes.ts');
  const manifest = readSource('navigation/loading-route-manifest.js');

  assert.equal(fs.existsSync(path.join(ROOT, 'app/(modal)/create-squad.tsx')), false);
  assert.doesNotMatch(routes, /MODAL_CREATE_SQUAD/);
  assert.doesNotMatch(manifest, /app\/\(modal\)\/create-squad\.tsx/);
  assert.doesNotMatch(screen, /Meeting Location|Focus Areas|Preview|SKILL_TAGS/);
  assert.ok(screen.includes('accessibilityLabel="Squad name"'));
  assert.ok(screen.includes('accessibilityRole="radio"'));
  assert.ok(screen.includes('accessibilityState={{ checked: selected }}'));
  assert.ok(screen.includes('accessibilityRole="alert"'));
  assert.ok(screen.includes('busy: composer.isSubmitting'));
});

test('Fastify rejects and audits unsupported create-squad fields before persistence', () => {
  const source = readSource('apps/api/src/modules/coach-club/routes.ts');
  const schemaStart = source.indexOf('const clubSquadCreateBodySchema = z');
  const schemaEnd = source.indexOf('const clubSquadPatchBodySchema', schemaStart);
  const routeStart = source.indexOf('app.post("/clubs/:clubId/squads"');
  const routeEnd = source.indexOf('app.get("/squads/:squadId"', routeStart);
  const schema = source.slice(schemaStart, schemaEnd);
  const route = source.slice(routeStart, routeEnd);

  assert.ok(schema.includes('.strict()'));
  assert.ok(route.indexOf('try {') < route.indexOf('clubSquadCreateBodySchema.parse'));
  assert.ok(route.includes('result: mutationAuditResult(error)'));
  assert.ok(route.includes('errorCode: mutationAuditErrorCode(error)'));
});
