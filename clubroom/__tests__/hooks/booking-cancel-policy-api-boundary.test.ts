import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('booking cancellation returns a load error before refund calculation when policy authority fails', () => {
  const source = readSource('hooks/use-booking-cancel.ts');
  const policyReadStart = source.indexOf(
    'const coachPolicyResult = await schedulingRulesService.getCancellationPolicy(booking.coachId);',
  );
  const calculationStart = source.indexOf(
    'const calculation = schedulingRulesService.calculateRefund',
    policyReadStart,
  );

  assert.ok(policyReadStart >= 0, 'test should find the live cancellation policy read');
  assert.ok(
    calculationStart > policyReadStart,
    'test should find refund calculation after policy read',
  );

  const policyBlock = source.slice(policyReadStart, calculationStart);

  assert.match(
    policyBlock,
    /if \(!coachPolicyResult\.success\) \{[\s\S]*return err\([\s\S]*serviceError\([\s\S]*'UNKNOWN'[\s\S]*coachPolicyResult\.error\.message \|\| 'Failed to load cancellation policy\.'[\s\S]*coachPolicyResult\.error\.details[\s\S]*\)[\s\S]*\);[\s\S]*\}/,
    'policy read failures must return an error before refund calculation',
  );
  assert.doesNotMatch(
    policyBlock,
    /coachPolicyResult\.success \? coachPolicyResult\.data : null/,
    'policy read failure must not be converted into a null/default policy',
  );
  assert.match(
    policyBlock,
    /const coachPolicy = coachPolicyResult\.data;/,
    'refund calculation should only use an authoritative policy response',
  );
});

test('booking cancellation rejects missing live price and policy values before refund calculation', () => {
  const source = readSource('hooks/use-booking-cancel.ts');
  const priceReadIndex = source.indexOf('const bookingPrice = bookingExt.price;');
  const missingPriceMessageIndex = source.indexOf(
    'Booking price is unavailable from the live booking record.',
    priceReadIndex,
  );
  const policyReadIndex = source.indexOf(
    'const coachPolicyResult = await schedulingRulesService.getCancellationPolicy(booking.coachId);',
  );
  const missingPolicyGuardIndex = source.indexOf(
    'if (!coachPolicy && !apiClient.isMockMode)',
    policyReadIndex,
  );
  const calculationIndex = source.indexOf(
    'const calculation = schedulingRulesService.calculateRefund',
  );

  assert.ok(priceReadIndex >= 0, 'cancellation should read the API booking price directly');
  assert.ok(
    missingPriceMessageIndex > priceReadIndex && missingPriceMessageIndex < policyReadIndex,
    'missing live price should block before policy and refund work',
  );
  assert.ok(
    missingPolicyGuardIndex > policyReadIndex && missingPolicyGuardIndex < calculationIndex,
    'missing live policy should block API-mode refund calculation',
  );
  assert.doesNotMatch(source, /\?\?\s*35/, 'cancellation must not invent a £35 booking amount');
});
