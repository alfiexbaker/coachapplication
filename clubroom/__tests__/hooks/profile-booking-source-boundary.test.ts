import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('coach profile booking entries use public offerings and coach profile source', () => {
  const sources = [
    readProjectFile('hooks/use-coach-detail.ts'),
    readProjectFile('hooks/use-public-profile.ts'),
  ];

  for (const source of sources) {
    assert.ok(source.includes('listPublicCoachOfferingsFromApi(coachId'));
    assert.ok(source.includes('apiClient.isMockMode'));
    assert.ok(source.includes("source: 'coach_profile'"));
    assert.equal(source.includes('event_profile'), false);
    assert.equal(source.includes("offering.source === 'event'"), false);
  }
});
