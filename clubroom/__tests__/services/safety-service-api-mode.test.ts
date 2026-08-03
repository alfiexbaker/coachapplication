import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';

import type { ConsentType } from '@/constants/types';
import { networkError } from '@/types/result';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

const API_COACH_CONTEXT = {
  requestorId: 'coach_api_1',
  requestorRole: 'coach' as const,
  isVerifiedCoach: true,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

describe('safetyService API mode', () => {
  it('initializes emergency fixture storage empty outside mock mode', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'services/safety-service.ts'), 'utf8');

    assert.ok(
      source.includes(
        'let mockEmergencyInfo = apiClient.isMockMode ? cloneEmergencyInfoStore(MOCK_EMERGENCY_INFO) : {}',
      ),
    );
  });

  it('fails closed instead of showing cached or empty emergency data when live reads fail', async () => {
    const [{ safetyService }, { familyHealthService }] = await Promise.all([
      import('@/services/safety-service'),
      import('@/services/family/family-health-service'),
    ]);

    const originalGetEmergencyInfo = familyHealthService.getEmergencyInfo;
    familyHealthService.getEmergencyInfo = async () => ({
      success: false,
      error: networkError('backend unavailable'),
    });

    try {
      const result = await safetyService.getAthleteEmergency(
        'athlete_api',
        API_COACH_CONTEXT,
        'API Athlete',
      );

      assert.equal(result.success, false);
      assert.equal(!result.success && result.error.message, 'backend unavailable');
    } finally {
      familyHealthService.getEmergencyInfo = originalGetEmergencyInfo;
    }
  });

  it('does not claim emergency data was cached when API mode has no offline authority', async () => {
    const { safetyService } = await import('@/services/safety-service');

    const result = await safetyService.preCacheSessionEmergencyInfo(
      [{ athleteId: 'ath_safety_api_1', athleteName: 'API Athlete' }],
      API_COACH_CONTEXT,
    );

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.error.code, 'UNSUPPORTED');
      assert.deepEqual(result.error.details, {
        capability: 'offline-emergency-cache',
        authority: '/v1/athletes/:athleteId/{medical,emergency-contacts,consents}',
      });
    }
  });

  it('uses live /v1 family health routes without local safety storage or stale API cache', async (t) => {
    const [{ safetyService }, { apiClient }, { authService }] = await Promise.all([
      import('@/services/safety-service'),
      import('@/services/api-client'),
      import('@/services/auth-service'),
    ]);

    const client = apiClient as unknown as {
      get: typeof apiClient.get;
      set: typeof apiClient.set;
      remove: typeof apiClient.remove;
    };
    const auth = authService as unknown as {
      getCurrentUser: typeof authService.getCurrentUser;
      getTokens: typeof authService.getTokens;
    };
    const original = {
      fetch: globalThis.fetch,
      get: client.get,
      set: client.set,
      remove: client.remove,
      getCurrentUser: auth.getCurrentUser,
      getTokens: auth.getTokens,
    };

    const apiAthleteId = 'ath_safety_api_1';
    let medicalGetCount = 0;
    let medical = {
      athleteId: apiAthleteId,
      conditions: ['asthma'],
      allergies: ['peanuts'],
      medications: ['inhaler'],
      restrictions: ['warm up first'],
      doctorName: 'Dr Live',
      doctorPhone: '+442071234500',
      insuranceProvider: null,
      insuranceNumber: null,
      emergencyNotes: 'server note 0',
      senNotes: null,
      updatedAt: '2026-07-01T10:00:00.000Z',
      updatedByUserId: 'usr_parent_safety_api_1',
    };
    let contacts = [
      {
        id: 'emc_existing_1',
        name: 'Parent Live',
        relationship: 'parent',
        phone: '+447700900111',
        email: 'parent.live@example.test',
        isPrimary: true,
        canPickup: true,
      },
    ];
    let consents: Array<{
      type: ConsentType;
      granted: boolean;
      grantedAt?: string;
      grantedBy: string;
      expiryAt?: string;
    }> = [
      {
        type: 'PHOTO',
        granted: true,
        grantedAt: '2026-07-01T10:00:00.000Z',
        grantedBy: 'Parent Live',
      },
      { type: 'VIDEO', granted: false, grantedBy: '' },
      { type: 'SOCIAL_MEDIA', granted: false, grantedBy: '' },
      {
        type: 'EMERGENCY_TREATMENT',
        granted: true,
        grantedAt: '2026-07-01T10:00:00.000Z',
        grantedBy: 'Parent Live',
      },
    ];
    const calls: Array<{ method: string; path: string; body?: unknown; headers: Headers }> = [];

    client.get = async () => {
      throw new Error('local safety reads should not run in API mode');
    };
    client.set = async () => {
      throw new Error('local safety writes should not run in API mode');
    };
    client.remove = async () => {
      throw new Error('local safety deletes should not run in API mode');
    };
    auth.getCurrentUser = async () => ({
      id: 'parent_safety_api_1',
      email: 'parent.safety@example.test',
      accountType: 'PARENT',
      firstName: 'Parent',
      lastName: 'Safety',
      isVerified: true,
      onboardingComplete: true,
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-01T00:00:00.000Z',
    });
    auth.getTokens = async () => null;
    globalThis.fetch = (async (input, init) => {
      const url = new URL(String(input));
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({
        method,
        path: url.pathname,
        body,
        headers: new Headers(init?.headers),
      });

      if (url.pathname === `/v1/athletes/${apiAthleteId}/medical` && method === 'GET') {
        medicalGetCount += 1;
        return jsonResponse({
          ...medical,
          emergencyNotes: `server note ${medicalGetCount}`,
          updatedAt: `2026-07-01T10:00:0${medicalGetCount}.000Z`,
        });
      }

      if (url.pathname === `/v1/athletes/${apiAthleteId}/medical` && method === 'PATCH') {
        medical = {
          ...medical,
          ...(body as Partial<typeof medical>),
          updatedAt: '2026-07-01T10:01:00.000Z',
        };
        return jsonResponse(medical);
      }

      if (url.pathname === `/v1/athletes/${apiAthleteId}/emergency-contacts` && method === 'GET') {
        return jsonResponse({
          athleteId: apiAthleteId,
          contacts,
          updatedAt: '2026-07-01T10:00:00.000Z',
          updatedByUserId: 'usr_parent_safety_api_1',
        });
      }

      if (
        url.pathname === `/v1/athletes/${apiAthleteId}/emergency-contacts` &&
        method === 'PATCH'
      ) {
        const requestedContacts = (body as { contacts: typeof contacts }).contacts;
        contacts = requestedContacts.map((contact, index) => ({
          ...contact,
          id: contact.id ?? `emc_created_${index + 1}`,
        }));
        return jsonResponse({
          athleteId: apiAthleteId,
          contacts,
          updatedAt: '2026-07-01T10:02:00.000Z',
          updatedByUserId: 'usr_parent_safety_api_1',
        });
      }

      if (url.pathname === `/v1/athletes/${apiAthleteId}/consents` && method === 'GET') {
        return jsonResponse({
          athleteId: apiAthleteId,
          consents,
          updatedAt: '2026-07-01T10:00:00.000Z',
          updatedByUserId: 'usr_parent_safety_api_1',
        });
      }

      if (url.pathname === `/v1/athletes/${apiAthleteId}/consents` && method === 'PUT') {
        consents = (body as { consents: typeof consents }).consents;
        return jsonResponse({
          athleteId: apiAthleteId,
          consents,
          updatedAt: '2026-07-01T10:03:00.000Z',
          updatedByUserId: 'usr_parent_safety_api_1',
        });
      }

      return jsonResponse({ message: `Unhandled ${method} ${url.pathname}` }, 500);
    }) as typeof fetch;

    t.after(() => {
      globalThis.fetch = original.fetch;
      client.get = original.get;
      client.set = original.set;
      client.remove = original.remove;
      auth.getCurrentUser = original.getCurrentUser;
      auth.getTokens = original.getTokens;
    });

    await assert.doesNotReject(() => safetyService.resetToMockData());
    assert.equal(calls.length, 0);

    const firstRead = await safetyService.getEmergencyInfo('safety_api_1');
    assert.equal(firstRead.success, true);
    assert.equal(firstRead.success && firstRead.data.medical.notes, 'server note 1');

    const secondRead = await safetyService.getEmergencyInfo('safety_api_1');
    assert.equal(secondRead.success, true);
    assert.equal(secondRead.success && secondRead.data.medical.notes, 'server note 2');

    const routesAfterReads = calls.map((call) => `${call.method} ${call.path}`);
    assert.deepEqual(routesAfterReads, [
      `GET /v1/athletes/${apiAthleteId}/medical`,
      `GET /v1/athletes/${apiAthleteId}/emergency-contacts`,
      `GET /v1/athletes/${apiAthleteId}/consents`,
      `GET /v1/athletes/${apiAthleteId}/medical`,
      `GET /v1/athletes/${apiAthleteId}/emergency-contacts`,
      `GET /v1/athletes/${apiAthleteId}/consents`,
    ]);
    assert.equal(calls[0]?.headers.get('x-acting-role'), 'parent');
    assert.equal(calls[0]?.headers.get('x-guardian-athlete-ids'), apiAthleteId);

    const medicalUpdate = await safetyService.updateMedicalInfo('safety_api_1', {
      conditions: ['asthma', 'eczema'],
      notes: 'Carry inhaler.',
    });
    assert.equal(medicalUpdate.success, true);

    const contactUpdate = await safetyService.addContact('safety_api_1', {
      name: 'Second Parent',
      relationship: 'parent',
      phone: '+447700900222',
      isPrimary: false,
      canPickup: true,
    });
    assert.equal(contactUpdate.success, true);

    const consentUpdate = await safetyService.updateConsent(
      'safety_api_1',
      'VIDEO',
      true,
      'Parent Live',
    );
    assert.equal(consentUpdate.success, true);

    const removeResult = await safetyService.removeEmergencyInfo('safety_api_1');
    assert.equal(removeResult.success, false);
    assert.equal(removeResult.success ? '' : removeResult.error.code, 'VALIDATION');

    const patchMedicalCall = calls.find(
      (call) => call.method === 'PATCH' && call.path === `/v1/athletes/${apiAthleteId}/medical`,
    );
    assert.deepEqual(patchMedicalCall?.body, {
      conditions: ['asthma', 'eczema'],
      emergencyNotes: 'Carry inhaler.',
    });

    const patchContactsCall = calls.find(
      (call) =>
        call.method === 'PATCH' && call.path === `/v1/athletes/${apiAthleteId}/emergency-contacts`,
    );
    assert.deepEqual(patchContactsCall?.body, {
      contacts: [
        {
          id: 'emc_existing_1',
          name: 'Parent Live',
          relationship: 'parent',
          phone: '+447700900111',
          email: 'parent.live@example.test',
          isPrimary: true,
          canPickup: true,
        },
        {
          name: 'Second Parent',
          relationship: 'parent',
          phone: '+447700900222',
          isPrimary: false,
          canPickup: true,
        },
      ],
    });

    const putConsentsCall = calls.find(
      (call) => call.method === 'PUT' && call.path === `/v1/athletes/${apiAthleteId}/consents`,
    );
    assert.equal(
      (
        putConsentsCall?.body as { consents?: Array<{ type: ConsentType; granted: boolean }> }
      ).consents?.find((consent) => consent.type === 'VIDEO')?.granted,
      true,
    );
  });
});
