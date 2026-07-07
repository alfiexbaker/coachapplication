import net from 'node:net';
import tls from 'node:tls';

export interface SmtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  timeoutMs: number;
}

export interface SmtpMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
}

interface SmtpResponse {
  code: number;
  message: string;
}

function extractAddress(value: string): string {
  const angleMatch = /<([^>]+)>/.exec(value);
  const address = (angleMatch?.[1] ?? value).replace(/[\r\n]+/g, '').trim();
  if (!address || /[<>]/.test(address)) {
    throw new Error('Invalid SMTP envelope address');
  }
  return address;
}

function dotStuff(value: string): string {
  return value.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..');
}

function headerValue(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').trim();
}

function buildMessage(message: SmtpMessage): string {
  const date = new Date().toUTCString();
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@clubroom.local>`;

  return [
    `From: ${headerValue(message.from)}`,
    `To: ${headerValue(message.to)}`,
    `Subject: ${headerValue(message.subject)}`,
    `Date: ${date}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    dotStuff(message.text),
  ].join('\r\n');
}

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = '';
  private pendingReject?: (error: Error) => void;

  constructor(socket: net.Socket | tls.TLSSocket) {
    this.socket = socket;
    this.attach(socket);
  }

  private attach(socket: net.Socket | tls.TLSSocket): void {
    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      this.buffer += chunk;
    });
    socket.on('error', (error) => {
      this.pendingReject?.(error);
    });
    socket.on('close', (hadError) => {
      if (!hadError) {
        this.pendingReject?.(new Error('SMTP connection closed before a complete response'));
      }
    });
  }

  async upgradeToTls(host: string): Promise<void> {
    this.socket.removeAllListeners('data');
    this.socket.removeAllListeners('error');
    this.socket.removeAllListeners('close');
    this.socket = tls.connect({ socket: this.socket, servername: host });
    this.attach(this.socket);
    await new Promise<void>((resolve, reject) => {
      this.socket.once('secureConnect', resolve);
      this.socket.once('error', reject);
    });
  }

  write(value: string): void {
    this.socket.write(value);
  }

  end(): void {
    this.socket.end();
  }

  async readResponse(): Promise<SmtpResponse> {
    const existing = this.consumeResponse();
    if (existing) return existing;

    return new Promise<SmtpResponse>((resolve, reject) => {
      const onData = (): void => {
        const response = this.consumeResponse();
        if (!response) return;
        cleanup();
        resolve(response);
      };
      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };
      const cleanup = (): void => {
        this.pendingReject = undefined;
        this.socket.off('data', onData);
        this.socket.off('error', onError);
      };

      this.pendingReject = onError;
      this.socket.on('data', onData);
      this.socket.on('error', onError);
    });
  }

  private consumeResponse(): SmtpResponse | null {
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

async function expect(
  connection: SmtpConnection,
  expectedCodes: number[],
  context: string,
): Promise<SmtpResponse> {
  const response = await connection.readResponse();
  if (!expectedCodes.includes(response.code)) {
    throw new Error(`${context} failed with SMTP ${response.code}: ${response.message}`);
  }
  return response;
}

async function command(
  connection: SmtpConnection,
  value: string,
  expectedCodes: number[],
  context: string,
): Promise<SmtpResponse> {
  connection.write(`${value}\r\n`);
  return expect(connection, expectedCodes, context);
}

async function authenticate(
  connection: SmtpConnection,
  username: string,
  password: string,
): Promise<void> {
  const plain = Buffer.from(`\0${username}\0${password}`, 'utf8').toString('base64');
  connection.write(`AUTH PLAIN ${plain}\r\n`);
  const plainResponse = await connection.readResponse();
  if (plainResponse.code === 235) {
    return;
  }

  await command(connection, 'AUTH LOGIN', [334], 'SMTP AUTH LOGIN');
  await command(
    connection,
    Buffer.from(username, 'utf8').toString('base64'),
    [334],
    'SMTP username',
  );
  await command(
    connection,
    Buffer.from(password, 'utf8').toString('base64'),
    [235],
    'SMTP password',
  );
}

export async function sendSmtpMail(config: SmtpConfig, message: SmtpMessage): Promise<void> {
  const socket = config.secure
    ? tls.connect({ host: config.host, port: config.port, servername: config.host })
    : net.connect({ host: config.host, port: config.port });
  socket.setTimeout(config.timeoutMs, () => {
    socket.destroy(new Error(`SMTP connection timed out after ${config.timeoutMs}ms`));
  });

  const connection = new SmtpConnection(socket);

  try {
    await expect(connection, [220], 'SMTP greeting');
    await command(connection, 'EHLO clubroom.local', [250], 'SMTP EHLO');

    if (!config.secure) {
      await command(connection, 'STARTTLS', [220], 'SMTP STARTTLS');
      await connection.upgradeToTls(config.host);
      await command(connection, 'EHLO clubroom.local', [250], 'SMTP EHLO after STARTTLS');
    }

    await authenticate(connection, config.username, config.password);
    await command(
      connection,
      `MAIL FROM:<${extractAddress(message.from)}>`,
      [250],
      'SMTP MAIL FROM',
    );
    await command(
      connection,
      `RCPT TO:<${extractAddress(message.to)}>`,
      [250, 251],
      'SMTP RCPT TO',
    );
    await command(connection, 'DATA', [354], 'SMTP DATA');
    connection.write(`${buildMessage(message)}\r\n.\r\n`);
    await expect(connection, [250], 'SMTP message delivery');
    await command(connection, 'QUIT', [221], 'SMTP QUIT');
  } finally {
    connection.end();
  }
}
