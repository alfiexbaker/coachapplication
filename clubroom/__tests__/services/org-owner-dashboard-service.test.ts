import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { api } from '@/constants/config';
import { orgOwnerDashboardService } from '@/services/org-owner-dashboard-service';

describe('orgOwnerDashboardService', () => {
  it('fails closed in explicit mock mode instead of composing local dashboard authority', async (t) => {
    const descriptor = Object.getOwnPropertyDescriptor(api, 'useMock');
    Object.defineProperty(api, 'useMock', {
      configurable: true,
      value: true,
    });
    t.after(() => {
      if (descriptor) Object.defineProperty(api, 'useMock', descriptor);
    });

    const result = await orgOwnerDashboardService.getDashboardData('club_lions', 'coach1');

    assert.equal(result.success, false);
    assert.equal(result.success ? null : result.error.code, 'VALIDATION');
    assert.match(result.success ? '' : result.error.message, /requires live \/v1 API data/i);
  });
});
