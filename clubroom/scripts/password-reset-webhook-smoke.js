#!/usr/bin/env node
/* eslint-disable no-console */

const crypto = require('node:crypto');
const { existsSync, readFileSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const tls = require('node:tls');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ENV_FILE = '.env.staging.local';
const DEFAULT_LINK_BASE = 'clubroom://reset-password';
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_BREVO_API_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';

function parseArgs(argv) {
  const envFileArg = argv.find((arg) => arg.startsWith('--staging-env-file='));
  const recipientArg = argv.find((arg) => arg.startsWith('--recipient='));
  return {
    json: argv.includes('--json'),
    envFile: envFileArg ? envFileArg.slice('--staging-env-file='.length) : DEFAULT_ENV_FILE,
    recipient: recipientArg ? recipientArg.slice('--recipient='.length) : null,
  };
}

function loadEnvFile(relativeOrAbsolutePath) {
  const absolutePath = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(ROOT, relativeOrAbsolutePath);
  if (!existsSync(absolutePath)) {
    return { path: relativeOrAbsolutePath, loaded: false, keys: [] };
  }

  const keys = [];
  const content = readFileSync(absolutePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match) continue;

    const [, key, rawValue] = match;
    keys.push(key);
    if (process.env[key] !== undefined) continue;

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }

  return { path: relativeOrAbsolutePath, loaded: true, keys };
}

function hasValue(value) {
  return Boolean(String(value ?? '').trim());
}

function withResetToken(base, token) {
  try {
    const url = new URL(base);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    const separator = base.includes('?') ? '&' : '?';
    return `${base}${separator}token=${encodeURIComponent(token)}`;
  }
}

function timeoutSignal(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref();
  return controller.signal;
}

function previewText(text) {
  return text.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function redactValue(value, visiblePrefix = 4) {
  const text = String(value ?? '').trim();
  if (!text) return null;
  if (text.includes('@')) {
    const [local, domain] = text.split('@');
    const prefix = local.slice(0, Math.min(visiblePrefix, local.length));
    return `${prefix}${local.length > visiblePrefix ? '***' : ''}@${domain}`;
  }
  if (text.length <= visiblePrefix) return `${text[0] ?? ''}***`;
  return `${text.slice(0, visiblePrefix)}***`;
}

function secretState(value) {
  const text = String(value ?? '').trim();
  return {
    configured: text.length > 0,
    length: text.length,
  };
}

function classifySmtpFailure(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/SMTP password failed with SMTP 535|535\s+5\.7\.8|authentication failed/i.test(message)) {
    return {
      reason: 'auth_failed',
      action:
        'Regenerate/copy API_PASSWORD_RESET_SMTP_PASSWORD from Brevo SMTP settings, verify API_PASSWORD_RESET_SMTP_USERNAME, and rerun the smoke. Use the Brevo SMTP key, not the account login password or REST API key.',
    };
  }
  if (/SMTP username failed|AUTH LOGIN|AUTH PLAIN/i.test(message)) {
    return {
      reason: 'auth_handshake_failed',
      action:
        'Verify the SMTP provider supports AUTH PLAIN or AUTH LOGIN with the configured username and password.',
    };
  }
  if (/STARTTLS/i.test(message)) {
    return {
      reason: 'starttls_failed',
      action:
        'Verify API_PASSWORD_RESET_SMTP_PORT and API_PASSWORD_RESET_SMTP_SECURE. Port 587 normally uses STARTTLS with API_PASSWORD_RESET_SMTP_SECURE=false.',
    };
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timed out/i.test(message)) {
    return {
      reason: 'connection_failed',
      action: 'Verify API_PASSWORD_RESET_SMTP_HOST, port, network egress, and provider availability.',
    };
  }
  return {
    reason: 'smtp_rejected',
    action: 'Fix the SMTP host, credentials, sender address, or smoke recipient before release.',
  };
}

function classifyBrevoApiFailure(status) {
  if (status === 401 || status === 403) {
    return {
      reason: 'auth_failed',
      action:
        'Verify API_PASSWORD_RESET_BREVO_API_KEY is an active Brevo v3 API key with transactional email access.',
    };
  }
  if (status === 400) {
    return {
      reason: 'request_rejected',
      action:
        'Verify API_PASSWORD_RESET_EMAIL_FROM is a verified Brevo sender and API_PASSWORD_RESET_SMOKE_EMAIL is a valid controlled recipient.',
    };
  }
  return {
    reason: 'api_rejected',
    action: 'Fix the Brevo API key, verified sender, or smoke recipient before release.',
  };
}

