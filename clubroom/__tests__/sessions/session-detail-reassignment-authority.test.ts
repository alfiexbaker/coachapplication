import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('session detail reassignment gates use backend staffing authority', () => {
  const source = readSource('hooks/use-session-detail-modal.ts');
  const canReassignBlock = source.match(
    /const canReassignOwnership = Boolean\(([\s\S]*?)\);\n  const contextChildrenSignature/,
  );

  assert.ok(canReassignBlock, 'expected canReassignOwnership block');
  assert.match(
    source,
    /orgStaffingService\.getConsoleData\(\s*offering\.clubId as string,\s*currentUser\.id,\s*\)/,
    'session detail ownership context should load from the audited staffing console',
  );
  assert.match(
    source,
    /setCanManageClubOwnership\(staffingResult\.data\.canManageAssignments\)/,
    'session detail reassignment authority should use backend canManageAssignments',
  );
  assert.match(
    source,
    /staffingResult\.data\.staff[\s\S]*member\.canTakeAssignments/,
    'assignee options should come from backend-projected assignable staff',
  );
  assert.doesNotMatch(
    source,
    /academyService\.(getUserAcademies|getStaff)/,
    'session detail reassignment must not derive authority from legacy academy service reads',
  );
  assert.doesNotMatch(
    canReassignBlock[1] ?? '',
    /createdByUserId/,
    'creating a club session is not enough to reassign club delivery ownership',
  );
});
