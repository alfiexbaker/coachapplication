import { env } from '@clubroom/config';
import { sendSmtpMail } from './smtp-client.js';

export type PasswordResetDeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface PasswordResetDeliveryResult {
  provider: 'webhook' | 'brevo_api' | 'smtp' | 'dev_outbox' | 'none';
  status: PasswordResetDeliveryStatus;
  error?: string;
}

interface PasswordResetDeliveryInput {
  email: string;
  expiresAt: string;
  requestId?: string;
  resetToken: string;
}

function withResetToken(base: string, token: string): string {
  try {
    const url = new URL(base);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}token=${encodeURIComponent(token)}`;
  }
}

function timeoutSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref();
  return controller.signal;
}

function extractAddress(value: string): string {
  const match = /<([^>]+)>/.exec(value);
  return (match?.[1] ?? value).trim();
}

function extractName(value: string): string | undefined {
  const match = /^(.*?)<[^>]+>$/.exec(value.trim());
  const name = match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  return name || undefined;
}

function hasBrevoApiConfig(): boolean {
  return Boolean(
    env.API_PASSWORD_RESET_BREVO_API_KEY?.trim() && env.API_PASSWORD_RESET_EMAIL_FROM?.trim(),
  );
}

function hasSmtpConfig(): boolean {
  return Boolean(
    env.API_PASSWORD_RESET_SMTP_HOST?.trim() &&
      env.API_PASSWORD_RESET_SMTP_USERNAME?.trim() &&
      env.API_PASSWORD_RESET_SMTP_PASSWORD?.trim() &&
      env.API_PASSWORD_RESET_EMAIL_FROM?.trim(),
  );
}

export async function deliverPasswordResetEmail(
  input: PasswordResetDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  const resetUrl = withResetToken(env.API_PASSWORD_RESET_LINK_BASE, input.resetToken);
  const webhookUrl = env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL?.trim();

  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET
            ? { authorization: `Bearer ${env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify({
          type: 'password_reset',
          to: input.email,
          from: env.API_PASSWORD_RESET_EMAIL_FROM ?? undefined,
          resetUrl,
          expiresAt: input.expiresAt,
          requestId: input.requestId,
        }),
        signal: timeoutSignal(env.API_PASSWORD_RESET_EMAIL_TIMEOUT_MS),
      });
      if (!response.ok) {
        return {
          provider: 'webhook',
          status: 'failed',
          error: `Password reset email webhook returned ${response.status}`,
        };
      }
      return { provider: 'webhook', status: 'sent' };
    } catch (error) {
      return {
        provider: 'webhook',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Password reset email delivery failed',
      };
    }
  }

  if (hasBrevoApiConfig()) {
    const from = env.API_PASSWORD_RESET_EMAIL_FROM as string;
    try {
      const response = await fetch(env.API_PASSWORD_RESET_BREVO_ENDPOINT, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': env.API_PASSWORD_RESET_BREVO_API_KEY as string,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            email: extractAddress(from),
            ...(extractName(from) ? { name: extractName(from) } : {}),
          },
          to: [{ email: input.email }],
          subject: 'Reset your Clubroom password',
          textContent: [
            'A password reset was requested for your Clubroom account.',
            '',
            `Reset your password: ${resetUrl}`,
            `This link expires at: ${input.expiresAt}`,
            '',
            'If you did not request this reset, ignore this email.',
          ].join('\n'),
        }),
        signal: timeoutSignal(env.API_PASSWORD_RESET_EMAIL_TIMEOUT_MS),
      });
      if (!response.ok) {
        return {
          provider: 'brevo_api',
          status: 'failed',
          error: `Password reset Brevo API returned ${response.status}`,
        };
      }
      return { provider: 'brevo_api', status: 'sent' };
    } catch (error) {
      return {
        provider: 'brevo_api',
        status: 'failed',
        error:
          error instanceof Error ? error.message : 'Password reset Brevo API delivery failed',
      };
    }
  }

  if (hasSmtpConfig()) {
    try {
      await sendSmtpMail(
        {
          host: env.API_PASSWORD_RESET_SMTP_HOST as string,
          port: env.API_PASSWORD_RESET_SMTP_PORT,
          username: env.API_PASSWORD_RESET_SMTP_USERNAME as string,
          password: env.API_PASSWORD_RESET_SMTP_PASSWORD as string,
          secure: env.API_PASSWORD_RESET_SMTP_SECURE,
          timeoutMs: env.API_PASSWORD_RESET_EMAIL_TIMEOUT_MS,
        },
        {
          from: env.API_PASSWORD_RESET_EMAIL_FROM as string,
          to: input.email,
          subject: 'Reset your Clubroom password',
          text: [
            'A password reset was requested for your Clubroom account.',
            '',
            `Reset your password: ${resetUrl}`,
            `This link expires at: ${input.expiresAt}`,
            '',
            'If you did not request this reset, ignore this email.',
          ].join('\n'),
        },
      );
      return { provider: 'smtp', status: 'sent' };
    } catch (error) {
      return {
        provider: 'smtp',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Password reset SMTP delivery failed',
      };
    }
  }

  if (env.API_PASSWORD_RESET_DEV_OUTBOX) {
    console.info(
      JSON.stringify({
        event: 'password_reset_dev_outbox',
        to: input.email,
        resetUrl,
        expiresAt: input.expiresAt,
      }),
    );
    return { provider: 'dev_outbox', status: 'sent' };
  }

  return {
    provider: 'none',
    status: env.NODE_ENV === 'production' ? 'failed' : 'skipped',
    error:
      env.NODE_ENV === 'production'
        ? 'Password reset email delivery is not configured'
        : undefined,
  };
}
