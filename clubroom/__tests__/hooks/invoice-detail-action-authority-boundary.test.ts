import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

test('invoice detail waits for finance transitions and keeps controls accessible', () => {
  const hook = fs.readFileSync(path.join(ROOT, 'hooks/use-invoice-detail.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(ROOT, 'app/invoices/[id].tsx'), 'utf8');
  const markPaid = hook.indexOf('const updatedInvoice = await invoiceService.markAsPaid(');
  const markPaidGuard = hook.indexOf("updatedInvoice.status !== 'PAID'", markPaid);
  const markPaidRefresh = hook.indexOf('onRefresh();', markPaid);
  const voidInvoice = hook.indexOf('const updatedInvoice = await invoiceService.voidInvoice(');
  const voidGuard = hook.indexOf("updatedInvoice.status !== 'VOID'", voidInvoice);
  const voidRefresh = hook.indexOf('onRefresh();', voidInvoice);

  assert.ok(markPaid >= 0 && markPaidGuard > markPaid && markPaidRefresh > markPaidGuard);
  assert.ok(voidInvoice >= 0 && voidGuard > voidInvoice && voidRefresh > voidGuard);
  assert.ok(hook.includes('invoice?.canManageMoney === true || isCoach || isAdmin(currentUser)'));
  assert.ok(hook.includes("uiFeedback.showToast('Invoice marked paid.', 'success');"));
  assert.ok(hook.includes("uiFeedback.showToast('Invoice voided.', 'success');"));
  assert.ok(screen.includes('accessibilityLabel="Void invoice"'));
  assert.ok(screen.includes('accessibilityLabel="Recipient email"'));
  assert.equal(screen.includes('c.canVoid && c.isCoach'), false);
});
