import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('invite inbox waits for response authority before confirmation or refresh', () => {
  const source = fs.readFileSync(path.join(ROOT, 'hooks/use-invites.ts'), 'utf8');
  const inbox = fs.readFileSync(path.join(ROOT, 'app/invites.tsx'), 'utf8');
  const card = fs.readFileSync(path.join(ROOT, 'components/invite/invite-card.tsx'), 'utf8');
  const acceptResult = source.indexOf('const result = await sessionInviteService.respondToInvite({');
  const acceptFailure = source.indexOf('if (!result.success)', acceptResult);
  const confirmation = source.indexOf("uiFeedback.showToast('Booking confirmed.', 'success');", acceptResult);
  const declineResult = source.indexOf('const result = await sessionInviteService.respondToInvite({', acceptResult + 1);
  const declineFailure = source.indexOf('if (!result.success)', declineResult);
  const declineRefresh = source.indexOf('onRefresh();', declineResult);

  assert.ok(acceptResult >= 0, 'accept must call the session-invite authority');
  assert.ok(acceptFailure > acceptResult, 'accept must inspect the authority Result');
  assert.ok(confirmation > acceptFailure, 'confirmation must wait for an accepted Result');
  assert.ok(declineResult >= 0, 'decline must call the session-invite authority');
  assert.ok(declineFailure > declineResult, 'decline must inspect the authority Result');
  assert.ok(declineRefresh > declineFailure, 'decline refresh must wait for authority success');
  assert.ok(source.includes("uiFeedback.showToast(result.error?.message ?? 'Could not decline invite.', 'error');"));
  assert.equal(source.includes('inviteRsvpService'), false, 'recipient inbox must not submit social RSVPs');
  assert.equal(inbox.includes("key: 'maybe'"), false, 'recipient inbox must not expose a dead RSVP tab');
  assert.equal(card.includes('RsvpButtonGroup'), false, 'recipient cards must offer only accept or decline');
});
