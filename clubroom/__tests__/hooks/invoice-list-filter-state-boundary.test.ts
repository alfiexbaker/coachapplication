import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('invoice list keeps filter recovery available for zero-result searches', () => {
  const screen = fs.readFileSync(path.join(ROOT, 'app/invoices/index.tsx'), 'utf8');
  const list = fs.readFileSync(path.join(ROOT, 'components/invoices/InvoiceList.tsx'), 'utf8');
  const sections = fs.readFileSync(
    path.join(ROOT, 'components/invoices/invoice-list-sections.tsx'),
    'utf8',
  );

  assert.ok(screen.includes('isEmpty: () => false'));
  assert.ok(screen.includes("isFiltered ? 'Filtered summary' : 'Summary'"));
  assert.ok(screen.includes("isFiltered ? 'No invoices match these filters'"));
  assert.ok(list.includes("setSelectedStatus('ALL');"));
  assert.ok(list.includes('setDateRange({});'));
  assert.ok(list.includes("selectedStatus !== 'ALL' || Boolean(dateRange.from || dateRange.to)"));

  const dateControl = sections.slice(
    sections.indexOf('accessibilityLabel="Filter by date"'),
    sections.indexOf('// ─── DateFilterModal'),
  );
  assert.ok(dateControl.includes('accessibilityLabel="Clear date filter"'));
  assert.equal(
    dateControl.includes('<Clickable accessibilityLabel="Clear date filter"'),
    false,
  );
});
