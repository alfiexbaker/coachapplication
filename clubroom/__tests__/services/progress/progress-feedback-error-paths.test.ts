import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';

describe('ProgressFeedbackService — error paths', () => {
  beforeEach(async () => {
    await apiClient.remove(STORAGE_KEYS.SESSION_FEEDBACK);
    await apiClient.remove(STORAGE_KEYS.SESSION_NOTES);
    await apiClient.remove(STORAGE_KEYS.SKILL_LEVELS);
  });

  it('should return null for feedback on nonexistent session', async () => {
    const result = await progressFeedbackService.getSessionFeedback(
      'fake-session-' + Math.random().toString(36).slice(2),
    );

    assert.equal(result, null);
  });

  it('should return empty array for unknown athlete feedback', async () => {
    const results = await progressFeedbackService.getFeedbackForAthlete(
      'fake-athlete-' + Math.random().toString(36).slice(2),
      'coach',
    );

    assert.ok(Array.isArray(results));
    assert.equal(results.length, 0);
  });

  it('should return null for session note on missing booking', async () => {
    const result = await progressFeedbackService.getSessionNote(
      'fake-booking-' + Math.random().toString(36).slice(2),
    );

    assert.equal(result, null);
  });
});
