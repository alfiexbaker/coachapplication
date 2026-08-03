import { env } from '@clubroom/config';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import {
  getDbFixtureStore,
  resetDbFixtureStoreForTests,
} from '../../lib/db-fixture-store.js';
import { ApiProblemError } from '../../lib/http-errors.js';

const originalBackend = env.API_DATA_BACKEND;
const originalDatabaseUrl = env.DATABASE_URL;

afterEach(() => {
  env.API_DATA_BACKEND = originalBackend;
  env.DATABASE_URL = originalDatabaseUrl;
  resetDbFixtureStoreForTests();
});

describe('DB fixture authority boundary', () => {
  it('allows the explicit database-free test fallback', () => {
    env.API_DATA_BACKEND = 'db';
    env.DATABASE_URL = undefined;

    assert.ok(getDbFixtureStore().version);
  });

  it('rejects fixture access when db mode has live Prisma configuration', () => {
    env.API_DATA_BACKEND = 'seed';
    env.DATABASE_URL = undefined;
    getDbFixtureStore();

    env.API_DATA_BACKEND = 'db';
    env.DATABASE_URL = 'postgresql://fixture-boundary.invalid/clubroom';

    assert.throws(
      () => getDbFixtureStore(),
      (error: unknown) => {
        assert.ok(error instanceof ApiProblemError);
        assert.equal(error.status, 503);
        assert.equal(error.code, 'SERVICE_UNAVAILABLE');
        assert.equal(error.message, 'DB fixture fallback is disabled');
        return true;
      },
    );
  });
});
