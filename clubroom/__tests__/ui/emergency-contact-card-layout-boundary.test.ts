import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('emergency contact details keep the full value inside the card', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/child/emergency-contact-card.tsx'),
    'utf8',
  );

  assert.equal(
    source.includes('details: { gap: Spacing.xs, marginLeft: 56 }'),
    false,
    'contact details must not lose width to the old fixed indent',
  );
  assert.ok(source.includes('detailValue: { flex: 1, minWidth: 0 }'));
  assert.match(
    source,
    /contact\.email[\s\S]*style=\{\[styles\.detailValue, Typography\.caption/,
  );
});
