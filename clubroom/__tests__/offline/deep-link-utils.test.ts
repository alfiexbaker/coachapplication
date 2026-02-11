import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import type { Href } from 'expo-router';

import { navigateToDeepLink, resolveDeepLink } from '@/utils/deep-link';

describe('deep-link utils', () => {
  test('rewrites legacy booking deep links to bookings routes', () => {
    assert.equal(resolveDeepLink('/booking/bk_1'), '/bookings/bk_1');
  });

  test('normalizes custom scheme links', () => {
    assert.equal(resolveDeepLink('clubroom://session-invites/invite_1'), '/session-invites/invite_1');
    assert.equal(resolveDeepLink('clubroom:session-invites/invite_2'), '/session-invites/invite_2');
  });

  test('returns null for malformed urls instead of throwing', () => {
    assert.equal(resolveDeepLink('https://%'), null);
  });

  test('blocks dangerous deep links', () => {
    assert.equal(resolveDeepLink('javascript:alert(1)'), null);
    assert.equal(resolveDeepLink('/foo/%2e%2e/bar'), null);
  });

  test('navigateToDeepLink pushes only valid routes', () => {
    const pushed: Href[] = [];
    const routerLike = {
      push: (href: Href) => {
        pushed.push(href);
      },
    };

    assert.equal(navigateToDeepLink(routerLike, '/booking/abc_1'), true);
    assert.deepEqual(pushed, ['/bookings/abc_1']);

    assert.equal(navigateToDeepLink(routerLike, 'javascript:alert(1)'), false);
    assert.deepEqual(pushed, ['/bookings/abc_1']);
  });
});
