import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

const preflight = require(path.join(process.cwd(), 'scripts/db-staging-preflight.js')) as {
  buildSupabaseAccessPostureIssues: (posture: {
    checked: boolean;
    directRoleGrants: Array<{
      grantee: string;
      objectName: string;
      objectType: string;
      privilegeType: string;
      schemaName: string;
    }>;
    rlsDisabledTables: Array<{
      schemaName: string;
      tableName: string;
    }>;
  }) => Array<{
    action: string;
    id: string;
    message: string;
    status: string;
    value: string;
  }>;
  classifyDatabaseSchemaError: (error: unknown) => {
    action: string;
    id: string;
    message: string;
    value: string;
  };
};

describe('db staging preflight diagnostics', () => {
  it('classifies Supabase session-pool exhaustion with an actionable release step', () => {
    const result = preflight.classifyDatabaseSchemaError(
      new Error(
        'Invalid `prisma.$queryRaw()` invocation: FATAL: (EMAXCONNSESSION) max clients reached in session mode - max clients are limited to pool_size: 15',
      ),
    );

    assert.equal(result.id, 'db:schema-check:session-pool-exhausted');
    assert.match(result.message, /session pool is exhausted/i);
    assert.match(result.action, /Stop local staging API\/dev servers/);
    assert.match(result.action, /transaction pooler/);
    assert.match(result.value, /EMAXCONNSESSION/);
  });

  it('keeps generic schema-check guidance for non-pool errors', () => {
    const result = preflight.classifyDatabaseSchemaError(
      new Error('relation "_prisma_migrations" does not exist'),
    );

    assert.equal(result.id, 'db:schema-check');
    assert.match(result.action, /Verify DATABASE_URL/);
    assert.match(result.value, /_prisma_migrations/);
  });

  it('blocks release-style staging when public RLS or direct role grants regress', () => {
    const issues = preflight.buildSupabaseAccessPostureIssues({
      checked: true,
      rlsDisabledTables: [
        {
          schemaName: 'public',
          tableName: 'Athlete',
        },
      ],
      directRoleGrants: [
        {
          grantee: 'authenticated',
          objectType: 'table',
          schemaName: 'public',
          objectName: 'Athlete',
          privilegeType: 'SELECT',
        },
      ],
    });

    assert.equal(issues.length, 2);
    assert.equal(issues.every((issue) => issue.status === 'blocker'), true);
    assert.equal(issues[0]?.id, 'db:rls:public.Athlete');
    assert.equal(
      issues[1]?.id,
      'db:direct-grant:authenticated:table:public.Athlete:SELECT',
    );
    assert.match(issues[1]?.action ?? '', /Fastify \/v1 API/);
  });
});
