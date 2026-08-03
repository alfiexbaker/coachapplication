import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

describe('roster consents authority boundary', () => {
  it('requires a coach and leaves terminal access denials without retry', () => {
    const hook = fs.readFileSync(path.join(process.cwd(), 'hooks/use-consents.ts'), 'utf8');
    const screen = fs.readFileSync(path.join(process.cwd(), 'app/roster/consents.tsx'), 'utf8');
    const card = fs.readFileSync(path.join(process.cwd(), 'components/consent/ConsentCard.tsx'), 'utf8');

    assert.match(hook, /currentUser\?\.role !== 'COACH'/);
    assert.match(hook, /currentUser\?\.role, filters, searchQuery/);
    assert.match(screen, /title=\{terminalAccessError \? 'Consent access unavailable' : undefined\}/);
    assert.match(screen, /onRetry=\{terminalAccessError \? undefined : c\.retry\}/);
    assert.match(screen, /accessibilityLabel="Back"/);
    assert.match(screen, />Consents</);
    assert.match(screen, /Review player consents before posting\./);
    assert.match(screen, /placeholder="Search players\.\.\."/);
    assert.match(screen, /accessibilityLabel=\{c\.showFilters \? 'Hide consent filters' : 'Show consent filters'\}/);
    assert.match(
      screen,
      /pct === 100 \? palette\.success : pct > 0 \? palette\.warning : palette\.error/,
    );
    assert.match(card, /Consent status/);
    assert.doesNotMatch(card, />Parent</);
    assert.doesNotMatch(screen, /Consent Dashboard/);
    assert.doesNotMatch(screen, /Quick view before posting content/);
  });
});
