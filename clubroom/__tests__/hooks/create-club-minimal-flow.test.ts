import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const readSource = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('club creation keeps real setup choices and removes non-functional marketing UI', () => {
  const hook = readSource('hooks/use-create-club.ts');
  const screen = readSource('app/club/create.tsx');

  assert.ok(hook.includes("const [cityTouched, setCityTouched] = useState(false);"));
  assert.ok(hook.includes("'Enter the city where the club is based'"));
  assert.ok(hook.includes("uiFeedback.showToast('Sign in before creating a club.', 'error');"));
  assert.ok(hook.includes("country: country.trim() || 'UK',"));
  assert.equal(hook.includes('CLUB_FEATURES'), false);

  assert.ok(screen.includes('Commercial model'));
  assert.ok(screen.includes('First staff invite'));
  assert.ok(screen.includes('accessibilityLabel={label.replace(\'*\', \'\').trim()}'));
  assert.ok(screen.includes('maxLength={100}'));
  assert.equal(screen.includes('Start Your Club Community'), false);
  assert.equal(screen.includes('What you&apos;ll get'), false);
  assert.equal(screen.includes('Preview'), false);
});
