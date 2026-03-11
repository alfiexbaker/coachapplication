import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getCoachBusinessContext,
  getCoachMoneyContext,
  getCoachMoneyContextDisplay,
  getCoachWorkContextDisplay,
  matchesCoachBusinessFilter,
} from '@/utils/coach-business-context';

describe('coach business context helpers', () => {
  it('treats self-managed work as independent', () => {
    assert.equal(getCoachBusinessContext({ actingAs: 'self' }), 'independent');
    assert.equal(getCoachMoneyContext({ actingAs: 'self' }), 'independent_direct');
    assert.equal(
      getCoachWorkContextDisplay({ actingAs: 'self' }).label,
      'Independent session',
    );
  });

  it('treats club work as org work even without explicit commercial mode', () => {
    assert.equal(
      getCoachBusinessContext({ actingAs: 'club', clubId: 'club_lions' }),
      'org',
    );
    assert.equal(
      getCoachMoneyContext({ actingAs: 'club', clubId: 'club_lions' }),
      'org_direct',
    );
    assert.equal(
      getCoachMoneyContextDisplay({ actingAs: 'club', clubId: 'club_lions' }).detail,
      'Coach-collected via org booking',
    );
  });

  it('maps org-owned club work to reconciler credits', () => {
    assert.equal(
      getCoachMoneyContext({
        actingAs: 'club',
        clubId: 'club_lions',
        commercialMode: 'ORG_OWNED',
      }),
      'org_credit',
    );
    assert.equal(
      getCoachMoneyContextDisplay({
        actingAs: 'club',
        clubId: 'club_lions',
        commercialMode: 'ORG_OWNED',
      }).label,
      'Org credit',
    );
  });

  it('filters by coach business context', () => {
    const orgSource = { actingAs: 'club' as const, clubId: 'club_lions' };
    const independentSource = { actingAs: 'self' as const };

    assert.equal(matchesCoachBusinessFilter(orgSource, 'org'), true);
    assert.equal(matchesCoachBusinessFilter(orgSource, 'independent'), false);
    assert.equal(matchesCoachBusinessFilter(independentSource, 'independent'), true);
    assert.equal(matchesCoachBusinessFilter(independentSource, 'all'), true);
  });
});
