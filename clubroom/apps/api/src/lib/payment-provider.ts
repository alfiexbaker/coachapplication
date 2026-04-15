import crypto from 'node:crypto';
import { env } from '@clubroom/config';
import { badRequest, serviceUnavailable } from './http-errors.js';

export type PaymentProviderName = 'simulated' | 'stripe';

export interface PaymentNextAction {
  type: 'open_url' | 'none';
  url?: string;
  method?: 'GET';
}

export interface HostedPaymentSession {
  provider: PaymentProviderName;
  providerSessionId: string;
  status: 'ACTION_REQUIRED';
  expiresAt: string;
  nextAction: PaymentNextAction;
}

export interface CreateHostedPaymentSessionInput {
  attemptId: string;
  invoiceId: string;
  invoiceNumber: string;
  amountMinor: number;
  currency: string;
  returnUrl?: string | null;
  cancelUrl?: string | null;
}

interface SimulatedPaymentTokenPayload {
  attemptId: string;
  providerSessionId: string;
  invoiceId: string;
  amountMinor: number;
  currency: string;
  returnUrl?: string | null;
  cancelUrl?: string | null;
  exp: number;
}

interface PaymentProvider {
  createHostedPaymentSession(input: CreateHostedPaymentSessionInput): Promise<HostedPaymentSession>;
}

const SIMULATED_SESSION_PREFIX = 'paysim';
const SIMULATED_TTL_MS = 30 * 60 * 1000;

function base64UrlEncode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', env.API_PAYMENT_SIMULATION_SECRET).update(value).digest('base64url');
}

interface AllowedReturnTarget {
  protocol: string;
  host: string;
  pathname: string;
}

function parseAllowedReturnTargets(): AllowedReturnTarget[] {
  return (env.API_PAYMENT_ALLOWED_RETURN_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        const parsed = new URL(value);
        return {
          protocol: parsed.protocol,
          host: parsed.host,
          pathname: parsed.pathname || '/',
        };
      } catch {
        throw serviceUnavailable('Invalid hosted payment return URL allowlist entry', {
          allowlistEntry: value,
        });
      }
    });
}

function matchesAllowedReturnTarget(parsed: URL, allowed: AllowedReturnTarget): boolean {
  if (parsed.protocol !== allowed.protocol || parsed.host !== allowed.host) {
    return false;
  }

  const allowedPath = allowed.pathname || '/';
  if (allowedPath === '/' || allowedPath === '') {
    return true;
  }

  return parsed.pathname === allowedPath || parsed.pathname.startsWith(`${allowedPath.replace(/\/$/, '')}/`);
}

export function validateHostedReturnUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw serviceUnavailable('Invalid hosted payment return URL configuration', {
      returnUrl: value,
    });
  }

  const allowlist = parseAllowedReturnTargets();
  if (allowlist.length === 0) {
    return parsed.toString();
  }
  if (!allowlist.some((allowed) => matchesAllowedReturnTarget(parsed, allowed))) {
    throw serviceUnavailable('Hosted payment return URL is not allowlisted', {
      returnUrl: parsed.toString(),
      target: `${parsed.protocol}//${parsed.host}${parsed.pathname}`,
    });
  }
  return parsed.toString();
}

export function issueSimulatedPaymentToken(payload: Omit<SimulatedPaymentTokenPayload, 'exp'> & { exp?: number }): string {
  const tokenPayload: SimulatedPaymentTokenPayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + SIMULATED_TTL_MS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySimulatedPaymentToken(token: string): SimulatedPaymentTokenPayload {
  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    throw badRequest('Invalid simulated payment token');
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature, 'base64url');
  const expectedBuffer = Buffer.from(expectedSignature, 'base64url');
  if (
    providedBuffer.length !== expectedBuffer.length
    || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw badRequest('Simulated payment token signature mismatch');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SimulatedPaymentTokenPayload;
  if (!payload.exp || payload.exp < Date.now()) {
    throw badRequest('Simulated payment token expired');
  }
  return payload;
}

function resolveSimulatedProvider(): PaymentProvider {
  return {
    async createHostedPaymentSession(input) {
      const expiresAtMs = Date.now() + SIMULATED_TTL_MS;
      const providerSessionId = `${SIMULATED_SESSION_PREFIX}_${crypto.randomUUID()}`;
      const token = issueSimulatedPaymentToken({
        attemptId: input.attemptId,
        providerSessionId,
        invoiceId: input.invoiceId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        returnUrl: validateHostedReturnUrl(input.returnUrl ?? undefined) ?? null,
        cancelUrl: validateHostedReturnUrl(input.cancelUrl ?? undefined) ?? null,
        exp: expiresAtMs,
      });

      return {
        provider: 'simulated',
        providerSessionId,
        status: 'ACTION_REQUIRED',
        expiresAt: new Date(expiresAtMs).toISOString(),
        nextAction: {
          type: 'open_url',
          method: 'GET',
          url: `/v1/payment-attempts/${input.attemptId}/hosted?token=${encodeURIComponent(token)}`,
        },
      };
    },
  };
}

export function getConfiguredPaymentProvider(): PaymentProvider {
  if (env.API_PAYMENT_PROVIDER === 'simulated') {
    return resolveSimulatedProvider();
  }

  throw serviceUnavailable('Stripe payment provider is not configured in this runtime', {
    provider: env.API_PAYMENT_PROVIDER,
    action: 'Keep API_PAYMENT_PROVIDER=simulated until Stripe credentials and webhook runtime are wired.',
  });
}
