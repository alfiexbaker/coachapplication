import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('earnings and payout mock fixtures are not initialized as API-mode caches', () => {
  const payoutSource = readProjectFile('services/earnings/payout-service.ts');
  const earningsSource = readProjectFile('services/earnings/earnings-report-service.ts');

  assert.doesNotMatch(
    payoutSource,
    /let payoutMethodsCache:[^=]+=\s*\[\.\.\.MOCK_PAYOUT_METHODS\];/,
  );
  assert.doesNotMatch(payoutSource, /let withdrawalsCache:[^=]+=\s*\[\.\.\.MOCK_WITHDRAWALS\];/);
  assert.ok(payoutSource.includes('USE_MOCK ? [...MOCK_PAYOUT_METHODS] : []'));
  assert.ok(payoutSource.includes('USE_MOCK ? [...MOCK_WITHDRAWALS] : []'));
  assert.doesNotMatch(payoutSource, /return\s+\[\.\.\.MOCK_PAYOUT_METHODS\];/);
  assert.doesNotMatch(payoutSource, /return\s+\[\.\.\.MOCK_WITHDRAWALS\];/);

  assert.doesNotMatch(earningsSource, /let earningsCache:[^=]+=\s*\{ \.\.\.MOCK_EARNINGS \};/);
  assert.doesNotMatch(
    earningsSource,
    /let transactionsCache:[^=]+=\s*\[\.\.\.MOCK_TRANSACTIONS\];/,
  );
  assert.ok(earningsSource.includes('USE_MOCK ? { ...MOCK_EARNINGS } : {}'));
  assert.ok(earningsSource.includes('USE_MOCK ? [...MOCK_TRANSACTIONS] : []'));
  assert.doesNotMatch(earningsSource, /return\s+\{ \.\.\.MOCK_EARNINGS \};/);
  assert.doesNotMatch(earningsSource, /return\s+\[\.\.\.MOCK_TRANSACTIONS\];/);
});
