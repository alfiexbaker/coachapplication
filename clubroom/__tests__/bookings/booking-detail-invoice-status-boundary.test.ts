import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

test('booking detail surfaces invoice read failures instead of showing no invoice', () => {
  const detailSource = readProjectFile('app/(tabs)/bookings/[id].tsx');
  const cardSource = readProjectFile('components/bookings/booking-info-cards.tsx');
  const catchStart = detailSource.indexOf('.catch(() => {');
  const effectEnd = detailSource.indexOf('  }, [booking?.id, booking?.price]);', catchStart);

  assert.ok(catchStart >= 0, 'booking detail should handle invoice read failure');
  assert.ok(effectEnd > catchStart, 'test should isolate the invoice read effect catch block');
  const catchBlock = detailSource.slice(catchStart, effectEnd);

  assert.ok(
    catchBlock.includes("invoiceStatus: 'UNKNOWN'"),
    'invoice read failures must not render as invoiceStatus NONE',
  );
  assert.ok(
    detailSource.includes('Payment status unavailable. Pull to refresh.'),
    'booking detail should explain unavailable payment status',
  );
  assert.ok(
    cardSource.includes("invoiceStatus === 'UNKNOWN'") &&
      cardSource.includes("label: 'Status unavailable'"),
    'payment card should render an explicit unavailable invoice state',
  );
});