function buildDeliveryDiagnostics({
  webhookUrl,
  webhookSecret,
  brevoApiKey,
  brevoEndpoint,
  smtpConfig,
  from,
  recipient,
  timeoutMs,
}) {
  let webhookHost = null;
  let webhookProtocol = null;
  try {
    if (hasValue(webhookUrl)) {
      const parsed = new URL(webhookUrl);
      webhookHost = parsed.host;
      webhookProtocol = parsed.protocol.replace(/:$/, '');
    }
  } catch {
    webhookHost = 'invalid-url';
    webhookProtocol = 'invalid';
  }

  const smtpHost = smtpConfig.host ?? '';
  const username = smtpConfig.username ?? '';
  const password = smtpConfig.password ?? '';
  const fromValue = from ?? '';
  const apiKey = brevoApiKey ?? '';
  const hasBrevoApi = hasValue(apiKey) && hasValue(fromValue);
  const hasSmtp =
    hasValue(smtpHost) && hasValue(username) && hasValue(password) && hasValue(fromValue);
  const hasWebhook = hasValue(webhookUrl);

  return {
    selectedProvider: hasWebhook ? 'webhook' : hasBrevoApi ? 'brevo_api' : hasSmtp ? 'smtp' : 'none',
    webhook: {
      configured: hasWebhook,
      host: webhookHost,
      protocol: webhookProtocol,
      secret: secretState(webhookSecret),
    },
    brevoApi: {
      configured: hasBrevoApi,
      endpoint: hasValue(brevoEndpoint) ? brevoEndpoint : DEFAULT_BREVO_API_ENDPOINT,
      apiKey: secretState(apiKey),
      from: redactValue(fromValue),
      smokeRecipient: redactValue(recipient),
      timeoutMs,
      missingRequired: [
        ['API_PASSWORD_RESET_BREVO_API_KEY', apiKey],
        ['API_PASSWORD_RESET_EMAIL_FROM', fromValue],
      ]
        .filter(([, value]) => !hasValue(value))
        .map(([key]) => key),
    },
    smtp: {
      configured: hasSmtp,
      host: hasValue(smtpHost) ? smtpHost : null,
      port: Number.isFinite(smtpConfig.port) && smtpConfig.port > 0 ? smtpConfig.port : 587,
      secure: Boolean(smtpConfig.secure),
      username: {
        ...secretState(username),
        preview: redactValue(username),
      },
      password: secretState(password),
      from: redactValue(fromValue),
      smokeRecipient: redactValue(recipient),
      timeoutMs,
      missingRequired: [
        ['API_PASSWORD_RESET_SMTP_HOST', smtpHost],
        ['API_PASSWORD_RESET_SMTP_USERNAME', username],
        ['API_PASSWORD_RESET_SMTP_PASSWORD', password],
        ['API_PASSWORD_RESET_EMAIL_FROM', fromValue],
      ]
        .filter(([, value]) => !hasValue(value))
        .map(([key]) => key),
    },
  };
}

