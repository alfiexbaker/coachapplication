import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('session detail modal API boundaries', () => {
  it('does not derive display names from the local user directory', () => {
    const source = readProjectFile('hooks/use-session-detail-modal.ts');

    assert.doesNotMatch(source, /STORAGE_KEYS\.USERS/);
    assert.doesNotMatch(source, /apiClient\.get<User\[\]>/);
    assert.match(source, /staffingResult\.data\.staff[\s\S]*member\.canTakeAssignments/);
    assert.match(source, /offering\.registrations/);
  });

  it('does not fall back to registration cancellation when live booking lookup fails', () => {
    const source = readProjectFile('hooks/use-session-detail-modal.ts');
    const lookupStart = source.indexOf('const bookings = await bookingService.list();');
    const alertStart = source.indexOf('uiFeedback.alert(', lookupStart);

    assert.ok(lookupStart >= 0, 'test should find booking lookup before cancellation');
    assert.ok(alertStart > lookupStart, 'test should find registration cancellation prompt');

    const cancellationLookupBlock = source.slice(lookupStart, alertStart);

    assert.match(source, /import \{ api \} from '@\/constants\/config';/);
    assert.match(
      cancellationLookupBlock,
      /if \(!USE_MOCK\) \{\s*uiFeedback\.showToast\(\s*'Could not verify the booking before cancellation\. Please try again\.',\s*'error',\s*\);\s*return;\s*\}/,
    );
    assert.doesNotMatch(
      cancellationLookupBlock,
      /using registration fallback/,
      'API booking lookup failures must not silently drop into registration cancellation',
    );
  });

  it('does not fabricate ownership audit events in API mode', () => {
    const hookSource = readProjectFile('hooks/use-session-detail-modal.ts');
    const componentSource = readProjectFile('components/sessions/session-ownership-section.tsx');
    const serviceSource = readProjectFile('services/org-staffing-service.ts');
    const fallbackStart = hookSource.indexOf('const fallback: SessionOwnershipTimelineEntry[]');

    assert.ok(fallbackStart >= 0, 'test should find the mock ownership timeline fallback');
    assert.match(
      hookSource,
      /orgStaffingService\.getOwnershipHistory\(\s*offering\.clubId as string,\s*assignmentId,\s*\)/,
    );
    assert.match(
      hookSource,
      /USE_MOCK \? \(offering\?\.ownershipAuditTrail \?\? \[\]\) : ownershipAuditTrail/,
    );
    assert.match(
      serviceSource,
      /\/v1\/clubs\/\$\{encodeURIComponent\(clubId\)\}\/work-assignments\/\$\{encodeURIComponent\([\s\S]*assignmentId[\s\S]*\)\}\/history/,
    );
    assert.match(
      hookSource.slice(Math.max(0, fallbackStart - 120), fallbackStart),
      /if \(!USE_MOCK\) return \[\];/,
    );
    assert.match(componentSource, /timeline\.length > 0 \?/);
  });
});
