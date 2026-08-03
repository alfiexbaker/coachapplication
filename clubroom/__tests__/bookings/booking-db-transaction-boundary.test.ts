import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('db booking create uses an explicit Prisma transaction budget', () => {
  const prismaRuntime = readSource('apps/api/src/lib/prisma-runtime.ts');
  const source = readSource('apps/api/src/repositories/p0/booking-repository.ts');
  const constantStart = prismaRuntime.indexOf('export const API_DB_TRANSACTION_OPTIONS = {');
  const classStart = source.indexOf('class DbBookingRepository');
  const createStart = source.indexOf('async createBooking(params: CreateBookingParams)', classStart);
  const updateStart = source.indexOf('async updateBooking(params: UpdateBookingParams)', createStart);

  assert.ok(constantStart >= 0, 'API runtime should define DB transaction options');
  assert.ok(classStart >= 0, 'test should find DB booking repository class');
  assert.ok(createStart > classStart, 'test should find createBooking in the DB class');
  assert.ok(updateStart > createStart, 'test should find createBooking boundary');

  const createBooking = source.slice(createStart, updateStart);

  assert.ok(
    prismaRuntime.includes('timeout: 30_000'),
    'staging Supabase pooler latency needs more than Prisma interactive transaction defaults',
  );
  assert.ok(
    createBooking.includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'createBooking must pass explicit transaction options to the Prisma transaction',
  );
  assert.ok(
    source.includes('const response = await prisma.$transaction(async (tx) => {') &&
      source.includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'booking lifecycle writes should use the widened transaction budget',
  );
  assert.ok(
    createBooking.indexOf('await tx.idempotencyKey.create') <
      createBooking.indexOf('}, API_DB_TRANSACTION_OPTIONS);'),
    'idempotency proof should stay inside the same widened booking transaction',
  );
  const lockIndex = createBooking.indexOf('pg_advisory_xact_lock');
  const lockedReplayIndex = createBooking.indexOf('const lockedReplay = await tx.idempotencyKey.findUnique');
  const availabilityIndex = createBooking.indexOf(
    'await resolveCoachAvailabilityTables(body.coachUserId, tx)',
  );
  const bookingInsertIndex = createBooking.indexOf('await tx.booking.create');
  assert.ok(lockIndex >= 0, 'booking create must acquire a transaction-scoped coach lock');
  assert.ok(
    lockIndex < lockedReplayIndex && lockedReplayIndex < availabilityIndex,
    'same-key replay must be resolved after the lock and before capacity validation',
  );
  assert.ok(
    availabilityIndex < bookingInsertIndex,
    'live coach availability must be revalidated inside the transaction before insert',
  );
  assert.ok(
    createBooking.includes('conflictOnUnavailable: true'),
    'a capacity race loser must receive a deterministic conflict response',
  );
});

test('staging-smoke money and progress writes avoid Prisma transaction defaults', () => {
  const coachClubRoutes = readSource('apps/api/src/modules/coach-club/routes.ts');
  const wave2Routes = readSource('apps/api/src/modules/wave2plus/routes.ts');
  const removeStart = coachClubRoutes.indexOf('async function removePayoutMethod(');
  const removeEnd = coachClubRoutes.indexOf('async function listWithdrawals(', removeStart);
  const feedbackStart = wave2Routes.indexOf('async function upsertSessionFeedback(');
  const feedbackEnd = wave2Routes.indexOf('function mutableSessionMediaAssetRows', feedbackStart);

  assert.ok(removeStart >= 0 && removeEnd > removeStart, 'test should find payout removal');
  assert.ok(feedbackStart >= 0 && feedbackEnd > feedbackStart, 'test should find feedback upsert');
  assert.ok(
    coachClubRoutes.includes('API_DB_TRANSACTION_OPTIONS'),
    'coach money mutations should import the shared Supabase-tolerant transaction budget',
  );
  assert.ok(
    coachClubRoutes
      .slice(removeStart, removeEnd)
      .includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'payout method removal must pass explicit transaction options',
  );
  assert.ok(
    wave2Routes.includes('API_DB_TRANSACTION_OPTIONS'),
    'progress homework sync should import the shared Supabase-tolerant transaction budget',
  );
  assert.ok(
    wave2Routes.slice(feedbackStart, feedbackEnd).includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'session-feedback upsert must pass explicit transaction options',
  );
});

test('staging-smoke group-session write fanouts avoid Prisma transaction defaults', () => {
  const source = readSource('apps/api/src/repositories/p0/group-session-repository.ts');
  const classStart = source.indexOf('class PrismaGroupSessionRepository');
  const cancelStart = source.indexOf('async cancelSession(params: GroupSessionAccessParams)', classStart);
  const registerStart = source.indexOf('async registerAthlete(params: GroupSessionRegisterParams)', classStart);
  const rosterStart = source.indexOf('async listSessionRoster(', registerStart);
  const registerCancelStart = source.indexOf('async cancelRegistration(', classStart);
  const attendanceStart = source.indexOf('async markAttendance(', classStart);

  assert.ok(classStart >= 0, 'test should find DB group-session repository class');
  assert.ok(registerStart >= 0 && rosterStart > registerStart, 'test should find registerAthlete');
  assert.ok(cancelStart >= 0, 'test should find cancelSession');
  assert.ok(registerCancelStart >= 0, 'test should find cancelRegistration');
  assert.ok(attendanceStart >= 0, 'test should find markAttendance');
  assert.ok(
    source.includes('API_DB_TRANSACTION_OPTIONS'),
    'group-session mutations should import the shared Supabase-tolerant transaction budget',
  );
  assert.ok(
    source.slice(cancelStart, registerStart).includes('}, API_DB_TRANSACTION_OPTIONS),'),
    'group-session cancel fanout must pass explicit transaction options',
  );
  assert.ok(
    source.slice(registerStart, rosterStart).includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'group-session registration fanout must pass explicit transaction options',
  );
  assert.ok(
    source
      .slice(registerCancelStart, attendanceStart)
      .includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'group-session registration cancellation fanout must pass explicit transaction options',
  );
  assert.ok(
    source.slice(attendanceStart).includes("...API_DB_TRANSACTION_OPTIONS") &&
      source.slice(attendanceStart).includes("isolationLevel: 'Serializable'"),
    'group-session attendance mutation must pass explicit serializable transaction options',
  );
});

test('staging-smoke community message fanouts avoid Prisma transaction defaults', () => {
  const source = readSource('apps/api/src/repositories/p0/community-media-repository.ts');
  const classStart = source.indexOf('class PrismaCommunityMediaRepository');
  const groupMessageStart = source.indexOf('async createGroupMessage(', classStart);
  const threadMessageStart = source.indexOf('async createThreadMessage(', classStart);
  const deleteMessageStart = source.indexOf('async deleteMessage(', threadMessageStart);

  assert.ok(classStart >= 0, 'test should find DB community media repository class');
  assert.ok(groupMessageStart >= 0, 'test should find createGroupMessage');
  assert.ok(threadMessageStart >= 0 && deleteMessageStart > threadMessageStart, 'test should find createThreadMessage');
  assert.ok(
    source.includes('API_DB_TRANSACTION_OPTIONS'),
    'community message mutations should import the shared Supabase-tolerant transaction budget',
  );
  assert.ok(
    source.slice(groupMessageStart, threadMessageStart).includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'group message create must pass explicit transaction options',
  );
  assert.ok(
    source.slice(threadMessageStart, deleteMessageStart).includes('}, API_DB_TRANSACTION_OPTIONS);'),
    'thread message create must pass explicit transaction options',
  );
});
