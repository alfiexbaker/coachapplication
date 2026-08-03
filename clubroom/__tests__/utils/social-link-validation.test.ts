import assert from 'node:assert/strict';
import test from 'node:test';

import {
  firstSocialLinksError,
  normalizeSocialLinkInput,
  validateSocialLinkInput,
} from '../../packages/shared-contracts/src/common/social-links';

test('accepts exact and subdomain social hosts', () => {
  assert.equal(validateSocialLinkInput('instagram', 'https://instagram.com/coach'), null);
  assert.equal(validateSocialLinkInput('youtube', 'https://m.youtube.com/@coach'), null);
  assert.equal(validateSocialLinkInput('twitter', 'x.com/coach'), null);
});

test('rejects lookalike social hosts', () => {
  assert.equal(
    validateSocialLinkInput('instagram', 'https://evilinstagram.com/coach'),
    'Use an Instagram URL',
  );
  assert.equal(
    validateSocialLinkInput('linkedin', 'https://linkedin.com.evil.test/coach'),
    'Use a LinkedIn URL',
  );
});

test('rejects non-http schemes', () => {
  assert.equal(validateSocialLinkInput('website', 'javascript:alert(1)'), 'Enter a valid URL');
  assert.equal(validateSocialLinkInput('website', 'data:text/html,bad'), 'Enter a valid URL');
});

test('normalizes handles and bare domains', () => {
  assert.equal(normalizeSocialLinkInput('instagram', '@coach'), 'https://instagram.com/coach');
  assert.equal(normalizeSocialLinkInput('website', 'clubroom.example'), 'https://clubroom.example');
});

test('returns the first invalid profile link', () => {
  assert.equal(
    firstSocialLinksError({
      instagram: 'https://instagram.com/coach',
      facebook: 'https://fakefacebook.com/coach',
    }),
    'Use a Facebook URL',
  );
});
