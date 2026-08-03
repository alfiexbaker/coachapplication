import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

type SupabaseDataApiPosture = {
  checked: boolean;
  disabledForPublicClients: boolean;
  endpoint: string | null;
  errorCode: string | null;
  reason: string;
  statusCode: number | null;
};

const disabledDataApiPosture: SupabaseDataApiPosture = {
  checked: true,
  disabledForPublicClients: true,
  endpoint: 'https://example.supabase.co/rest/v1/',
  errorCode: 'UNAUTHORIZED_INVALID_API_KEY_TYPE',
  reason: 'public-client-keys-rejected',
  statusCode: 401,
};

const unverifiedDataApiPosture: SupabaseDataApiPosture = {
  checked: true,
  disabledForPublicClients: false,
  endpoint: 'https://example.supabase.co/rest/v1/',
  errorCode: null,
  reason: 'public-client-request-not-rejected',
  statusCode: 200,
};

const preflight = require(path.join(process.cwd(), 'scripts/db-staging-preflight.js')) as {
  REQUIRED_ENV: Array<{
    expected?: string;
    key: string;
    message: string;
    severity: string;
  }>;
  buildSupabaseAccessPostureIssues: (posture: {
    checked: boolean;
    dataApi: SupabaseDataApiPosture;
    directRoleGrants: Array<{
      grantee: string;
      objectName: string;
      objectType: string;
      privilegeType: string;
      schemaName: string;
    }>;
    defaultRoleGrants: Array<{
      grantee: string;
      objectType: string;
      ownerRole: string;
      privilegeType: string;
      schemaName: string;
    }>;
    databasePrincipal?: {
      checked: boolean;
      currentUser: string | null;
      sessionUser: string | null;
      databaseName: string | null;
      schemaName: string | null;
      canAlterSupabaseAdminDefaultPrivileges: boolean;
      canAlterPostgresDefaultPrivileges: boolean;
    };
    serviceRoleDirectGrantCount?: number;
    serviceRoleDefaultGrants?: Array<{
      grantee: string;
      objectType: string;
      ownerRole: string;
      privilegeType: string;
      schemaName: string;
    }>;
    securityDefinerFunctions: Array<{
      owner: string;
      schemaName: string;
      signature: string;
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
  checkSupabaseDataApiPosture: (options: {
    fetchImpl: typeof fetch;
    projectUrl: string;
    publishableKey: string;
    timeoutMs?: number;
  }) => Promise<SupabaseDataApiPosture>;
  classifyDatabaseSchemaError: (error: unknown) => {
    action: string;
    id: string;
    message: string;
    value: string;
  };
  checkEnvRule: (rule: {
    expected?: string;
    key: string;
    message: string;
    severity: string;
  }) => Array<{
    action: string;
    id: string;
    message: string;
    status: string;
    value: string;
  }>;
  checkSecretFileMode: (rule: { path: string; message: string; severity: string }) => Array<{
    action: string;
    id: string;
    message: string;
    status: string;
    value: string;
  }>;
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
      dataApi: disabledDataApiPosture,
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
      defaultRoleGrants: [],
      securityDefinerFunctions: [],
    });

    assert.equal(issues.length, 2);
    assert.equal(
      issues.every((issue) => issue.status === 'blocker'),
      true,
    );
    assert.equal(issues[0]?.id, 'db:rls:public.Athlete');
    assert.equal(issues[1]?.id, 'db:direct-grant:authenticated:table:public.Athlete:SELECT');
    assert.match(issues[1]?.action ?? '', /revoke-supabase-default-grants\.sql/);
    assert.match(issues[1]?.action ?? '', /PUBLIC/);
  });

  it('blocks unverified Data API access and default privileges that would expose future objects', () => {
    const issues = preflight.buildSupabaseAccessPostureIssues({
      checked: true,
      dataApi: unverifiedDataApiPosture,
      databasePrincipal: {
        checked: true,
        currentUser: 'postgres',
        sessionUser: 'postgres',
        databaseName: 'postgres',
        schemaName: 'public',
        canAlterSupabaseAdminDefaultPrivileges: false,
        canAlterPostgresDefaultPrivileges: true,
      },
      rlsDisabledTables: [],
      directRoleGrants: [],
      defaultRoleGrants: [
        {
          ownerRole: 'supabase_admin',
          grantee: 'PUBLIC',
          objectType: 'table',
          schemaName: 'public',
          privilegeType: 'SELECT',
        },
        {
          ownerRole: 'supabase_admin',
          grantee: 'authenticated',
          objectType: 'routine',
          schemaName: 'all-schemas',
          privilegeType: 'EXECUTE',
        },
      ],
      securityDefinerFunctions: [],
    });

    assert.equal(issues.length, 3);
    assert.equal(
      issues.every((issue) => issue.status === 'blocker'),
      true,
    );
    assert.equal(issues[0]?.id, 'db:data-api-public-client-boundary');
    assert.equal(issues[1]?.id, 'db:default-grant:supabase_admin:PUBLIC:table:public:SELECT');
    assert.match(issues[1]?.message ?? '', /Future table objects/);
    assert.match(issues[1]?.action ?? '', /revoke-supabase-default-grants\.sql/);
    assert.match(
      issues[1]?.action ?? '',
      /Current database role postgres cannot alter supabase_admin default privileges/,
    );
    assert.equal(
      issues[2]?.id,
      'db:default-grant:supabase_admin:authenticated:routine:all-schemas:EXECUTE',
    );
  });

  it('treats latent default grants as warnings only while public Data API clients are rejected', () => {
    const issues = preflight.buildSupabaseAccessPostureIssues({
      checked: true,
      dataApi: disabledDataApiPosture,
      rlsDisabledTables: [],
      directRoleGrants: [],
      defaultRoleGrants: [
        {
          ownerRole: 'supabase_admin',
          grantee: 'authenticated',
          objectType: 'table',
          schemaName: 'public',
          privilegeType: 'SELECT',
        },
      ],
      securityDefinerFunctions: [],
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.status, 'warning');
    assert.match(issues[0]?.action ?? '', /Keep the Supabase Data API disabled/);
  });

  it('reports service_role authority separately from client-role blockers', () => {
    const issues = preflight.buildSupabaseAccessPostureIssues({
      checked: true,
      dataApi: disabledDataApiPosture,
      rlsDisabledTables: [],
      directRoleGrants: [],
      defaultRoleGrants: [],
      serviceRoleDirectGrantCount: 992,
      serviceRoleDefaultGrants: [
        {
          ownerRole: 'postgres',
          grantee: 'service_role',
          objectType: 'routine',
          schemaName: 'public',
          privilegeType: 'EXECUTE',
        },
      ],
      securityDefinerFunctions: [],
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.id, 'db:trusted-service-role-authority');
    assert.equal(issues[0]?.status, 'warning');
    assert.equal(issues[0]?.value, 'direct=992, future=1');
    assert.match(issues[0]?.action ?? '', /Keep the service-role key out of all client bundles/);
  });

  it('blocks security-definer functions in the exposed public schema', () => {
    const issues = preflight.buildSupabaseAccessPostureIssues({
      checked: true,
      dataApi: disabledDataApiPosture,
      rlsDisabledTables: [],
      directRoleGrants: [],
      defaultRoleGrants: [],
      securityDefinerFunctions: [
        {
          signature: 'rls_auto_enable()',
          schemaName: 'public',
          owner: 'postgres',
        },
      ],
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.id, 'db:security-definer:rls_auto_enable()');
    assert.equal(issues[0]?.status, 'blocker');
    assert.match(issues[0]?.message ?? '', /exposed public schema/);
    assert.match(issues[0]?.action ?? '', /Move the function to a private schema/);
  });

  it('accepts only the disabled Data API response and never returns the publishable key', async () => {
    const publishableKey = 'sb_publishable_test-only-value';
    const result = await preflight.checkSupabaseDataApiPosture({
      projectUrl: 'https://example.supabase.co',
      publishableKey,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            code: 'UNAUTHORIZED_INVALID_API_KEY_TYPE',
            message: 'Secret API key required',
            hint: 'Only secret API keys can be used for this endpoint.',
          }),
          {
            status: 401,
            headers: { 'sb-error-code': 'UNAUTHORIZED_INVALID_API_KEY_TYPE' },
          },
        ),
    });

    assert.equal(result.checked, true);
    assert.equal(result.disabledForPublicClients, true);
    assert.equal(result.reason, 'public-client-keys-rejected');
    assert.equal(result.statusCode, 401);
    assert.doesNotMatch(JSON.stringify(result), new RegExp(publishableKey));
  });

  it('fails closed when the Data API accepts the key or the probe errors', async () => {
    const accepted = await preflight.checkSupabaseDataApiPosture({
      projectUrl: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test-only-value',
      fetchImpl: async () => new Response('{}', { status: 200 }),
    });
    const invalidKey = await preflight.checkSupabaseDataApiPosture({
      projectUrl: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test-only-value',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            code: 'UNAUTHORIZED_INVALID_API_KEY',
            message: 'Invalid API key',
          }),
          { status: 401 },
        ),
    });
    const failed = await preflight.checkSupabaseDataApiPosture({
      projectUrl: 'https://example.supabase.co',
      publishableKey: 'sb_publishable_test-only-value',
      fetchImpl: async () => {
        throw new Error('network unavailable');
      },
    });

    assert.equal(accepted.checked, true);
    assert.equal(accepted.disabledForPublicClients, false);
    assert.equal(accepted.reason, 'public-client-request-not-rejected');
    assert.equal(invalidKey.checked, true);
    assert.equal(invalidKey.disabledForPublicClients, false);
    assert.equal(invalidKey.reason, 'unexpected-rejection');
    assert.equal(failed.checked, false);
    assert.equal(failed.disabledForPublicClients, false);
    assert.equal(failed.reason, 'probe-failed');
  });

  it('checks PUBLIC direct grants and ships the privileged Supabase default-grant remediation SQL', () => {
    const preflightSource = fs.readFileSync('scripts/db-staging-preflight.js', 'utf8');
    const migrationAuditSource = fs.readFileSync('scripts/audit-db-migrations.js', 'utf8');
    const moveRlsFunctionMigration = fs.readFileSync(
      'packages/db/prisma/migrations/20260715204500_move_rls_event_trigger_function_private/migration.sql',
      'utf8',
    );
    const remediationSql = fs.readFileSync(
      'scripts/sql/revoke-supabase-default-grants.sql',
      'utf8',
    );
    const postgresRemediationSql = fs.readFileSync(
      'scripts/sql/revoke-postgres-default-grants.sql',
      'utf8',
    );

    assert.doesNotMatch(preflightSource, /information_schema\.role_(?:table|usage|routine)_grants/);
    assert.match(preflightSource, /aclexplode\(/);
    assert.match(preflightSource, /acldefault\('f', routine\.proowner\)/);
    assert.match(preflightSource, /COALESCE\(\s*global_default\.defaclacl,\s*acldefault\(/);
    assert.match(preflightSource, /IN \('anon', 'authenticated', 'service_role', 'PUBLIC'\)/);
    assert.match(preflightSource, /p\.prosecdef IS TRUE/);
    assert.match(preflightSource, /current_user AS "currentUser"/);
    assert.match(
      preflightSource,
      /pg_has_role\(current_user, 'supabase_admin', 'USAGE'\) AS "canAlterSupabaseAdminDefaultPrivileges"/,
    );
    assert.match(
      preflightSource,
      /pg_has_role\(current_user, 'postgres', 'USAGE'\) AS "canAlterPostgresDefaultPrivileges"/,
    );
    assert.match(migrationAuditSource, /PUBLIC\)\(\?:\\s\|;\)/);
    assert.match(migrationAuditSource, /publicSecurityDefinerFunctions/);
    assert.match(
      moveRlsFunctionMigration,
      /ALTER FUNCTION public\.rls_auto_enable\(\) SET SCHEMA private/,
    );
    assert.match(
      moveRlsFunctionMigration,
      /REVOKE ALL ON FUNCTION private\.rls_auto_enable\(\) FROM anon, authenticated, PUBLIC/,
    );
    assert.match(remediationSql, /^BEGIN;/m);
    assert.match(remediationSql, /pg_has_role\(current_user, 'supabase_admin', 'USAGE'\)/);
    assert.match(remediationSql, /FROM anon, authenticated, PUBLIC;/);
    assert.doesNotMatch(remediationSql, /FROM anon, authenticated, service_role, PUBLIC;/);
    assert.match(remediationSql, /remaining_default_grants/);
    assert.match(remediationSql, /^COMMIT;/m);
    assert.match(postgresRemediationSql, /^BEGIN;/m);
    assert.match(postgresRemediationSql, /ALTER DEFAULT PRIVILEGES FOR ROLE postgres/);
    assert.doesNotMatch(postgresRemediationSql, /FROM anon, authenticated, service_role, PUBLIC;/);
    assert.match(postgresRemediationSql, /remaining_default_grants/);
    assert.match(postgresRemediationSql, /^COMMIT;/m);
  });

  it('blocks release-style staging reset-token echo config', () => {
    const source = fs.readFileSync('scripts/db-staging-preflight.js', 'utf8');

    assert.match(source, /key: 'API_PASSWORD_RESET_TOKEN_RESPONSE'/);
    assert.match(source, /Password reset token responses must not be enabled/);
    assert.match(source, /token echo is test\/dev-outbox only/);
  });

  it('blocks group-readable local secret artifacts', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clubroom-secret-mode-'));
    const secretPath = path.join(tempDir, '.env.local');

    fs.writeFileSync(secretPath, 'DATABASE_URL=postgres://example\n', { mode: 0o644 });
    fs.chmodSync(secretPath, 0o644);

    const issues = preflight.checkSecretFileMode({
      path: secretPath,
      severity: 'blocker',
      message: 'Local secret artifacts must be owner-readable only.',
    });

    assert.equal(issues.length, 1);
    assert.equal(issues[0]?.status, 'blocker');
    assert.match(issues[0]?.id ?? '', /file-mode:/);
    assert.equal(issues[0]?.value, '0o644');
    assert.match(issues[0]?.action ?? '', /chmod 600/);

    fs.chmodSync(secretPath, 0o600);
    assert.deepEqual(
      preflight.checkSecretFileMode({
        path: secretPath,
        severity: 'blocker',
        message: 'Local secret artifacts must be owner-readable only.',
      }),
      [],
    );
  });

  it('requires explicit simulated payment provider until real provider cutover', () => {
    const providerRule = preflight.REQUIRED_ENV.find((rule) => rule.key === 'API_PAYMENT_PROVIDER');

    assert.ok(providerRule);
    assert.equal(providerRule.expected, 'simulated');
    assert.match(providerRule.message, /explicitly simulated/i);

    const original = process.env.API_PAYMENT_PROVIDER;
    try {
      delete process.env.API_PAYMENT_PROVIDER;
      const missing = preflight.checkEnvRule(providerRule);
      assert.equal(missing[0]?.id, 'env:API_PAYMENT_PROVIDER');
      assert.equal(missing[0]?.status, 'blocker');

      process.env.API_PAYMENT_PROVIDER = 'stripe';
      const unsupported = preflight.checkEnvRule(providerRule);
      assert.equal(unsupported[0]?.id, 'env:API_PAYMENT_PROVIDER');
      assert.match(unsupported[0]?.message ?? '', /should be simulated/i);

      process.env.API_PAYMENT_PROVIDER = 'simulated';
      assert.deepEqual(preflight.checkEnvRule(providerRule), []);
    } finally {
      if (original === undefined) {
        delete process.env.API_PAYMENT_PROVIDER;
      } else {
        process.env.API_PAYMENT_PROVIDER = original;
      }
    }
  });
});
