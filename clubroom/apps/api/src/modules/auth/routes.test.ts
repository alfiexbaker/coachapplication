import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { resetAuthRuntimeForTests } from '../../lib/auth-runtime.js';
import { resetMarketplaceSeedStoreForTests } from '../../lib/marketplace-seed-store.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

describe('auth routes', () => {
  const app = buildApp();

  beforeEach(() => {
    resetAuthRuntimeForTests();
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
    assert.match(payload.tokens.accessToken, JWT_PATTERN);
    assert.match(payload.tokens.refreshToken, JWT_PATTERN);

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

  it('refreshes a JWT session and keeps the session usable', async () => {
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
    assert.match(refreshPayload.tokens.accessToken, JWT_PATTERN);
    assert.match(refreshPayload.tokens.refreshToken, JWT_PATTERN);

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

  it('revokes bearer sessions on logout and explicit revoke', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'amelia.shaw@clubroom.demo',
        password: 'coach',
      },
    });
    assert.equal(login.statusCode, 200);
    const loginPayload = login.json() as {
      tokens: { accessToken: string; refreshToken: string };
    };

    const logout = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: {
        authorization: `Bearer ${loginPayload.tokens.accessToken}`,
      },
    });
    assert.equal(logout.statusCode, 204);

    const meAfterLogout = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${loginPayload.tokens.accessToken}`,
      },
    });
    assert.equal(meAfterLogout.statusCode, 403);

    const secondLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'amelia.shaw@clubroom.demo',
        password: 'coach',
      },
    });
    assert.equal(secondLogin.statusCode, 200);
    const secondLoginPayload = secondLogin.json() as {
      tokens: { accessToken: string; refreshToken: string };
    };

    const revoke = await app.inject({
      method: 'POST',
      url: '/v1/auth/revoke',
      headers: {
        authorization: `Bearer ${secondLoginPayload.tokens.accessToken}`,
      },
      payload: {
        refreshToken: secondLoginPayload.tokens.refreshToken,
      },
    });
    assert.equal(revoke.statusCode, 204);

    const refreshAfterRevoke = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      payload: {
        refreshToken: secondLoginPayload.tokens.refreshToken,
      },
    });
    assert.equal(refreshAfterRevoke.statusCode, 401);
  });

  it('rejects scaffold auth headers when runtime header override is disabled', async () => {
    const runtimeApp = buildApp({ allowTestAuthHeaders: false });

    try {
      const headerOnlyMe = await runtimeApp.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: {
          'x-auth-user-id': 'usr_coach1',
          'x-auth-roles': 'coach',
          'x-acting-role': 'coach',
        },
      });
      assert.equal(headerOnlyMe.statusCode, 403);

      const login = await runtimeApp.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
          password: 'coach',
        },
      });
      assert.equal(login.statusCode, 200);
      const loginPayload = login.json() as {
        tokens: { accessToken: string };
      };

      const bearerMe = await runtimeApp.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: {
          authorization: `Bearer ${loginPayload.tokens.accessToken}`,
          'x-acting-role': 'coach',
        },
      });
      assert.equal(bearerMe.statusCode, 200);
    } finally {
      await runtimeApp.close();
    }
  });

  it('accepts issuer-validated external bearer tokens for mapped local users', async () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const publicJwk = publicKey.export({ format: 'jwk' }) as Record<string, string>;
    const jwksServer = http.createServer((req, res) => {
      if (req.url !== '/.well-known/jwks.json') {
        res.statusCode = 404;
        res.end();
        return;
      }
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({
        keys: [
          {
            ...publicJwk,
            alg: 'RS256',
            kid: 'test-key',
            use: 'sig',
          },
        ],
      }));
    });

    await new Promise<void>((resolve) => {
      jwksServer.listen(0, '127.0.0.1', () => resolve());
    });

    const address = jwksServer.address();
    assert.ok(address && typeof address === 'object');
    const issuer = `http://127.0.0.1:${address.port}`;
    const previousIssuer = env.AUTH0_ISSUER_URL;
    const previousAudience = env.AUTH0_AUDIENCE;
    env.AUTH0_ISSUER_URL = issuer;
    env.AUTH0_AUDIENCE = 'clubroom-mobile';

    try {
      const nowSec = Math.floor(Date.now() / 1000);
      const header = encodeBase64Url(JSON.stringify({
        alg: 'RS256',
        kid: 'test-key',
        typ: 'JWT',
      }));
      const payload = encodeBase64Url(JSON.stringify({
        aud: 'clubroom-mobile',
        exp: nowSec + 300,
        iat: nowSec,
        iss: issuer,
        sub: 'auth0|coach-amelia',
      }));
      const signedValue = `${header}.${payload}`;
      const signature = crypto.sign('RSA-SHA256', Buffer.from(signedValue), privateKey);
      const token = `${signedValue}.${signature.toString('base64url')}`;

      const me = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
          'x-acting-role': 'coach',
        },
      });
      assert.equal(me.statusCode, 200);
      const payloadJson = me.json() as { user: { email: string; roles: string[] } };
      assert.equal(payloadJson.user.email, 'amelia.shaw@clubroom.demo');
      assert.equal(payloadJson.user.roles.includes('coach'), true);
    } finally {
      env.AUTH0_ISSUER_URL = previousIssuer;
      env.AUTH0_AUDIENCE = previousAudience;
      await new Promise<void>((resolve, reject) => {
        jwksServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });
});
