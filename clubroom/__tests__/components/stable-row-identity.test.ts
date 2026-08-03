import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('interactive and domain-backed rows use stable identities', () => {
  const coachAbout = readProjectFile('components/coach/coach-detail-about.tsx');
  const coachSays = readProjectFile('components/progress/coach-says-card.tsx');
  const parentSummary = readProjectFile('components/progress/parent-value-summary.tsx');
  const emergency = readProjectFile('components/safety/emergency-quick-card-sections.tsx');
  const schedule = readProjectFile('components/schedule/schedule-day-detail.tsx');
  const inviteErrors = readProjectFile('components/squad/invite-result-feedback-sections.tsx');
  const appAlert = readProjectFile('components/ui/app-alert.tsx');

  assert.match(
    coachAbout,
    /key=\{`\$\{experience\.title\}:\$\{experience\.organization\}:\$\{experience\.startDate\}:/,
  );
  assert.match(
    coachAbout,
    /key=\{`\$\{certification\.name\}:\$\{certification\.issuer\}:\$\{certification\.issueDate\}:/,
  );
  assert.match(coachAbout, /key=\{badge\}/);
  assert.match(coachSays, /key=\{badge\}/);
  assert.match(parentSummary, /key=\{quote\}/);
  assert.match(emergency, /key=\{`\$\{item\.type\}:\$\{item\.label\}`\}/);
  assert.match(schedule, /key=\{session\.id\}/);
  assert.match(
    inviteErrors,
    /key=\{`\$\{error\.memberId\}:\$\{error\.code \?\? 'unknown'\}:\$\{error\.error\}`\}/,
  );
  assert.match(
    appAlert,
    /key=\{`\$\{button\.style \?\? 'default'\}:\$\{button\.text \?\? 'OK'\}`\}/,
  );
});
