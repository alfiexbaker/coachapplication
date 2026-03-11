import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  canEditClubCommercialMode,
  canViewClubCommercialMode,
  formatCommercialModeLabel,
} from '@/utils/organization-commercial-mode';

describe('organization-commercial-mode', () => {
  it('restricts commercial mode editing to owners', () => {
    assert.equal(canEditClubCommercialMode('OWNER'), true);
    assert.equal(canEditClubCommercialMode('ADMIN'), false);
    assert.equal(canEditClubCommercialMode('HEAD_COACH'), false);
    assert.equal(canEditClubCommercialMode('COACH'), false);
    assert.equal(canEditClubCommercialMode('ASSISTANT'), false);
    assert.equal(canEditClubCommercialMode('MEMBER'), false);
  });

  it('allows owner, admin, and head coach to view commercial mode', () => {
    assert.equal(canViewClubCommercialMode('OWNER'), true);
    assert.equal(canViewClubCommercialMode('ADMIN'), true);
    assert.equal(canViewClubCommercialMode('HEAD_COACH'), true);
    assert.equal(canViewClubCommercialMode('COACH'), false);
    assert.equal(canViewClubCommercialMode('ASSISTANT'), false);
  });

  it('formats commercial mode labels for settings copy', () => {
    assert.equal(formatCommercialModeLabel('COACH_OWNED'), 'Coach-owned');
    assert.equal(formatCommercialModeLabel('ORG_OWNED'), 'Organization-owned');
  });
});
