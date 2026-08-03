import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import test from 'node:test';
import type { FastifyInstance } from 'fastify';
import { createGracefulShutdownHandler } from '../../lib/graceful-shutdown.js';

function createApp(input: {
  events: string[];
  close?: () => Promise<void>;
}): Pick<FastifyInstance, 'close' | 'log'> {
  return {
    close: input.close ?? (async () => input.events.push('close')),
    log: {
      info: (bindings: { signal?: string }, message: string) => {
        input.events.push(`info:${message}:${bindings.signal ?? ''}`);
      },
      error: (bindings: { signal?: string }, message: string) => {
        input.events.push(`error:${message}:${bindings.signal ?? ''}`);
      },
    },
  } as unknown as Pick<FastifyInstance, 'close' | 'log'>;
}

test('graceful shutdown drains Fastify, Prisma, and telemetry exactly once', async () => {
  const events: string[] = [];
  const shutdown = createGracefulShutdownHandler({
    app: createApp({ events }),
    disconnectDatabase: async () => {
      events.push('database');
    },
    flushTelemetry: async () => {
      events.push('telemetry');
    },
    captureFailure: () => events.push('capture'),
    onFailure: () => events.push('failure'),
    onTimeout: () => events.push('timeout'),
    timeoutMs: 1_000,
  });

  const first = shutdown('SIGTERM');
  const second = shutdown('SIGINT');
  assert.strictEqual(first, second);
  await first;

  assert.deepEqual(events, [
    'info:Graceful shutdown requested:SIGTERM',
    'close',
    'database',
    'telemetry',
    'info:Graceful shutdown completed:SIGTERM',
  ]);
});

test('graceful shutdown reports failure after draining remaining resources', async () => {
  const events: string[] = [];
  const closeError = new Error('close failed');
  let captured: unknown;
  let reported: unknown;
  const shutdown = createGracefulShutdownHandler({
    app: createApp({
      events,
      close: async () => {
        events.push('close');
        throw closeError;
      },
    }),
    disconnectDatabase: async () => {
      events.push('database');
    },
    flushTelemetry: async () => {
      events.push('telemetry');
    },
    captureFailure: (error) => {
      captured = error;
      events.push('capture');
    },
    onFailure: (error) => {
      reported = error;
      events.push('failure');
    },
    onTimeout: () => events.push('timeout'),
    timeoutMs: 1_000,
  });

  await shutdown('SIGTERM');

  assert.strictEqual(captured, closeError);
  assert.strictEqual(reported, closeError);
  assert.deepEqual(events, [
    'info:Graceful shutdown requested:SIGTERM',
    'close',
    'database',
    'capture',
    'telemetry',
    'error:Graceful shutdown failed:SIGTERM',
    'failure',
  ]);
});

test('graceful shutdown reports a telemetry flush failure', async () => {
  const events: string[] = [];
  const flushError = new Error('flush timed out');
  let reported: unknown;
  const shutdown = createGracefulShutdownHandler({
    app: createApp({ events }),
    disconnectDatabase: async () => {
      events.push('database');
    },
    flushTelemetry: async () => {
      events.push('telemetry');
      throw flushError;
    },
    captureFailure: () => events.push('capture'),
    onFailure: (error) => {
      reported = error;
      events.push('failure');
    },
    onTimeout: () => events.push('timeout'),
    timeoutMs: 1_000,
  });

  await shutdown('SIGTERM');

  assert.strictEqual(reported, flushError);
  assert.deepEqual(events, [
    'info:Graceful shutdown requested:SIGTERM',
    'close',
    'database',
    'telemetry',
    'error:Telemetry flush failed during shutdown:SIGTERM',
    'failure',
  ]);
});

test('graceful shutdown invokes the hard timeout while a drain is stuck', async () => {
  const events: string[] = [];
  let releaseClose: (() => void) | undefined;
  const shutdown = createGracefulShutdownHandler({
    app: createApp({
      events,
      close: () =>
        new Promise<void>((resolve) => {
          events.push('close');
          releaseClose = resolve;
        }),
    }),
    disconnectDatabase: async () => {
      events.push('database');
    },
    flushTelemetry: async () => {
      events.push('telemetry');
    },
    captureFailure: () => events.push('capture'),
    onFailure: () => events.push('failure'),
    onTimeout: (signal) => events.push(`timeout:${signal}`),
    timeoutMs: 5,
  });

  const pending = shutdown('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(events.includes('timeout:SIGTERM'));

  assert.ok(releaseClose);
  releaseClose();
  await pending;
  assert.ok(events.includes('info:Graceful shutdown completed:SIGTERM'));
});

test('server process serves v1 and exits cleanly on SIGTERM', async () => {
  const port = await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      const selectedPort = address.port;
      server.close((error) => (error ? reject(error) : resolve(selectedPort)));
    });
  });
  const child = spawn(process.execPath, ['--import', 'tsx', 'src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      API_DATA_BACKEND: 'seed',
      API_HOST: '127.0.0.1',
      API_PORT: String(port),
      LOG_LEVEL: 'info',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    output += chunk;
  });

  try {
    const deadline = Date.now() + 30_000;
    let response: Response | undefined;
    while (Date.now() < deadline) {
      if (child.exitCode !== null || child.signalCode !== null) {
        break;
      }
      try {
        response = await fetch(`http://127.0.0.1:${port}/v1/meta/version`);
        if (response.ok) {
          break;
        }
      } catch {
        // Server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.equal(response?.status, 200, output);

    assert.equal(child.kill('SIGTERM'), true);
    const [code, signal] = (await once(child, 'exit')) as [number | null, NodeJS.Signals | null];
    assert.equal(signal, null, output);
    assert.equal(code, 0, output);
    assert.match(output, /Graceful shutdown completed/);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill('SIGKILL');
      await once(child, 'exit');
    }
  }
});
