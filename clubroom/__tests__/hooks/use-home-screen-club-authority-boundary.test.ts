import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('home screen fails closed when API-mode club authority is unavailable', () => {
  const source = readProjectFile('hooks/use-home-screen.ts');
  const clubReadStart = source.indexOf('const authorityClubs = await clubAuthorityService.listClubs();');
  const primaryClubStart = source.indexOf('const primaryClub = userClubs[0];', clubReadStart);

  assert.ok(clubReadStart >= 0, 'expected home screen to read club authority');
  assert.ok(primaryClubStart > clubReadStart, 'expected primary club resolution after club read');

  const clubReadBlock = source.slice(clubReadStart, primaryClubStart);

  assert.ok(
    clubReadBlock.includes('return err(authorityClubs.error);'),
    'club authority failures should fail the home frame load',
  );
  assert.equal(
    clubReadBlock.includes("logger.warn('home_authority_clubs_failed'"),
    false,
    'club authority failures should not be warning-only',
  );
});

test('home screen fails closed when API-mode club feed authority is unavailable', () => {
  const source = readProjectFile('hooks/use-home-screen.ts');
  const feedReadStart = source.indexOf("socialFeedService.getFeedAuthority(primaryClub.id, 'all')");
  const highlightsStart = source.indexOf('const preferredHighlights = feed.data.filter', feedReadStart);

  assert.ok(feedReadStart >= 0, 'expected home screen to read club feed authority');
  assert.ok(highlightsStart > feedReadStart, 'expected highlights after feed authority check');

  const feedBlock = source.slice(feedReadStart, highlightsStart);

  assert.equal(
    source.includes('.then((result) => (result.success ? result.data : []))'),
    false,
    'club feed authority failures must not render as empty highlights',
  );
  assert.ok(
    feedBlock.includes('if (!feed.success)') && feedBlock.includes('return err(feed.error);'),
    'club feed authority failure should fail the home frame load',
  );
  assert.ok(
    source.includes('const preferredHighlights = feed.data.filter') &&
      source.includes('preferredHighlights.length > 0 ? preferredHighlights : feed.data'),
    'successful home loads should use authoritative /v1 club feed rows',
  );
});
