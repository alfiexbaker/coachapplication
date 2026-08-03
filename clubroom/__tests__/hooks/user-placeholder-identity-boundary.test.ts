import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

const USER_OWNED_RUNTIME_FILES = [
  'app/bookings/subscribe.tsx',
  'app/chat/[threadId].tsx',
  'app/community/[groupId].tsx',
  'app/favourites/index.tsx',
  'hooks/use-calendar-sync.ts',
  'hooks/use-notification-prefs.ts',
  'hooks/use-squad-detail.ts',
  'hooks/use-subscribe.ts',
  'services/calendar-service.ts',
] as const;

const PLACEHOLDER_ACTORS = ['current_user', 'parent1', 'user1', 'coach1', 'coach-fallback'] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('user-owned runtime flows do not fabricate placeholder actors', () => {
  const offenders: string[] = [];

  for (const file of USER_OWNED_RUNTIME_FILES) {
    const source = readProjectFile(file);
    for (const actor of PLACEHOLDER_ACTORS) {
      if (source.includes(actor)) {
        offenders.push(`${file}: ${actor}`);
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `User-owned runtime flows must use authenticated identity, not placeholders. Offenders: ${offenders.join(', ')}`,
  );
});
