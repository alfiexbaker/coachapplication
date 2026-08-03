import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

import {
  createIdlePendingState,
  createLatestScreenRequestCoordinator,
  deriveScreenPendingState,
  deriveScreenStatus,
  isTruthfulScreenStatus,
  normalizeUnknownError,
  runFocusRefetch,
  shouldPreserveVisibleState,
  shouldRunFocusRefetch,
  shouldSurfaceBackgroundFailure,
  type ScreenLoadMode,
} from '@/hooks/use-screen-core';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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
  test('latest request wins when responses resolve out of order', async () => {
    const coordinator = createLatestScreenRequestCoordinator();
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    let visibleValue: string | null = null;

    const applyWhenCurrent = async (deferred: ReturnType<typeof createDeferred<string>>) => {
      const request = coordinator.begin();
      const value = await deferred.promise;
      if (request.isCurrent()) visibleValue = value;
      request.finish();
    };

    const firstRun = applyWhenCurrent(first);
    const secondRun = applyWhenCurrent(second);
    second.resolve('new query');
    await secondRun;
    first.resolve('old query');
    await firstRun;

    assert.equal(visibleValue, 'new query');
  });

  test('background requests cannot supersede an active foreground load', () => {
    const coordinator = createLatestScreenRequestCoordinator();
    const foreground = coordinator.begin('foreground');
    const background = coordinator.begin('background');

    assert.equal(foreground.isCurrent(), true);
    assert.equal(background.isCurrent(), false);

    const newerForeground = coordinator.begin('foreground');
    background.finish();
    foreground.finish();
    assert.equal(foreground.isCurrent(), false);
    assert.equal(newerForeground.isCurrent(), true);
    newerForeground.finish();

    const nextBackground = coordinator.begin('background');
    assert.equal(nextBackground.isCurrent(), true);
    nextBackground.finish();
  });

  test('foreground request remains current after a blocked background failure', async () => {
    const coordinator = createLatestScreenRequestCoordinator();
    const foreground = coordinator.begin('foreground');
    const background = coordinator.begin('background');
    let status: 'loading' | 'error' | 'success' = 'loading';

    await Promise.reject(new Error('background failed')).catch(() => {
      if (background.isCurrent()) status = 'error';
    });
    background.finish();

    if (foreground.isCurrent()) status = 'success';
    foreground.finish();

    assert.equal(status, 'success');
  });

  test('deriveScreenStatus uses default empty detection', () => {
    assert.equal(deriveScreenStatus([]), 'empty');
    assert.equal(deriveScreenStatus(['value']), 'success');
  });

  test('isTruthfulScreenStatus only treats success and empty as visible truth', () => {
    assert.equal(isTruthfulScreenStatus('loading'), false);
    assert.equal(isTruthfulScreenStatus('error'), false);
    assert.equal(isTruthfulScreenStatus('empty'), true);
    assert.equal(isTruthfulScreenStatus('success'), true);
  });

  test('warm-first preserves visible state on dependency changes after first truthy render', () => {
    assert.equal(
      shouldPreserveVisibleState({
        hasTruthfulFrame: true,
        mode: 'dependency-change',
        strategy: 'warm-first',
      }),
      true,
    );
    assert.equal(
      shouldPreserveVisibleState({
        hasTruthfulFrame: true,
        mode: 'dependency-change',
        strategy: 'cold-first',
      }),
      false,
    );
  });

  test('refresh and retry keep prior truth visible when it already exists', () => {
    assert.equal(
      shouldPreserveVisibleState({
        hasTruthfulFrame: true,
        mode: 'refresh',
        strategy: 'cold-first',
      }),
      true,
    );
    assert.equal(
      shouldPreserveVisibleState({
        hasTruthfulFrame: true,
        mode: 'retry',
        strategy: 'cold-first',
      }),
      true,
    );
  });

  test('deriveScreenPendingState marks section-skeleton and submit-only follow-up affordances', () => {
    const sectionState = deriveScreenPendingState({
      hasTruthfulFrame: true,
      hasRequestedTruthfulFrame: false,
      mode: 'dependency-change',
      strategy: 'section-skeleton',
    });
    assert.equal(sectionState.blocking, false);
    assert.equal(sectionState.preservesVisibleState, true);
    assert.equal(sectionState.shouldShowSectionSkeleton, true);

    const submitState = deriveScreenPendingState({
      hasTruthfulFrame: true,
      mode: 'retry',
      strategy: 'submit-only',
    });
    assert.equal(submitState.shouldShowSubmitProgress, true);
    assert.equal(submitState.blocking, false);
  });

  test('background failure rules keep warm paths visible', () => {
    const warmPending = deriveScreenPendingState({
      hasTruthfulFrame: true,
      mode: 'retry',
      strategy: 'warm-first',
    });
    assert.equal(
      shouldSurfaceBackgroundFailure({
        hasTruthfulFrame: true,
        mode: 'retry',
        strategy: 'warm-first',
        pendingState: warmPending,
      }),
      true,
    );

    const coldPending = createIdlePendingState('cold-first');
    assert.equal(
      shouldSurfaceBackgroundFailure({
        hasTruthfulFrame: false,
        mode: 'initial',
        strategy: 'cold-first',
        pendingState: coldPending,
      }),
      false,
    );
  });

  test('normalizeUnknownError maps Error instances to UNKNOWN service error', () => {
    const error = normalizeUnknownError(new Error('boom'));
    assert.equal(error.code, 'UNKNOWN');
    assert.equal(error.message, 'boom');
  });
});
