import { env } from '@clubroom/config';
import { sendSmtpMail } from './smtp-client.js';

export type PasswordResetDeliveryStatus = 'sent' | 'skipped' | 'failed';

export interface PasswordResetDeliveryResult {
  provider: 'webhook' | 'brevo_api' | 'smtp' | 'dev_outbox' | 'none';
  status: PasswordResetDeliveryStatus;
  error?: string;
}

type TransactionalDeliveryResult = PasswordResetDeliveryResult;

interface TransactionalEmailInput {
  to: string;
  subject: string;
  text: string;
  webhookPayload: Record<string, unknown>;
  devOutboxEvent: string;
  failureLabel: string;
}

interface PasswordResetDeliveryInput {
  email: string;
  expiresAt: string;
  requestId?: string;
  resetToken: string;
}

interface EmailVerificationDeliveryInput {
  code: string;
  email: string;
  expiresAt: string;
  requestId?: string;
}

interface ClubInviteDeliveryInput {
  email: string;
  clubName: string;
  invitedByLabel: string;
  role: string;
  requestId?: string;
}

interface InvoiceReminderDeliveryInput {
  email: string;
  invoiceNumber: string;
  amountLabel?: string;
  message?: string;
  requestId?: string;
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

async function deliverTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<TransactionalDeliveryResult> {
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
          from: env.API_PASSWORD_RESET_EMAIL_FROM ?? undefined,
          ...input.webhookPayload,
        }),
        signal: timeoutSignal(env.API_PASSWORD_RESET_EMAIL_TIMEOUT_MS),
      });
      if (!response.ok) {
        return {
          provider: 'webhook',
          status: 'failed',
          error: `${input.failureLabel} webhook returned ${response.status}`,
        };
      }
      return { provider: 'webhook', status: 'sent' };
    } catch (error) {
      return {
        provider: 'webhook',
        status: 'failed',
        error: error instanceof Error ? error.message : `${input.failureLabel} webhook failed`,
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
          to: [{ email: input.to }],
          subject: input.subject,
          textContent: input.text,
        }),
        signal: timeoutSignal(env.API_PASSWORD_RESET_EMAIL_TIMEOUT_MS),
      });
      if (!response.ok) {
        return {
          provider: 'brevo_api',
          status: 'failed',
          error: `${input.failureLabel} Brevo API returned ${response.status}`,
        };
      }
      return { provider: 'brevo_api', status: 'sent' };
    } catch (error) {
      return {
        provider: 'brevo_api',
        status: 'failed',
        error: error instanceof Error ? error.message : `${input.failureLabel} Brevo API failed`,
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
          to: input.to,
          subject: input.subject,
          text: input.text,
        },
      );
      return { provider: 'smtp', status: 'sent' };
    } catch (error) {
      return {
        provider: 'smtp',
        status: 'failed',
        error: error instanceof Error ? error.message : `${input.failureLabel} SMTP failed`,
      };
    }
  }

  if (env.API_PASSWORD_RESET_DEV_OUTBOX) {
    console.info(
      JSON.stringify({
        event: input.devOutboxEvent,
        to: input.to,
        subject: input.subject,
      }),
    );
    return { provider: 'dev_outbox', status: 'sent' };
  }

  return {
    provider: 'none',
    status: env.NODE_ENV === 'production' ? 'failed' : 'skipped',
    error:
      env.NODE_ENV === 'production'
        ? `${input.failureLabel} delivery is not configured`
        : undefined,
  };
}

export async function deliverPasswordResetEmail(
  input: PasswordResetDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  const resetUrl = withResetToken(env.API_PASSWORD_RESET_LINK_BASE, input.resetToken);
  return deliverTransactionalEmail({
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
    webhookPayload: {
      type: 'password_reset',
      to: input.email,
      resetUrl,
      expiresAt: input.expiresAt,
      requestId: input.requestId,
    },
    devOutboxEvent: 'password_reset_dev_outbox',
    failureLabel: 'Password reset email',
  });
}

export async function deliverEmailVerificationEmail(
  input: EmailVerificationDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  return deliverTransactionalEmail({
    to: input.email,
    subject: 'Verify your Clubroom email',
    text: [
      'Use this code to verify your Clubroom email address.',
      '',
      `Verification code: ${input.code}`,
      `This code expires at: ${input.expiresAt}`,
      '',
      'If you did not create this account, ignore this email.',
    ].join('\n'),
    webhookPayload: {
      type: 'email_verification',
      to: input.email,
      code: input.code,
      expiresAt: input.expiresAt,
      requestId: input.requestId,
    },
    devOutboxEvent: 'email_verification_dev_outbox',
    failureLabel: 'Email verification email',
  });
}

export async function deliverClubInviteEmail(
  input: ClubInviteDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  const subject = `You're invited to join ${input.clubName} on Clubroom`;
  const text = [
    `${input.invitedByLabel} invited you to join ${input.clubName} on Clubroom.`,
    '',
    `Invite role: ${input.role}`,
    '',
    'Sign in with this email address and open your Clubroom club invites to accept or decline.',
  ].join('\n');
  return deliverTransactionalEmail({
    to: input.email,
    subject,
    text,
    webhookPayload: {
      type: 'club_invite',
      to: input.email,
      clubName: input.clubName,
      invitedByLabel: input.invitedByLabel,
      role: input.role,
      requestId: input.requestId,
    },
    devOutboxEvent: 'club_invite_dev_outbox',
    failureLabel: 'Club invite email',
  });
}

export async function deliverInvoiceReminderEmail(
  input: InvoiceReminderDeliveryInput,
): Promise<PasswordResetDeliveryResult> {
  const subject = `Reminder for invoice ${input.invoiceNumber}`;
  const text = [
    `This is a reminder for Clubroom invoice ${input.invoiceNumber}.`,
    input.amountLabel ? `Amount due: ${input.amountLabel}` : '',
    input.message ? `Message: ${input.message}` : '',
    '',
    'Open Clubroom to view the invoice and payment options.',
  ]
    .filter((line, index, lines) => line || lines[index - 1])
    .join('\n');
  return deliverTransactionalEmail({
    to: input.email,
    subject,
    text,
    webhookPayload: {
      type: 'invoice_reminder',
      to: input.email,
      invoiceNumber: input.invoiceNumber,
      amountLabel: input.amountLabel,
      message: input.message,
      requestId: input.requestId,
    },
    devOutboxEvent: 'invoice_reminder_dev_outbox',
    failureLabel: 'Invoice reminder email',
  });
}
