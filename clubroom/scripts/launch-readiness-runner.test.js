const assert = require('node:assert/strict');
const http = require('node:http');
const { afterEach, describe, it } = require('node:test');

const {
  isScannerOnlyReadinessFailure,
  prepareApiServer,
  probeApi,
  waitForApiServer,
} = require('./launch-readiness-runner.js');

const servers = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        }),
    ),
  );
  delete process.env.LAUNCH_READINESS_API_POLL_MS;
  delete process.env.LAUNCH_READINESS_API_TIMEOUT_MS;
  delete process.env.API_RATE_LIMIT_MAX;
});

async function startReadinessServer(handler) {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  return `http://127.0.0.1:${address.port}`;
}

describe('launch readiness API supervision', () => {
  it('does not treat a reachable scanner-only 503 as release-ready', async () => {
    const apiBaseUrl = await startReadinessServer((_request, response) => {
      response.writeHead(503, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          status: 'down',
          issues: [{ code: 'UPLOAD_SCANNER_UNAVAILABLE' }],
        }),
      );
    });

    const probe = await probeApi(apiBaseUrl);

    assert.equal(probe.reachable, true);
    assert.equal(probe.ready, false);
    assert.equal(probe.statusCode, 503);
    assert.deepEqual(probe.issueCodes, ['UPLOAD_SCANNER_UNAVAILABLE']);
    assert.equal(isScannerOnlyReadinessFailure(probe), true);
  });

  it('fails closed on malformed 200 readiness responses', async () => {
    const apiBaseUrl = await startReadinessServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('ok');
    });

    const probe = await probeApi(apiBaseUrl);

    assert.equal(probe.reachable, true);
    assert.equal(probe.ready, false);
    assert.equal(isScannerOnlyReadinessFailure(probe), false);
  });

  it('waits until both the API and scanner heartbeat report ready', async () => {
    let requestCount = 0;
    const apiBaseUrl = await startReadinessServer((_request, response) => {
      requestCount += 1;
      const ready = requestCount >= 2;
      response.writeHead(ready ? 200 : 503, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify(
          ready
            ? { status: 'ready', issues: [] }
            : { status: 'down', issues: [{ code: 'UPLOAD_SCANNER_UNAVAILABLE' }] },
        ),
      );
    });
    process.env.LAUNCH_READINESS_API_POLL_MS = '10';
    process.env.LAUNCH_READINESS_API_TIMEOUT_MS = '1000';

    const result = await waitForApiServer(apiBaseUrl, null, null);

    assert.equal(result.ok, true);
    assert.match(result.detail, /API and upload scanner ready/);
    assert(requestCount >= 2);
  });

  it('rejects a ready API whose rate limit is too low for launch flows', async () => {
    const apiBaseUrl = await startReadinessServer((_request, response) => {
      response.writeHead(200, {
        'content-type': 'application/json',
        'ratelimit-limit': '300',
      });
      response.end(JSON.stringify({ status: 'ready', issues: [] }));
    });
    process.env.API_RATE_LIMIT_MAX = '1200';

    const prepared = await prepareApiServer(
      { id: 'test', needsApiServer: true },
      { dryRun: false, noApiServer: false, apiBaseUrl },
    );

    assert.equal(prepared.managedServer, null);
    assert.equal(prepared.managedScanner, null);
    assert.equal(prepared.setupFailed?.status, 'fail');
    assert.match(prepared.setupFailed?.output ?? '', /ratelimit-limit=300/);
  });
});
