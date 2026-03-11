import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { buildApp } from '../../app.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';

describe('auth routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetMarketplaceSeedStoreForTests();
    resetDbFixtureStoreForTests();
  });

  after(async () => {
    await app.close();
  });

  it('logs in a seeded coach and returns a usable bearer session', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'amelia.shaw@clubroom.demo',
        password: 'coach',
      },
    });

    assert.equal(login.statusCode, 200);
    const payload = login.json() as {
      user: { email: string; accountType: string; appRole: string; roles: string[] };
      tokens: { accessToken: string; refreshToken: string; expiresAt: number };
    };
    assert.equal(payload.user.email, 'amelia.shaw@clubroom.demo');
    assert.equal(payload.user.accountType, 'COACH');
    assert.equal(payload.user.appRole, 'COACH');
    assert.equal(payload.user.roles.includes('coach'), true);
    assert.match(payload.tokens.accessToken, /^clubroom_dev_/);
    assert.match(payload.tokens.refreshToken, /^clubroom_dev_/);

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${payload.tokens.accessToken}`,
      },
    });
    assert.equal(me.statusCode, 200);
    const mePayload = me.json() as { user: { email: string; firstName: string } };
    assert.equal(mePayload.user.email, 'amelia.shaw@clubroom.demo');
    assert.equal(mePayload.user.firstName, 'Amelia');
  });

  it('refreshes a dev session and keeps the session usable', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'olivia.barton@clubroom.demo',
        password: 'user',
      },
    });
    const loginPayload = login.json() as {
      tokens: { refreshToken: string };
    };

    const refresh = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: {
        refreshToken: loginPayload.tokens.refreshToken,
      },
    });
    assert.equal(refresh.statusCode, 200);
    const refreshPayload = refresh.json() as {
      tokens: { accessToken: string; refreshToken: string };
    };
    assert.match(refreshPayload.tokens.accessToken, /^clubroom_dev_/);
    assert.match(refreshPayload.tokens.refreshToken, /^clubroom_dev_/);

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${refreshPayload.tokens.accessToken}`,
      },
    });
    assert.equal(me.statusCode, 200);
    const mePayload = me.json() as { user: { appRole: string; hasChildren: boolean } };
    assert.equal(mePayload.user.appRole, 'USER');
    assert.equal(typeof mePayload.user.hasChildren, 'boolean');
  });

  it('supports email availability, registration, and profile patching', async () => {
    const email = `new_${Date.now()}@clubroom.demo`;

    const availabilityBefore = await app.inject({
      method: 'GET',
      url: `/v1/auth/check-email?email=${encodeURIComponent(email)}`,
    });
    assert.equal(availabilityBefore.statusCode, 200);
    assert.equal((availabilityBefore.json() as { available: boolean }).available, true);

    const register = await app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: {
        email,
        password: 'securePass123',
        accountType: 'PARENT',
        firstName: 'New',
        lastName: 'Parent',
        phone: '+44770090001',
      },
    });
    assert.equal(register.statusCode, 201);
    const registerPayload = register.json() as {
      user: { email: string; appRole: string };
      tokens: { accessToken: string };
    };
    assert.equal(registerPayload.user.email, email);
    assert.equal(registerPayload.user.appRole, 'USER');

    const availabilityAfter = await app.inject({
      method: 'GET',
      url: `/v1/auth/check-email?email=${encodeURIComponent(email)}`,
    });
    assert.equal((availabilityAfter.json() as { available: boolean }).available, false);

    const patch = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${registerPayload.tokens.accessToken}`,
      },
      payload: {
        city: 'London',
        postcode: 'SW1A 1AA',
        onboardingComplete: true,
      },
    });
    assert.equal(patch.statusCode, 200);
    const patchPayload = patch.json() as {
      user: { city?: string; postcode?: string; onboardingComplete: boolean };
    };
    assert.equal(patchPayload.user.city, 'London');
    assert.equal(patchPayload.user.postcode, 'SW1A 1AA');
    assert.equal(patchPayload.user.onboardingComplete, true);
  });
});
