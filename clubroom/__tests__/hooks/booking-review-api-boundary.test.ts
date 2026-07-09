import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

test('booking review reuses public offering coach profile when coach detail is not found', () => {
  const source = readSource('app/book/[coachId]/review.tsx');
  const fallbackStart = source.indexOf(
    'const offeringsResult = await listPublicCoachOfferingsFromApi(',
  );
  const fallbackEnd = source.indexOf(
    'return ok<ReviewLoadData | null>({\n        coach: coachResult.data',
    fallbackStart,
  );

  assert.ok(fallbackStart >= 0, 'review should load live public offerings as API fallback');
  assert.ok(fallbackEnd > fallbackStart, 'test should find fallback coach construction');

  const fallbackBlock = source.slice(fallbackStart, fallbackEnd);

  assert.ok(
    fallbackBlock.includes('firstOffering?.coachProfile?.displayName?.trim()'),
    'review fallback should use backend public coach display name metadata',
  );
  assert.ok(
    fallbackBlock.includes('draft.coachName || offeringCoachName'),
    'draft coach names may win, but API offering display names should fill missing review labels',
  );
});

test('booking review does not invent a default payable price', () => {
  const reviewSource = readSource('app/book/[coachId]/review.tsx');
  const sessionTypeSource = readSource('app/book/[coachId]/session-type.tsx');
  const offeringCardSource = readSource('components/sessions/session-offering-card.tsx');
  const prefillSource = readSource('utils/booking-draft-prefill.ts');
  const unavailablePriceIndex = sessionTypeSource.indexOf("return 'Price unavailable';");
  const freePriceIndex = sessionTypeSource.indexOf("return 'Free';");
  const missingPriceGuardIndex = sessionTypeSource.indexOf("failure_code: 'missing_price'");
  const pickerSuccessIndex = sessionTypeSource.indexOf("status: 'success'", missingPriceGuardIndex);
  const cardMissingPriceIndex = offeringCardSource.indexOf("return 'No price';");
  const cardFreePriceIndex = offeringCardSource.indexOf("return 'Free';");

  assert.equal(
    /sessionPrice\s*=\s*[^;]*\?\?\s*60/.test(reviewSource),
    false,
    'review should not silently default missing booking totals to GBP 60',
  );
  assert.equal(
    /minPrice:\s*input\.minPrice\s*\?\?\s*60/.test(reviewSource),
    false,
    'public coach fallback should not invent a GBP 60 coach rate',
  );
  assert.equal(
    prefillSource.includes('price: offering.price ?? 0'),
    false,
    'booking draft prefill should not turn missing live offering prices into free sessions',
  );
  assert.ok(unavailablePriceIndex >= 0, 'picker should label missing offering prices honestly');
  assert.ok(
    freePriceIndex > unavailablePriceIndex,
    'picker should only show Free after missing prices have been rejected',
  );
  assert.ok(cardMissingPriceIndex >= 0, 'offering cards should show missing prices explicitly');
  assert.ok(
    cardFreePriceIndex > cardMissingPriceIndex,
    'offering cards should distinguish missing prices from real free sessions',
  );
  assert.equal(
    offeringCardSource.includes('offering.price !== undefined && offering.price > 0 ?'),
    false,
    'offering cards should not hide both free and missing prices behind the same positive-price check',
  );
  assert.ok(
    sessionTypeSource.includes('hasOfferingPrice(selectedOffering)'),
    'picker should not continue when selected offering price is missing',
  );
  assert.ok(missingPriceGuardIndex >= 0, 'picker handler should fail closed on missing prices');
  assert.ok(
    pickerSuccessIndex > missingPriceGuardIndex,
    'picker handler should reject missing prices before tracking success',
  );
  assert.ok(
    reviewSource.includes('Boolean(draft.sessionOfferingId)') &&
      reviewSource.includes('hasSessionPrice'),
    'review confirmation should require a selected offering with a numeric live price',
  );
});

test('booking confirmation does not invent default API create payload values', () => {
  const source = readSource('app/book/[coachId]/confirmation.tsx');
  const createStart = source.indexOf('const result = await bookingService.createBooking({');
  const createEnd = source.indexOf('if (result.success && result.data)', createStart);

  assert.ok(createStart >= 0, 'confirmation should create bookings through bookingService');
  assert.ok(createEnd > createStart, 'test should find confirmation create block');

  const createBlock = source.slice(createStart, createEnd);

  assert.doesNotMatch(createBlock, /\|\|\s*'Athlete'/);
  assert.doesNotMatch(createBlock, /\|\|\s*'User'/);
  assert.doesNotMatch(createBlock, /\|\|\s*'Session'/);
  assert.doesNotMatch(createBlock, /\|\|\s*'1-to-1'/);
  assert.doesNotMatch(source, /\|\|\s*'your coach'/);
  assert.ok(
    source.includes('missing_athlete_names') &&
      source.includes('missing_booker_name') &&
      source.includes('missing_location') &&
      source.includes('missing_price') &&
      source.includes('missing_session_type'),
    'confirmation should fail closed on unresolved booking context before create',
  );
});