function boolish(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function isLocalWebhookUrl(url) {
  return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
}

function extractAddress(value) {
  const match = /<([^>]+)>/.exec(value);
  return (match?.[1] ?? value).trim();
}

function extractName(value) {
  const match = /^(.*?)<[^>]+>$/.exec(value.trim());
  const name = match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  return name || undefined;
}

function buildBrevoPayload({ from, to, subject, text }) {
  const name = extractName(from);
  return {
    sender: {
      email: extractAddress(from),
      ...(name ? { name } : {}),
    },
    to: [{ email: extractAddress(to) }],
    subject,
    textContent: text,
  };
}

function headerValue(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function dotStuff(value) {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function buildSmtpMessage(message) {
  return [
    `From: ${headerValue(message.from)}`,
    `To: ${headerValue(message.to)}`,
    `Subject: ${headerValue(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@clubroom.local>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(message.text),
  ].join('\r\n');
}

class SmtpConnection {
  constructor(socket) {
    this.socket = socket;
    this.buffer = '';
    this.attach(socket);
  }

  attach(socket) {
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      this.buffer += chunk;
    });
  }

  async upgradeToTls(host) {
    this.socket.removeAllListeners('data');
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.attach(this.socket);
    await new Promise((resolve, reject) => {
      this.socket.once('secureConnect', resolve);
      this.socket.once('error', reject);
    });
  }

  write(value) {
    this.socket.write(value);
  }

  end() {
    this.socket.end();
  }

  readResponse() {
    const existing = this.consumeResponse();
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const onData = () => {
        const response = this.consumeResponse();
        if (!response) return;
        cleanup();
        resolve(response);
      };
      const onError = (error) => {
        cleanup();
        reject(error);
      };
      const cleanup = () => {
        this.socket.off('data', onData);
        this.socket.off('error', onError);
      };

      this.socket.on('data', onData);
      this.socket.on('error', onError);
    });
  }

  consumeResponse() {
    const lines = this.buffer.split(/\r?\n/);
    const completeIndex = lines.findIndex((line) => /^\d{3} /.test(line));
    if (completeIndex < 0) return null;

    const responseLines = lines.slice(0, completeIndex + 1);
    this.buffer = lines.slice(completeIndex + 1).join('\r\n');
    const finalLine = responseLines[responseLines.length - 1] ?? '';
    return {
      code: Number.parseInt(finalLine.slice(0, 3), 10),
      message: responseLines.join('\n'),
    };
  }
}

async function smtpExpect(connection, expectedCodes, context) {
  const response = await connection.readResponse();
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`${context} failed with SMTP ${response.code}: ${response.message}`);
  }
  return response;
}

async function smtpCommand(connection, value, expectedCodes, context) {
  connection.write(`${value}\r\n`);
  return smtpExpect(connection, expectedCodes, context);
}

async function smtpAuthenticate(connection, username, password) {
  const plainAuth = Buffer.from(`\0${username}\0${password}`, 'utf8').toString('base64');
  connection.write(`AUTH PLAIN ${plainAuth}\r\n`);
  const plainResponse = await connection.readResponse();
  if (plainResponse.code === 235) return;

  await smtpCommand(connection, 'AUTH LOGIN', [334], 'SMTP AUTH LOGIN');
  await smtpCommand(
    connection,
    Buffer.from(username, 'utf8').toString('base64'),
    [334],
    'SMTP username',
  );
  await smtpCommand(
    connection,
    Buffer.from(password, 'utf8').toString('base64'),
    [235],
    'SMTP password',
  );
}

async function sendSmtpMail(config, message) {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });
  socket.setTimeout(config.timeoutMs, () => {
    socket.destroy(new Error(`SMTP connection timed out after ${config.timeoutMs}ms`));
  });

  const connection = new SmtpConnection(socket);
  try {
    await smtpExpect(connection, [220], 'SMTP greeting');
    await smtpCommand(connection, 'EHLO clubroom.local', [250], 'SMTP EHLO');
    if (!config.secure) {
      await smtpCommand(connection, 'STARTTLS', [220], 'SMTP STARTTLS');
      await connection.upgradeToTls(config.host);
      await smtpCommand(connection, 'EHLO clubroom.local', [250], 'SMTP EHLO after STARTTLS');
    }

    await smtpAuthenticate(connection, config.username, config.password);
    await smtpCommand(
      connection,
      `MAIL FROM:<${extractAddress(message.from)}>`,
      [250],
      'SMTP MAIL FROM',
    );
    await smtpCommand(
      connection,
      `RCPT TO:<${extractAddress(message.to)}>`,
      [250, 251],
      'SMTP RCPT TO',
    );
    await smtpCommand(connection, 'DATA', [354], 'SMTP DATA');
    connection.write(`${buildSmtpMessage(message)}\r\n.\r\n`);
    await smtpExpect(connection, [250], 'SMTP message delivery');
    await smtpCommand(connection, 'QUIT', [221], 'SMTP QUIT');
  } finally {
    connection.end();
  }
}

function buildFailure(report, code, message, action, extra = {}) {
  return {
    ...report,
    status: 'blocked',
    issue: {
      code,
      message,
      action,
    },
    ...extra,
  };
}

function redactReport(report) {
  if (!report || typeof report !== 'object') return report;
  return {
    ...report,
    ...(report.recipient ? { recipient: redactValue(report.recipient) } : {}),
  };
}

function printReport(report, json) {
  const outputReport = redactReport(report);
  if (json) {
    console.log(JSON.stringify(outputReport, null, 2));
    return;
  }

  console.log('Password reset email delivery smoke');
  console.log(`- env file: ${outputReport.envFile.loaded ? `loaded ${outputReport.envFile.path}` : `missing ${outputReport.envFile.path}`}`);
  console.log(`- status: ${outputReport.status}`);
  if (outputReport.provider) console.log(`- provider: ${outputReport.provider}`);
  if (outputReport.recipient) console.log(`- recipient: ${outputReport.recipient}`);
  if (outputReport.diagnostics?.brevoApi) {
    const brevoApi = outputReport.diagnostics.brevoApi;
    console.log(
      `- brevo api: endpoint=${brevoApi.endpoint} key=${brevoApi.apiKey.configured ? `set len=${brevoApi.apiKey.length}` : 'missing'} from=${brevoApi.from ?? 'missing'}`,
    );
    if (brevoApi.missingRequired?.length) {
      console.log(`- brevo api missing: ${brevoApi.missingRequired.join(', ')}`);
    }
  }
  if (outputReport.diagnostics?.smtp) {
    const smtp = outputReport.diagnostics.smtp;
    console.log(
      `- smtp: host=${smtp.host ?? 'missing'} port=${smtp.port} secure=${smtp.secure ? 'true' : 'false'} username=${smtp.username.preview ?? 'missing'} password=${smtp.password.configured ? `set len=${smtp.password.length}` : 'missing'} from=${smtp.from ?? 'missing'}`,
    );
    if (smtp.missingRequired?.length) {
      console.log(`- smtp missing: ${smtp.missingRequired.join(', ')}`);
    }
  }
  if (outputReport.httpStatus) console.log(`- http status: ${outputReport.httpStatus}`);
  if (outputReport.durationMs !== undefined) console.log(`- duration: ${outputReport.durationMs}ms`);
  if (outputReport.issue) {
    console.log(`- issue: ${outputReport.issue.code}: ${outputReport.issue.message}`);
    console.log(`- action: ${outputReport.issue.action}`);
    if (outputReport.smtpFailure?.reason) {
      console.log(`- smtp failure reason: ${outputReport.smtpFailure.reason}`);
    }
    if (outputReport.brevoFailure?.reason) {
      console.log(`- brevo api failure reason: ${outputReport.brevoFailure.reason}`);
    }
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const envFile = loadEnvFile(options.envFile);
  const report = {
    generatedAt: new Date().toISOString(),
    envFile,
    status: 'ready',
  };

  const webhookUrl = process.env.API_PASSWORD_RESET_EMAIL_WEBHOOK_URL?.trim();
  const brevoApiKey = process.env.API_PASSWORD_RESET_BREVO_API_KEY?.trim();
  const brevoEndpoint =
    process.env.API_PASSWORD_RESET_BREVO_ENDPOINT?.trim() || DEFAULT_BREVO_API_ENDPOINT;
  const smtpConfig = {
    host: process.env.API_PASSWORD_RESET_SMTP_HOST?.trim(),
    port: Number.parseInt(process.env.API_PASSWORD_RESET_SMTP_PORT || '587', 10),
    username: process.env.API_PASSWORD_RESET_SMTP_USERNAME?.trim(),
    password: process.env.API_PASSWORD_RESET_SMTP_PASSWORD?.trim(),
    secure: boolish(process.env.API_PASSWORD_RESET_SMTP_SECURE),
  };
  const timeoutMs = Number.parseInt(
    process.env.API_PASSWORD_RESET_EMAIL_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS),
    10,
  );
  const normalizedTimeoutMs =
    Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS;
  const hasWebhook = hasValue(webhookUrl);
  const hasBrevoApi =
    hasValue(brevoApiKey) && hasValue(process.env.API_PASSWORD_RESET_EMAIL_FROM);
  const hasSmtp =
    hasValue(smtpConfig.host) &&
    hasValue(smtpConfig.username) &&
    hasValue(smtpConfig.password) &&
    hasValue(process.env.API_PASSWORD_RESET_EMAIL_FROM);
  const baseDiagnostics = {
    diagnostics: buildDeliveryDiagnostics({
      webhookUrl,
      webhookSecret: process.env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET,
      brevoApiKey,
      brevoEndpoint,
      smtpConfig,
      from: process.env.API_PASSWORD_RESET_EMAIL_FROM,
      recipient:
        options.recipient ||
        process.env.API_PASSWORD_RESET_SMOKE_EMAIL?.trim() ||
        process.env.API_PASSWORD_RESET_EMAIL_FROM?.trim() ||
        smtpConfig.username,
      timeoutMs: normalizedTimeoutMs,
    }),
  };

  if (!hasWebhook && !hasBrevoApi && !hasSmtp) {
    const failure = buildFailure(
      report,
      'PASSWORD_RESET_EMAIL_DELIVERY_MISSING',
      'Password reset email delivery is not configured.',
      'Set API_PASSWORD_RESET_EMAIL_WEBHOOK_URL, API_PASSWORD_RESET_BREVO_API_KEY with API_PASSWORD_RESET_EMAIL_FROM, or complete API_PASSWORD_RESET_SMTP_* settings before running release rehearsal.',
      baseDiagnostics,
    );
    printReport(failure, options.json);
    process.exit(1);
  }

  const recipient =
    options.recipient ||
    process.env.API_PASSWORD_RESET_SMOKE_EMAIL?.trim() ||
    process.env.API_PASSWORD_RESET_EMAIL_FROM?.trim() ||
    smtpConfig.username;
  if (!hasValue(recipient)) {
    const failure = buildFailure(
      report,
      'PASSWORD_RESET_SMOKE_EMAIL_MISSING',
      'No controlled recipient is configured for the password reset webhook smoke.',
      'Set API_PASSWORD_RESET_SMOKE_EMAIL to an inbox safe for release rehearsal emails.',
      baseDiagnostics,
    );
    printReport(failure, options.json);
    process.exit(1);
  }

  const requestId = `password-reset-smoke-${crypto.randomUUID()}`;
  const resetToken = `smoke_${crypto.randomUUID()}`;
  const body = {
    type: 'password_reset',
    to: recipient,
    from: process.env.API_PASSWORD_RESET_EMAIL_FROM?.trim() || undefined,
    resetUrl: withResetToken(
      process.env.API_PASSWORD_RESET_LINK_BASE?.trim() || DEFAULT_LINK_BASE,
      resetToken,
    ),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    requestId,
  };

  const startedAt = Date.now();
  if (hasWebhook) {
    let parsedWebhookUrl;
    try {
      parsedWebhookUrl = new URL(webhookUrl);
    } catch {
      const failure = buildFailure(
        report,
        'PASSWORD_RESET_EMAIL_WEBHOOK_INVALID',
        'Password reset email delivery webhook is not a valid URL.',
        'Set API_PASSWORD_RESET_EMAIL_WEBHOOK_URL to an absolute HTTPS or local smoke-test URL.',
        baseDiagnostics,
      );
      printReport(failure, options.json);
      process.exit(1);
    }

    if (parsedWebhookUrl.protocol !== 'https:' && !isLocalWebhookUrl(parsedWebhookUrl)) {
      const failure = buildFailure(
        report,
        'PASSWORD_RESET_EMAIL_WEBHOOK_INSECURE',
        'Password reset email webhook must use HTTPS outside local smoke tests.',
        'Set API_PASSWORD_RESET_EMAIL_WEBHOOK_URL to an HTTPS URL.',
        baseDiagnostics,
      );
      printReport(failure, options.json);
      process.exit(1);
    }

    try {
      const response = await fetch(parsedWebhookUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(process.env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET
            ? { authorization: `Bearer ${process.env.API_PASSWORD_RESET_EMAIL_WEBHOOK_SECRET}` }
            : {}),
        },
        body: JSON.stringify(body),
        signal: timeoutSignal(Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : DEFAULT_TIMEOUT_MS),
      });
      const responseText = await response.text();
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        const failure = buildFailure(
          report,
          'PASSWORD_RESET_EMAIL_WEBHOOK_REJECTED',
          `Password reset email webhook returned HTTP ${response.status}.`,
          'Fix the webhook destination, authentication secret, or smoke recipient before release.',
          {
            provider: 'webhook',
            recipient,
            httpStatus: response.status,
            durationMs,
            responsePreview: previewText(responseText),
            ...baseDiagnostics,
          },
        );
        printReport(failure, options.json);
        process.exit(1);
      }

      printReport(
        {
          ...report,
          provider: 'webhook',
          recipient,
          httpStatus: response.status,
          durationMs,
          ...baseDiagnostics,
          status: 'ready',
        },
        options.json,
      );
    } catch (error) {
      const failure = buildFailure(
        report,
        'PASSWORD_RESET_EMAIL_WEBHOOK_UNREACHABLE',
        error instanceof Error ? error.message : 'Password reset email webhook request failed.',
        'Make the webhook reachable from the release environment and rerun the smoke.',
        {
          provider: 'webhook',
          recipient,
          durationMs: Date.now() - startedAt,
          ...baseDiagnostics,
        },
      );
      printReport(failure, options.json);
      process.exit(1);
    }
    return;
  }

  if (hasBrevoApi) {
    let parsedBrevoEndpoint;
    try {
      parsedBrevoEndpoint = new URL(brevoEndpoint);
    } catch {
      const failure = buildFailure(
        report,
        'PASSWORD_RESET_BREVO_API_ENDPOINT_INVALID',
        'Password reset Brevo API endpoint is not a valid URL.',
        'Set API_PASSWORD_RESET_BREVO_ENDPOINT to an absolute HTTPS URL.',
        baseDiagnostics,
      );
      printReport(failure, options.json);
      process.exit(1);
    }

    if (parsedBrevoEndpoint.protocol !== 'https:' && !isLocalWebhookUrl(parsedBrevoEndpoint)) {
      const failure = buildFailure(
        report,
        'PASSWORD_RESET_BREVO_API_ENDPOINT_INSECURE',
        'Password reset Brevo API endpoint must use HTTPS outside local smoke tests.',
        'Set API_PASSWORD_RESET_BREVO_ENDPOINT to an HTTPS URL.',
        baseDiagnostics,
      );
      printReport(failure, options.json);
      process.exit(1);
    }

    try {
      const text = [
        'A password reset was requested for your Clubroom account.',
        '',
        `Reset your password: ${body.resetUrl}`,
        `This link expires at: ${body.expiresAt}`,
        '',
        'If you did not request this reset, ignore this email.',
      ].join('\n');
      const response = await fetch(parsedBrevoEndpoint, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          buildBrevoPayload({
            from: process.env.API_PASSWORD_RESET_EMAIL_FROM.trim(),
            to: recipient,
            subject: 'Reset your Clubroom password',
            text,
          }),
        ),
        signal: timeoutSignal(normalizedTimeoutMs),
      });
      const responseText = await response.text();
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        const brevoFailure = classifyBrevoApiFailure(response.status);
        const failure = buildFailure(
          report,
          'PASSWORD_RESET_BREVO_API_REJECTED',
          `Password reset Brevo API returned HTTP ${response.status}.`,
          brevoFailure.action,
          {
            provider: 'brevo_api',
            recipient,
            httpStatus: response.status,
            durationMs,
            responsePreview: previewText(responseText),
            brevoFailure,
            ...baseDiagnostics,
          },
        );
        printReport(failure, options.json);
        process.exit(1);
      }

      printReport(
        {
          ...report,
          provider: 'brevo_api',
          recipient,
          httpStatus: response.status,
          durationMs,
          ...baseDiagnostics,
          status: 'ready',
        },
        options.json,
      );
    } catch (error) {
      const failure = buildFailure(
        report,
        'PASSWORD_RESET_BREVO_API_UNREACHABLE',
        error instanceof Error ? error.message : 'Password reset Brevo API request failed.',
        'Make the Brevo API reachable from the release environment and rerun the smoke.',
        {
          provider: 'brevo_api',
          recipient,
          durationMs: Date.now() - startedAt,
          ...baseDiagnostics,
        },
      );
      printReport(failure, options.json);
      process.exit(1);
    }
    return;
  }

  try {
    await sendSmtpMail(
      {
        host: smtpConfig.host,
        port: Number.isFinite(smtpConfig.port) && smtpConfig.port > 0 ? smtpConfig.port : 587,
        username: smtpConfig.username,
        password: smtpConfig.password,
        secure: smtpConfig.secure,
        timeoutMs: normalizedTimeoutMs,
      },
      {
        from: process.env.API_PASSWORD_RESET_EMAIL_FROM.trim(),
        to: recipient,
        subject: 'Reset your Clubroom password',
        text: [
          'A password reset was requested for your Clubroom account.',
          '',
          `Reset your password: ${body.resetUrl}`,
          `This link expires at: ${body.expiresAt}`,
          '',
          'If you did not request this reset, ignore this email.',
        ].join('\n'),
      },
    );
    printReport(
      {
        ...report,
        provider: 'smtp',
        recipient,
        durationMs: Date.now() - startedAt,
        ...baseDiagnostics,
        status: 'ready',
      },
      options.json,
    );
  } catch (error) {
    const smtpFailure = classifySmtpFailure(error);
    const failure = buildFailure(
      report,
      'PASSWORD_RESET_SMTP_REJECTED',
      error instanceof Error ? error.message : 'Password reset SMTP request failed.',
      smtpFailure.action,
      {
        provider: 'smtp',
        recipient,
        durationMs: Date.now() - startedAt,
        smtpFailure,
        ...baseDiagnostics,
      },
    );
    printReport(failure, options.json);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildDeliveryDiagnostics,
  classifyBrevoApiFailure,
  classifySmtpFailure,
  redactReport,
  redactValue,
  secretState,
};
