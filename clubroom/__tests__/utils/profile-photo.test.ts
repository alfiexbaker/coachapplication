import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getUsableProfilePhotoUrl } from '@/utils/profile-photo';

describe('profile photo URLs', () => {
  it('drops placeholder and malformed remote URLs', () => {
    assert.equal(
      getUsableProfilePhotoUrl('https://cdn.clubroom.demo/athletes/alfie-barton.jpg'),
      undefined,
    );
    assert.equal(getUsableProfilePhotoUrl('https://'), undefined);
  });

  it('keeps real remote and local image references', () => {
    assert.equal(
      getUsableProfilePhotoUrl('https://images.example.com/athletes/alfie.jpg'),
      'https://images.example.com/athletes/alfie.jpg',
    );
    assert.equal(getUsableProfilePhotoUrl('alfie.jpg'), 'alfie.jpg');
  });
});
