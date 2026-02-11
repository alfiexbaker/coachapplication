import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  deriveScreenStatus,
  normalizeUnknownError,
  runFocusRefetch,
  shouldRunFocusRefetch,
  type ScreenLoadMode,
} from '@/hooks/use-screen-core';

describe('use-screen-core focus refetch', () => {
  test('shouldRunFocusRefetch only enables when configured and initial load has completed', () => {
    assert.equal(shouldRunFocusRefetch(false, false), false);
    assert.equal(shouldRunFocusRefetch(false, true), false);
    assert.equal(shouldRunFocusRefetch(true, false), false);
    assert.equal(shouldRunFocusRefetch(true, true), true);
  });

  test('runFocusRefetch triggers silent fetch when enabled', () => {
    const calls: ScreenLoadMode[] = [];
    runFocusRefetch({
      refetchOnFocus: true,
      hasLoadedOnce: true,
      fetchData: async (mode) => {
        calls.push(mode);
      },
    });

    assert.deepEqual(calls, ['silent']);
  });

  test('runFocusRefetch does nothing when disabled', () => {
    const calls: ScreenLoadMode[] = [];
    runFocusRefetch({
      refetchOnFocus: false,
      hasLoadedOnce: true,
      fetchData: async (mode) => {
        calls.push(mode);
      },
    });

    assert.deepEqual(calls, []);
  });
});

describe('use-screen-core status/error helpers', () => {
  test('deriveScreenStatus uses default empty detection', () => {
    assert.equal(deriveScreenStatus([]), 'empty');
    assert.equal(deriveScreenStatus(['value']), 'success');
  });

  test('normalizeUnknownError maps Error instances to UNKNOWN service error', () => {
    const error = normalizeUnknownError(new Error('boom'));
    assert.equal(error.code, 'UNKNOWN');
    assert.equal(error.message, 'boom');
  });
});
