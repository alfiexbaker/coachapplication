import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { buildApp } from '../../app.js';

const app = buildApp();

after(async () => {
  await app.close();
});

describe('meta documentation routes', () => {
  it('serves the generated OpenAPI document at /v1/openapi.json', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/openapi.json',
    });

    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /application\/json/);

    const payload = res.json() as {
      openapi: string;
      info: { description?: string };
      tags: Array<{ name: string }>;
      paths: Record<string, Record<string, unknown>>;
      components: { securitySchemes: Record<string, unknown> };
    };
    const badgeSeen = payload.paths['/v1/badge-awards/{awardId}/seen']?.post as
      | { operationId?: string; summary?: string }
      | undefined;
    const videoAnnotationUpdate = payload.paths['/v1/videos/{videoId}/annotations/{annotationId}']
      ?.patch as { operationId?: string; summary?: string } | undefined;
    const videoArchive = payload.paths['/v1/videos/{videoId}']?.delete as
      | { operationId?: string; summary?: string; 'x-clubroom-effect'?: string }
      | undefined;
    const operations = Object.values(payload.paths).flatMap((pathItem) =>
      Object.values(pathItem) as Array<{ operationId?: string }>,
    );
    const deleteOperations = Object.values(payload.paths).flatMap((pathItem) =>
      Object.entries(pathItem).flatMap(([method, operation]) =>
        method === 'delete'
          ? [
              operation as {
                operationId?: string;
                summary?: string;
                'x-clubroom-effect'?: string;
              },
            ]
          : [],
      ),
    );
    const operationIds = operations.flatMap((operation) =>
      operation.operationId ? [operation.operationId] : [],
    );

    assert.equal(payload.openapi, '3.1.0');
    assert.match(payload.info.description ?? '', /OpenAPI 3\.1/);
    assert.match(payload.info.description ?? '', /Google AIP conformance is not claimed/);
    assert.match(payload.info.description ?? '', /x-clubroom-effect/);
    assert.equal(payload.tags.some((tag) => tag.name === 'API'), false);
    assert.ok(payload.components.securitySchemes.bearerAuth);
    assert.ok(payload.paths['/v1/auth/login']?.post);
    assert.ok(payload.paths['/v1/auth/me']?.get);
    assert.ok(payload.paths['/v1/athletes/{athleteId}/self-assessments']?.get);
    assert.equal(badgeSeen?.operationId, 'markBadgeAwardSeen');
    assert.equal(badgeSeen?.summary, 'Mark Badge Award Seen');
    assert.equal(videoAnnotationUpdate?.operationId, 'updateVideoAnnotation');
    assert.equal(videoAnnotationUpdate?.summary, 'Update Video Annotation');
    assert.equal(videoArchive?.operationId, 'archiveVideo');
    assert.equal(videoArchive?.summary, 'Archive Video');
    assert.equal(videoArchive?.['x-clubroom-effect'], 'archive');
    assert.equal(deleteOperations.length > 0, true);
    assert.equal(
      deleteOperations.every(
        (operation) =>
          Boolean(operation['x-clubroom-effect']) &&
          !String(operation.operationId ?? '').toLowerCase().includes('delete') &&
          !String(operation.summary ?? '').toLowerCase().includes('delete'),
      ),
      true,
    );
    assert.equal(operationIds.length, operations.length);
    assert.equal(new Set(operationIds).size, operationIds.length);
    assert.equal(
      operationIds.some((operationId) => /^(get|post|patch|put|delete)_v1_/.test(operationId)),
      false,
    );
    assert.deepEqual(
      (payload.paths['/v1/auth/login']?.post as { security?: unknown[] }).security,
      [],
    );
  });

  it('serves Swagger UI at /v1/docs', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/docs',
    });

    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /text\/html/);
    assert.match(res.body, /SwaggerUIBundle/);
    assert.match(res.body, /OpenAPI 3\.1 rendered with Swagger UI/);
    assert.match(res.body, /Google AIP conformance is not claimed/);
    assert.match(res.body, /x-clubroom-effect/);
    assert.match(res.body, /\/v1\/openapi\.json/);
  });

  it('hides OpenAPI documentation in production unless explicitly enabled', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalFlag = process.env.API_OPENAPI_ENABLED;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.API_OPENAPI_ENABLED;

      const disabled = await app.inject({
        method: 'GET',
        url: '/v1/openapi.json',
      });
      assert.equal(disabled.statusCode, 404);

      process.env.API_OPENAPI_ENABLED = '1';
      const enabled = await app.inject({
        method: 'GET',
        url: '/v1/openapi.json',
      });
      assert.equal(enabled.statusCode, 200);
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
      if (originalFlag === undefined) {
        delete process.env.API_OPENAPI_ENABLED;
      } else {
        process.env.API_OPENAPI_ENABLED = originalFlag;
      }
    }
  });
});
