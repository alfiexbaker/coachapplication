import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('event creation and publish actions preserve staff authority and delivery truth', () => {
  const createHook = readSource('hooks/use-create-event.ts');
  const audienceStep = readSource('components/event/create-event-audience-step.tsx');
  const eventDetailHook = readSource('hooks/use-event-detail.ts');
  const eventDetailScreen = readSource('app/events/[id].tsx');
  const eventRoutes = readSource('apps/api/src/modules/booking/routes.ts');

  assert.ok(createHook.includes("import { isClubStaffRole } from '@/contracts/club-governance';"));
  assert.ok(createHook.includes('function isActiveEventStaffMembership('));
  assert.ok(createHook.includes("membership.status === 'active'"));
  assert.ok(createHook.includes('isClubStaffRole(membership.role)'));
  assert.ok(
    createHook.includes(
      'club.id === requestedClubId && staffClubIds.has(club.id)',
    ),
  );
  assert.equal(createHook.includes('requestedClubName'), false);
  assert.equal(createHook.includes('Complete your account name before creating an event.'), false);
  assert.ok(createHook.includes('const publishResult = await eventService.publishEvent(event.id);'));
  assert.ok(createHook.includes('if (!publishResult.success) {'));
  assert.ok(createHook.includes('Draft saved. ${publishResult.error.message'));
  assert.ok(createHook.includes('Event published. Invitations were not sent. Open the event to send them again.'));

  assert.equal(audienceStep.includes("key: 'COACHES'"), false);
  assert.equal(audienceStep.includes('Coaches Only'), false);

  assert.ok(eventDetailHook.includes('const sendEventInvites = async'));
  assert.ok(eventDetailHook.includes("eventToInvite.targetAudience === 'SQUAD'"));
  assert.ok(eventDetailHook.includes("eventToInvite.targetAudience === 'ATHLETES'"));
  assert.ok(eventDetailHook.includes('This legacy audience cannot be invited safely.'));
  assert.ok(eventDetailHook.includes('handleSendInvites'));
  assert.equal(eventDetailHook.includes('isCreator'), false);
  assert.ok(eventDetailScreen.includes('label="Send invitations"'));
  assert.ok(eventDetailScreen.includes("isOrganizer && event.status === 'DRAFT'"));

  assert.ok(
    eventRoutes.includes(
      "const clubEventWritableTargetAudienceSchema = z.enum(['ALL', 'ATHLETES', 'SQUAD']);",
    ),
  );
  assert.ok(eventRoutes.includes('targetAudience: clubEventWritableTargetAudienceSchema.optional()'));
});
