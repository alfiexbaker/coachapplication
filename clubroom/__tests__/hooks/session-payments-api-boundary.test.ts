import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('session payments API mode reads invoice authority without generating invoices', () => {
  const source = readProjectFile('hooks/use-session-payments.ts');
  const apiLoaderStart = source.indexOf('async function loadApiSessionPayments');
  const hookStart = source.indexOf('export function useSessionPayments');

  assert.ok(apiLoaderStart >= 0, 'test should find API payment loader');
  assert.ok(hookStart > apiLoaderStart, 'API loader should sit outside the hook');

  const apiLoader = source.slice(apiLoaderStart, hookStart);
  assert.ok(
    apiLoader.includes('invoiceService.getInvoicesFiltered(coachId, {'),
    'API mode should read the coach invoice read model',
  );
  assert.ok(
    apiLoader.includes('status: RECONCILABLE_INVOICE_STATUSES'),
    'API mode should explicitly scope reconciler invoice statuses',
  );
  assert.equal(
    apiLoader.includes('generateInvoice'),
    false,
    'API-mode payment reads must not generate invoices',
  );
  assert.equal(
    apiLoader.includes('upsertInvoice'),
    false,
    'API-mode payment reads must not persist synthetic invoices',
  );

  assert.ok(
    source.includes('if (!api.useMock) {\n        return ok(await loadApiSessionPayments(coachId, currentUser?.name));\n      }'),
    'hook load should return before mock invoice synthesis in API mode',
  );

  const mockOnlyStart = source.indexOf('if (!api.useMock) {');
  const generateStart = source.indexOf('invoiceService.generateInvoice');
  const upsertStart = source.indexOf('invoiceService.upsertInvoice');
  assert.ok(generateStart > mockOnlyStart, 'invoice generation should only be reachable after API-mode return');
  assert.ok(upsertStart > mockOnlyStart, 'synthetic invoice persistence should only be reachable after API-mode return');
});
