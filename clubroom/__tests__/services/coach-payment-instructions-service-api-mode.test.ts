import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

describe('coachPaymentInstructionsService API mode', () => {
  it('does not persist direct-payment instructions without a /v1 authority', async () => {
    const [{ coachPaymentInstructionsService }, { apiClient }] = await Promise.all([
      import('@/services/coach-payment-instructions-service'),
      import('@/services/api-client'),
    ]);

    const originalGet = apiClient.get;
    const originalSet = apiClient.set;
    apiClient.get = async () => {
      throw new Error('local get should not run in API mode');
    };
    apiClient.set = async () => {
      throw new Error('local set should not run in API mode');
    };

    try {
      const read = await coachPaymentInstructionsService.getCoachPaymentInstructions('coach_api');
      assert.equal(read.success, true);
      assert.equal(read.success && read.data.coachId, 'coach_api');
      assert.equal(read.success && read.data.bankTransferDetails, '');

      const saved = await coachPaymentInstructionsService.saveCoachPaymentInstructions({
        coachId: 'coach_api',
        payeeName: 'Coach API',
        bankTransferDetails: 'Sort code: 00-00-00',
        paymentNotes: 'Use the invoice number as reference',
      });
      assert.equal(saved.success, false);
      assert.equal(!saved.success && saved.error.code, 'UNSUPPORTED');
      assert.equal(
        !saved.success && (saved.error.details as { route?: string } | undefined)?.route,
        '/v1/coaches/me/payment-instructions',
      );
      assert.equal(coachPaymentInstructionsService.canSavePaymentInstructions(), false);
    } finally {
      apiClient.get = originalGet;
      apiClient.set = originalSet;
    }
  });
});
