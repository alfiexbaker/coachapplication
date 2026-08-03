import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import errorHandlerPlugin from './error-handler.js';

test('maps Fastify empty JSON body errors to a 400 problem response', async () => {
  const app = Fastify({ logger: false });
  await app.register(errorHandlerPlugin);
  app.delete('/bodyless', async () => ({ ok: true }));

  const response = await app.inject({
    method: 'DELETE',
    url: '/bodyless',
    headers: {
      'content-type': 'application/json',
    },
    payload: '',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers['content-type']?.includes('application/problem+json'), true);
  assert.equal(response.json().code, 'VALIDATION_FAILED');

  await app.close();
});

test('maps Zod errors from another package instance to a 400 problem response', async () => {
  const app = Fastify({ logger: false });
  await app.register(errorHandlerPlugin);
  app.post('/foreign-zod', async () => {
    const error = new Error('Foreign Zod validation failed') as Error & {
      issues: Array<{ code: string; message: string; path: string[] }>;
    };
    error.name = 'ZodError';
    error.issues = [
      {
        code: 'invalid_type',
        message: 'Required',
        path: ['status'],
      },
    ];
    throw error;
  });

  const response = await app.inject({
    method: 'POST',
    url: '/foreign-zod',
  });

  assert.equal(response.statusCode, 400);
  assert.equal(response.headers['content-type']?.includes('application/problem+json'), true);
  assert.equal(response.json().code, 'VALIDATION_FAILED');
  assert.deepEqual(response.json().issues, [
    {
      code: 'invalid_type',
      message: 'Required',
      path: ['status'],
    },
  ]);

  await app.close();
});
