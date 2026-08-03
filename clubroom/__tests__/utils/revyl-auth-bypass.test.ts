import assert from 'node:assert/strict';
import test from 'node:test';

import { Routes } from '../../navigation/routes';
import { evaluateRevylAuthBypassUrl } from '../../utils/revyl-auth-bypass';

const enabledRuntime = {
  isDevelopmentEnvironment: true,
  isTestRuntime: true,
  isNativeAuditTestMode: false,
  useMock: true,
  enabled: true,
  token: 'native-audit-test-token',
};

test('accepts only allowlisted native-audit roles and redirects', () => {
  assert.deepEqual(
    evaluateRevylAuthBypassUrl(
      'clubroom://revyl-auth?token=native-audit-test-token&role=coach&redirect=club',
      enabledRuntime,
    ),
    { kind: 'accepted', role: 'coach', entryId: 'coach_delivery', route: Routes.clubDashboard('club_lions') },
  );
  assert.equal(
    evaluateRevylAuthBypassUrl(
      'clubroom://revyl-auth?token=native-audit-test-token&role=athlete',
      enabledRuntime,
    ).kind,
    'accepted',
  );
});

test('rejects disabled, forged, unknown-role, and unknown-redirect audit links', () => {
  assert.equal(
    evaluateRevylAuthBypassUrl('clubroom://revyl-auth?token=native-audit-test-token&role=coach', {
      ...enabledRuntime,
      isDevelopmentEnvironment: false,
    }).kind,
    'rejected',
  );
  assert.equal(
    evaluateRevylAuthBypassUrl('clubroom://revyl-auth?token=forged&role=coach', enabledRuntime).kind,
    'rejected',
  );
  assert.equal(
    evaluateRevylAuthBypassUrl('clubroom://revyl-auth?token=native-audit-test-token&role=owner', enabledRuntime).kind,
    'rejected',
  );
  assert.equal(
    evaluateRevylAuthBypassUrl(
      'clubroom://revyl-auth?token=native-audit-test-token&role=coach&redirect=admin',
      enabledRuntime,
    ).kind,
    'rejected',
  );
});

test('accepts the explicitly gated debug native-audit runtime', () => {
  assert.equal(
    evaluateRevylAuthBypassUrl('clubroom://revyl-auth?token=native-audit-test-token&role=parent', {
      ...enabledRuntime,
      isTestRuntime: false,
      isNativeAuditTestMode: true,
    }).kind,
    'accepted',
  );
});
