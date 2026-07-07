import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildApp } from '../../app.js';

describe('API security hardening', () => {
  it('sets baseline security headers on v1 responses', async () => {
    const app = buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/v1/health',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['referrer-policy'], 'no-referrer');
    assert.match(String(response.headers['content-security-policy']), /default-src 'none'/);
    assert.match(String(response.headers['permissions-policy']), /camera=\(\)/);

    await app.close();
  });

  it('rate limits by client IP when enabled', async () => {
    const app = buildApp({
      rateLimit: {
        max: 2,
        windowMs: 60_000,
      },
    });

    const first = await app.inject({ method: 'GET', url: '/v1/health' });
    const second = await app.inject({ method: 'GET', url: '/v1/health' });
    const third = await app.inject({ method: 'GET', url: '/v1/health' });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(third.statusCode, 429);
    assert.equal(third.headers['ratelimit-limit'], '2');
    assert.equal(third.headers['ratelimit-remaining'], '0');
    assert.equal(third.headers['retry-after'], '60');

    const payload = third.json() as { code: string; status: number };
    assert.equal(payload.status, 429);
    assert.equal(payload.code, 'RATE_LIMITED');

    await app.close();
  });

  it('uses forwarded client IP for rate limits when proxy trust is enabled', async () => {
    const app = buildApp({
      trustProxy: true,
      rateLimit: {
        max: 1,
        windowMs: 60_000,
      },
    });

    const firstClient = { 'x-forwarded-for': '203.0.113.10, 10.0.0.1' };
    const secondClient = { 'x-forwarded-for': '203.0.113.20, 10.0.0.1' };

    const first = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: firstClient,
    });
    const second = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: secondClient,
    });
    const firstAgain = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: firstClient,
    });

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(firstAgain.statusCode, 429);
    assert.equal(firstAgain.headers['ratelimit-limit'], '1');
    assert.equal(firstAgain.headers['ratelimit-remaining'], '0');

    await app.close();
  });
});
