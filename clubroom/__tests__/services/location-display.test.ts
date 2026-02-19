import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatPinnedLocationLabel,
  getDisplayLocationLabel,
  isPinnedLocationLabel,
} from '@/utils/location-display';

describe('location-display utils', () => {
  it('formats a stable pinned location label', () => {
    const label = formatPinnedLocationLabel({ latitude: 51.507351, longitude: -0.127758 });
    assert.equal(label, 'Pinned location (51.50735, -0.12776)');
  });

  it('detects only system-generated pinned labels', () => {
    assert.equal(isPinnedLocationLabel('Pinned location (51.50735, -0.12776)'), true);
    assert.equal(isPinnedLocationLabel('Shoreditch, London'), false);
    assert.equal(isPinnedLocationLabel('Pinned location near London'), false);
  });

  it('prefers explicit location text over coordinates', () => {
    const label = getDisplayLocationLabel(' Shoreditch, London ', {
      latitude: 51.5,
      longitude: -0.12,
    });
    assert.equal(label, 'Shoreditch, London');
  });

  it('falls back to pinned label when only coordinates are available', () => {
    const label = getDisplayLocationLabel('', { latitude: 51.5, longitude: -0.12 });
    assert.equal(label, 'Pinned location (51.50000, -0.12000)');
  });

  it('returns empty when neither location nor coordinates exist', () => {
    const label = getDisplayLocationLabel('   ', null);
    assert.equal(label, '');
  });
});
