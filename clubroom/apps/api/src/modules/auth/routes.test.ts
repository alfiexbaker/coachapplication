import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, beforeEach, describe, it } from 'node:test';
import { env } from '@clubroom/config';
import { buildApp } from '../../app.js';
import { resetAuthRuntimeForTests } from '../../lib/auth-runtime.js';
import {
  getMarketplaceSeedStore,
  resetMarketplaceSeedStoreForTests,
} from '../../lib/marketplace-seed-store.js';
import { resetDbFixtureStoreForTests } from '../../lib/db-fixture-store.js';

const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const asRows = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
const asString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

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

  it('answers local web CORS preflight for login', async () => {
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/login',
      headers: {
        origin: 'http://localhost:8083',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,authorization',
      },
    });

    assert.equal(preflight.statusCode, 204);
    assert.equal(preflight.headers['access-control-allow-origin'], 'http://localhost:8083');
    assert.equal(preflight.headers['access-control-allow-credentials'], 'true');
    assert.match(String(preflight.headers['access-control-allow-methods']), /POST/);
    assert.equal(preflight.headers['access-control-allow-headers'], 'content-type,authorization');
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

  it('returns the canonical linked athlete identity instead of deriving it from the user id', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: 'alex.barton@clubroom.demo',
        password: 'user',
      },
    });

    assert.equal(login.statusCode, 200);
    const payload = login.json() as {
      user: {
        id: string;
        athleteId?: string;
        athleteName?: string;
        accountType: string;
      };
      tokens: { accessToken: string };
    };
    assert.equal(payload.user.accountType, 'ATHLETE');
    assert.equal(payload.user.athleteId, 'ath_7df7ec13-e136-7525-985f-dec069fc983f');
    assert.equal(payload.user.athleteName, 'Alfie Barton');
    assert.notEqual(payload.user.athleteId, `ath_${payload.user.id.replace(/^usr_/, '')}`);

    const me = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${payload.tokens.accessToken}`,
      },
    });
    assert.equal(me.statusCode, 200);
    const mePayload = me.json() as {
      user: { athleteId?: string; athleteName?: string };
    };
    assert.equal(mePayload.user.athleteId, payload.user.athleteId);
    assert.equal(mePayload.user.athleteName, payload.user.athleteName);
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

    const nextEmail = `updated_${Date.now()}@clubroom.demo`;
    const patch = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${registerPayload.tokens.accessToken}`,
      },
      payload: {
        email: nextEmail.toUpperCase(),
        phone: '+44 7700 900123',
        city: 'London',
        postcode: 'SW1A 1AA',
        isVerified: true,
        onboardingComplete: true,
      },
    });
    assert.equal(patch.statusCode, 200);
    const patchPayload = patch.json() as {
      user: {
        email: string;
        phone?: string;
        city?: string;
        postcode?: string;
        isVerified: boolean;
        onboardingComplete: boolean;
      };
    };
    assert.equal(patchPayload.user.email, nextEmail);
    assert.equal(patchPayload.user.phone, '+44 7700 900123');
    assert.equal(patchPayload.user.city, 'London');
    assert.equal(patchPayload.user.postcode, 'SW1A 1AA');
    assert.equal(patchPayload.user.isVerified, false);
    assert.equal(patchPayload.user.onboardingComplete, true);

    const oldEmailLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email,
        password: 'securePass123',
      },
    });
    assert.equal(oldEmailLogin.statusCode, 401);

    const newEmailLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        email: nextEmail,
        password: 'securePass123',
      },
    });
    assert.equal(newEmailLogin.statusCode, 200);

    const duplicateEmailPatch = await app.inject({
      method: 'PATCH',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${registerPayload.tokens.accessToken}`,
      },
      payload: {
        email: 'amelia.shaw@clubroom.demo',
      },
    });
    assert.equal(duplicateEmailPatch.statusCode, 409);

    const profileUpdateAudits = asRows(getMarketplaceSeedStore().tables.auditEvents).filter(
      (row) => asString(row.action) === 'auth.profile_update',
    );
    const successAudit = profileUpdateAudits.find((row) => asString(row.result) === 'SUCCESS');
    const denyAudit = profileUpdateAudits.find((row) => asString(row.result) === 'DENY');
    assert.ok(successAudit, 'expected successful profile update audit');
    assert.ok(denyAudit, 'expected denied profile update audit');
    assert.deepEqual(
      [...((successAudit.metadataJson as { changedFields?: string[] }).changedFields ?? [])].sort(),
      ['city', 'email', 'onboardingComplete', 'phone', 'postcode'],
    );
    assert.equal(JSON.stringify(profileUpdateAudits).includes(nextEmail), false);
    assert.equal(JSON.stringify(profileUpdateAudits).includes('amelia.shaw@clubroom.demo'), false);
    assert.equal(JSON.stringify(profileUpdateAudits).includes('+44 7700 900123'), false);
  });

  it('verifies email with a hashed one-use verification token', async () => {
    const originalTokenEcho = process.env.API_EMAIL_VERIFICATION_TOKEN_RESPONSE;
    process.env.API_EMAIL_VERIFICATION_TOKEN_RESPONSE = '1';
    const email = `verify_${Date.now()}@clubroom.demo`;
    try {
      const register = await app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: {
          email,
          password: 'securePass123',
          accountType: 'COACH',
          firstName: 'Verify',
          lastName: 'Coach',
        },
      });
      assert.equal(register.statusCode, 201);
      const registerPayload = register.json() as {
        emailVerificationToken?: string;
        user: { id: string; isVerified: boolean };
        tokens: { accessToken: string };
      };
      assert.equal(registerPayload.user.isVerified, false);
      const emailVerificationToken = registerPayload.emailVerificationToken;
      assert.match(emailVerificationToken ?? '', /^\d{6}$/);
      if (!emailVerificationToken) {
        assert.fail('registration should echo email verification token in test mode');
      }

      const tokenRows = asRows(getMarketplaceSeedStore().tables.emailVerificationTokens);
      assert.equal(tokenRows.length, 1);
      assert.equal(asString(tokenRows[0]?.userId), registerPayload.user.id);
      assert.equal(asString(tokenRows[0]?.email), email);
      assert.equal(asString(tokenRows[0]?.tokenHash)?.length, 64);
      assert.equal(JSON.stringify(tokenRows).includes(emailVerificationToken), false);

      const denied = await app.inject({
        method: 'POST',
        url: '/v1/auth/verify-email',
        headers: {
          authorization: `Bearer ${registerPayload.tokens.accessToken}`,
        },
        payload: {
          code: '000000',
        },
      });
      assert.equal(denied.statusCode, 400);

      const verification = await app.inject({
        method: 'POST',
        url: '/v1/auth/verify-email',
        headers: {
          authorization: `Bearer ${registerPayload.tokens.accessToken}`,
        },
        payload: {
          code: emailVerificationToken,
        },
      });
      assert.equal(verification.statusCode, 200);
      const verificationPayload = verification.json() as { user: { isVerified: boolean } };
      assert.equal(verificationPayload.user.isVerified, true);
      assert.equal(asString(tokenRows[0]?.usedAt) !== undefined, true);

      const me = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: {
          authorization: `Bearer ${registerPayload.tokens.accessToken}`,
        },
      });
      assert.equal(me.statusCode, 200);
      const mePayload = me.json() as { user: { isVerified: boolean } };
      assert.equal(mePayload.user.isVerified, true);

      const emailPatch = await app.inject({
        method: 'PATCH',
        url: '/v1/auth/me',
        headers: {
          authorization: `Bearer ${registerPayload.tokens.accessToken}`,
        },
        payload: {
          email: `changed_${Date.now()}@clubroom.demo`,
          isVerified: true,
        },
      });
      assert.equal(emailPatch.statusCode, 200);
      const emailPatchPayload = emailPatch.json() as { user: { isVerified: boolean } };
      assert.equal(emailPatchPayload.user.isVerified, false);

      const audits = asRows(getMarketplaceSeedStore().tables.auditEvents).filter(
        (row) => asString(row.action) === 'auth.verify_email',
      );
      assert.equal(audits.length, 2);
      assert.equal(asString(audits[0]?.result), 'DENY');
      assert.equal(asString(audits[1]?.result), 'SUCCESS');
      assert.equal(JSON.stringify(audits).includes(emailVerificationToken), false);
    } finally {
      if (originalTokenEcho === undefined) {
        delete process.env.API_EMAIL_VERIFICATION_TOKEN_RESPONSE;
      } else {
        process.env.API_EMAIL_VERIFICATION_TOKEN_RESPONSE = originalTokenEcho;
      }
    }
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

  it('resets a password with a one-use backend token and revokes active sessions', async () => {
    const previousEcho = process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
    process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = '1';
    try {
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
        tokens: { accessToken: string };
      };

      const forgot = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
        },
      });
      assert.equal(forgot.statusCode, 200);
      const forgotPayload = forgot.json() as {
        resetToken: string;
        expiresAt: string;
      };
      assert.equal(typeof forgotPayload.resetToken, 'string');
      assert.equal(forgotPayload.resetToken.length > 20, true);
      assert.equal(Date.parse(forgotPayload.expiresAt) > Date.now(), true);

      const reset = await app.inject({
        method: 'POST',
        url: '/v1/auth/reset-password',
        payload: {
          token: forgotPayload.resetToken,
          newPassword: 'coach-reset-123',
        },
      });
      assert.equal(reset.statusCode, 204);

      const revokedMe = await app.inject({
        method: 'GET',
        url: '/v1/auth/me',
        headers: {
          authorization: `Bearer ${loginPayload.tokens.accessToken}`,
        },
      });
      assert.equal(revokedMe.statusCode, 403);

      const oldPassword = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
          password: 'coach',
        },
      });
      assert.equal(oldPassword.statusCode, 401);

      const newPassword = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
          password: 'coach-reset-123',
        },
      });
      assert.equal(newPassword.statusCode, 200);

      const reusedToken = await app.inject({
        method: 'POST',
        url: '/v1/auth/reset-password',
        payload: {
          token: forgotPayload.resetToken,
          newPassword: 'should-not-apply',
        },
      });
      assert.equal(reusedToken.statusCode, 400);

      const auditEvents = asRows(getMarketplaceSeedStore().tables.auditEvents);
      assert.ok(
        auditEvents.some(
          (row) =>
            asString(row.action) === 'auth.password_reset_requested' &&
            asString(row.result) === 'SUCCESS',
        ),
      );
      assert.ok(
        auditEvents.some(
          (row) =>
            asString(row.action) === 'auth.password_reset_completed' &&
            asString(row.result) === 'SUCCESS',
        ),
      );
      assert.ok(
        auditEvents.some(
          (row) =>
            asString(row.action) === 'auth.password_reset_completed' &&
            asString(row.result) === 'DENY',
        ),
      );
    } finally {
      if (previousEcho == null) {
        delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
      } else {
        process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = previousEcho;
      }
    }
  });

  it('does not echo reset tokens outside test or dev-outbox mode', async () => {
    const previousEcho = process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
    const previousNodeEnv = process.env.NODE_ENV;
    const previousDevOutbox = process.env.API_PASSWORD_RESET_DEV_OUTBOX;
    process.env.NODE_ENV = 'production';
    process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = '1';
    process.env.API_PASSWORD_RESET_DEV_OUTBOX = 'true';

    try {
      const forgot = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
        },
      });
      assert.equal(forgot.statusCode, 204);
      assert.equal(forgot.body, '');
    } finally {
      if (previousEcho == null) {
        delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
      } else {
        process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = previousEcho;
      }
      if (previousNodeEnv == null) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
      if (previousDevOutbox == null) {
        delete process.env.API_PASSWORD_RESET_DEV_OUTBOX;
      } else {
        process.env.API_PASSWORD_RESET_DEV_OUTBOX = previousDevOutbox;
      }
    }
  });

  it('does not echo reset tokens in test mode unless explicitly requested', async () => {
    const previousEcho = process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;

    try {
      const forgot = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
        },
      });
      assert.equal(forgot.statusCode, 204);
      assert.equal(forgot.body, '');
    } finally {
      if (previousEcho == null) {
        delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
      } else {
        process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = previousEcho;
      }
      if (previousNodeEnv == null) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
    }
  });

  it('delivers password reset links through the configured email webhook', async () => {
    const deliveries: {
      authorization?: string;
      body: Record<string, unknown>;
    }[] = [];
    const deliveryServer = http.createServer((req, res) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        deliveries.push({
          authorization: req.headers.authorization,
          body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {},
        });
        res.statusCode = 202;
        res.end('accepted');
      });
    });

    await new Promise<void>((resolve) => deliveryServer.listen(0, '127.0.0.1', resolve));
    const address = deliveryServer.address() as AddressInfo;
    const previousWebhookUrl = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL;
    const previousWebhookSecret = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET;
    const previousFrom = env.API_PASSWORD_RESET_EMAIL_FROM;
    const previousLinkBase = env.API_PASSWORD_RESET_LINK_BASE;
    const previousEcho = process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;

    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = `http://127.0.0.1:${address.port}/password-reset`;
    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = 'reset-webhook-secret';
    env.API_PASSWORD_RESET_EMAIL_FROM = 'support@clubroom.test';
    env.API_PASSWORD_RESET_LINK_BASE = 'https://app.clubroom.test/reset-password';
    process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = '1';

    try {
      const forgot = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
        },
      });
      assert.equal(forgot.statusCode, 200);
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0]?.authorization, 'Bearer reset-webhook-secret');
      assert.equal(deliveries[0]?.body.type, 'password_reset');
      assert.equal(deliveries[0]?.body.to, 'amelia.shaw@clubroom.demo');
      assert.equal(deliveries[0]?.body.from, 'support@clubroom.test');
      assert.equal(
        typeof deliveries[0]?.body.resetUrl === 'string' &&
          deliveries[0].body.resetUrl.startsWith('https://app.clubroom.test/reset-password?token='),
        true,
      );

      const resetToken = new URL(String(deliveries[0]?.body.resetUrl)).searchParams.get('token');
      assert.ok(resetToken);
      assert.equal((forgot.json() as { resetToken: string }).resetToken, resetToken);

      const reset = await app.inject({
        method: 'POST',
        url: '/v1/auth/reset-password',
        payload: {
          token: resetToken,
          newPassword: 'coach-webhook-reset-123',
        },
      });
      assert.equal(reset.statusCode, 204);

      const unknown = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: {
          email: 'missing.user@clubroom.demo',
        },
      });
      assert.equal(unknown.statusCode, 204);
      assert.equal(deliveries.length, 1);

      const auditEvents = asRows(getMarketplaceSeedStore().tables.auditEvents);
      const passwordResetAudits = auditEvents.filter(
        (row) => asString(row.action) === 'auth.password_reset_requested',
      );
      assert.ok(
        passwordResetAudits.some(
          (row) =>
            asString(row.result) === 'SUCCESS' &&
            (row.metadataJson as { deliveryStatus?: string } | undefined)?.deliveryStatus ===
              'sent',
        ),
      );
      assert.doesNotMatch(
        JSON.stringify(passwordResetAudits),
        /amelia\.shaw@clubroom\.demo|missing\.user@clubroom\.demo/,
      );
    } finally {
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = previousWebhookUrl;
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = previousWebhookSecret;
      env.API_PASSWORD_RESET_EMAIL_FROM = previousFrom;
      env.API_PASSWORD_RESET_LINK_BASE = previousLinkBase;
      if (previousEcho == null) {
        delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
      } else {
        process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = previousEcho;
      }
      await new Promise<void>((resolve, reject) => {
        deliveryServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('delivers password reset links through the configured Brevo API endpoint', async () => {
    const deliveries: {
      apiKey?: string | string[];
      body: Record<string, unknown>;
    }[] = [];
    const deliveryServer = http.createServer((req, res) => {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => {
        raw += chunk;
      });
      req.on('end', () => {
        deliveries.push({
          apiKey: req.headers['api-key'],
          body: raw ? (JSON.parse(raw) as Record<string, unknown>) : {},
        });
        res.statusCode = 201;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ messageId: 'brevo-message-1' }));
      });
    });

    await new Promise<void>((resolve) => deliveryServer.listen(0, '127.0.0.1', resolve));
    const address = deliveryServer.address() as AddressInfo;
    const previousWebhookUrl = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL;
    const previousBrevoKey = env.API_PASSWORD_RESET_BREVO_API_KEY;
    const previousBrevoEndpoint = env.API_PASSWORD_RESET_BREVO_ENDPOINT;
    const previousFrom = env.API_PASSWORD_RESET_EMAIL_FROM;
    const previousLinkBase = env.API_PASSWORD_RESET_LINK_BASE;
    const previousSmtpHost = env.API_PASSWORD_RESET_SMTP_HOST;
    const previousSmtpUsername = env.API_PASSWORD_RESET_SMTP_USERNAME;
    const previousSmtpPassword = env.API_PASSWORD_RESET_SMTP_PASSWORD;
    const previousEcho = process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;

    env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = undefined;
    env.API_PASSWORD_RESET_BREVO_API_KEY = 'brevo-api-key';
    env.API_PASSWORD_RESET_BREVO_ENDPOINT = `http://127.0.0.1:${address.port}/v3/smtp/email`;
    env.API_PASSWORD_RESET_EMAIL_FROM = 'Clubroom Support <support@clubroom.test>';
    env.API_PASSWORD_RESET_LINK_BASE = 'https://app.clubroom.test/reset-password';
    env.API_PASSWORD_RESET_SMTP_HOST = undefined;
    env.API_PASSWORD_RESET_SMTP_USERNAME = undefined;
    env.API_PASSWORD_RESET_SMTP_PASSWORD = undefined;
    delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;

    try {
      const forgot = await app.inject({
        method: 'POST',
        url: '/v1/auth/forgot-password',
        payload: {
          email: 'amelia.shaw@clubroom.demo',
        },
      });
      assert.equal(forgot.statusCode, 204);
      assert.equal(forgot.body, '');
      assert.equal(deliveries.length, 1);
      assert.equal(deliveries[0]?.apiKey, 'brevo-api-key');
      assert.deepEqual(deliveries[0]?.body.sender, {
        email: 'support@clubroom.test',
        name: 'Clubroom Support',
      });
      assert.deepEqual(deliveries[0]?.body.to, [{ email: 'amelia.shaw@clubroom.demo' }]);
      assert.equal(deliveries[0]?.body.subject, 'Reset your Clubroom password');
      assert.match(
        String(deliveries[0]?.body.textContent),
        /https:\/\/app\.clubroom\.test\/reset-password\?token=/,
      );

      const auditEvents = asRows(getMarketplaceSeedStore().tables.auditEvents);
      assert.ok(
        auditEvents.some(
          (row) =>
            asString(row.action) === 'auth.password_reset_requested' &&
            asString(row.result) === 'SUCCESS' &&
            (row.metadataJson as { deliveryProvider?: string } | undefined)?.deliveryProvider ===
              'brevo_api',
        ),
      );
    } finally {
      env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL = previousWebhookUrl;
      env.API_PASSWORD_RESET_BREVO_API_KEY = previousBrevoKey;
      env.API_PASSWORD_RESET_BREVO_ENDPOINT = previousBrevoEndpoint;
      env.API_PASSWORD_RESET_EMAIL_FROM = previousFrom;
      env.API_PASSWORD_RESET_LINK_BASE = previousLinkBase;
      env.API_PASSWORD_RESET_SMTP_HOST = previousSmtpHost;
      env.API_PASSWORD_RESET_SMTP_USERNAME = previousSmtpUsername;
      env.API_PASSWORD_RESET_SMTP_PASSWORD = previousSmtpPassword;
      if (previousEcho == null) {
        delete process.env.API_PASSWORD_RESET_TOKEN_RESPONSE;
      } else {
        process.env.API_PASSWORD_RESET_TOKEN_RESPONSE = previousEcho;
      }
      await new Promise<void>((resolve, reject) => {
        deliveryServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
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

  it('keeps scaffold auth header override disabled by default outside tests', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    const runtimeApp = buildApp();

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
    } finally {
      if (previousNodeEnv == null) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previousNodeEnv;
      }
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
      res.end(
        JSON.stringify({
          keys: [
            {
              ...publicJwk,
              alg: 'RS256',
              kid: 'test-key',
              use: 'sig',
            },
          ],
        }),
      );
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
      const header = encodeBase64Url(
        JSON.stringify({
          alg: 'RS256',
          kid: 'test-key',
          typ: 'JWT',
        }),
      );
      const payload = encodeBase64Url(
        JSON.stringify({
          aud: 'clubroom-mobile',
          exp: nowSec + 300,
          iat: nowSec,
          iss: issuer,
          sub: 'auth0|coach-amelia',
        }),
      );
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
