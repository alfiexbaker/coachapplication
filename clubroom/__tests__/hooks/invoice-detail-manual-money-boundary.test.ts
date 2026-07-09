import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync('hooks/use-invoice-detail.ts', 'utf8');
const screenSource = readFileSync('app/invoices/[id].tsx', 'utf8');

test('invoice detail keeps parent checkout hidden until provider cutover', () => {
  assert.equal(
    source.includes('canPay'),
    false,
    'invoice detail should not expose parent checkout state',
  );
  assert.equal(
    source.includes('handlePayInvoice'),
    false,
    'invoice detail should not expose parent checkout actions',
  );
  assert.equal(
    source.includes('createPaymentSession('),
    false,
    'invoice detail should not start simulated hosted payment sessions',
  );
  assert.equal(
    source.includes('Opening secure payment page'),
    false,
    'invoice detail should not use card-checkout copy before provider cutover',
  );
  assert.equal(
    screenSource.includes('Pay Now'),
    false,
    'invoice screen should not render parent checkout copy before provider cutover',
  );
  assert.equal(
    screenSource.includes('card-outline'),
    false,
    'invoice screen should not render card-payment affordances before provider cutover',
  );
});
