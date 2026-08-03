import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';

const smoke = require(path.join(process.cwd(), 'scripts/password-reset-webhook-smoke.js')) as {
  buildDeliveryDiagnostics: (input: {
    webhookUrl?: string;
    webhookSecret?: string;
    smtpConfig: {
      host?: string;
      port: number;
      username?: string;
      password?: string;
      secure?: boolean;
    };
    from?: string;
    recipient?: string;
    timeoutMs: number;
  }) => unknown;
  classifySmtpFailure: (error: unknown) => { reason: string; action: string };
  redactReport: (report: Record<string, unknown>) => Record<string, unknown>;
};

describe('password reset smoke diagnostics', () => {
  it('redacts SMTP credentials while preserving actionable config shape', () => {
    const diagnostics = smoke.buildDeliveryDiagnostics({
      smtpConfig: {
        host: 'smtp-relay.brevo.com',
        port: 587,
        username: 'smtp-user@example.test',
        password: 'super-secret-smtp-key',
        secure: false,
      },
      from: 'support@example.test',
      recipient: 'smoke@example.test',
      timeoutMs: 5000,
    }) as {
      selectedProvider: string;
      smtp: {
        configured: boolean;
        host: string | null;
        port: number;
        secure: boolean;
        username: { configured: boolean; length: number; preview: string | null };
        password: { configured: boolean; length: number };
        from: string | null;
        smokeRecipient: string | null;
        missingRequired: string[];
      };
    };

    const serialized = JSON.stringify(diagnostics);
    assert.equal(diagnostics.selectedProvider, 'smtp');
    assert.equal(diagnostics.smtp.configured, true);
    assert.equal(diagnostics.smtp.host, 'smtp-relay.brevo.com');
    assert.equal(diagnostics.smtp.port, 587);
    assert.equal(diagnostics.smtp.secure, false);
    assert.equal(diagnostics.smtp.username.configured, true);
    assert.equal(diagnostics.smtp.password.configured, true);
    assert.equal(diagnostics.smtp.password.length, 'super-secret-smtp-key'.length);
    assert.deepEqual(diagnostics.smtp.missingRequired, []);
    assert.equal(serialized.includes('super-secret-smtp-key'), false);
    assert.equal(serialized.includes('smtp-user@example.test'), false);
    assert.equal(serialized.includes('support@example.test'), false);
    assert.equal(serialized.includes('smoke@example.test'), false);
  });

  it('classifies SMTP 535 auth failures with credential-specific action', () => {
    const classified = smoke.classifySmtpFailure(
      new Error('SMTP password failed with SMTP 535: 535 5.7.8 Authentication failed'),
    );

    assert.equal(classified.reason, 'auth_failed');
    assert.match(classified.action, /API_PASSWORD_RESET_SMTP_PASSWORD/);
    assert.match(classified.action, /Brevo SMTP settings/);
  });

  it('redacts top-level smoke recipient in shareable reports', () => {
    const report = smoke.redactReport({
      status: 'ready',
      provider: 'brevo_api',
      recipient: 'smoke-recipient@example.test',
    });

    const serialized = JSON.stringify(report);
    assert.equal(serialized.includes('smoke-recipient@example.test'), false);
    assert.equal(report.recipient, 'smok***@example.test');
  });

  it('reports missing SMTP required fields without secrets', () => {
    const diagnostics = smoke.buildDeliveryDiagnostics({
      smtpConfig: {
        port: 587,
      },
      timeoutMs: 5000,
    }) as {
      selectedProvider: string;
      smtp: { configured: boolean; missingRequired: string[] };
    };

    assert.equal(diagnostics.selectedProvider, 'none');
    assert.equal(diagnostics.smtp.configured, false);
    assert.deepEqual(diagnostics.smtp.missingRequired, [
      'API_PASSWORD_RESET_SMTP_HOST',
      'API_PASSWORD_RESET_SMTP_USERNAME',
      'API_PASSWORD_RESET_SMTP_PASSWORD',
      'API_PASSWORD_RESET_EMAIL_FROM',
    ]);
  });
});
