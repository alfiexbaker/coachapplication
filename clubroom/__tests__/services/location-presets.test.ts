import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLocationPreset,
  dedupeLocationPresets,
  findMatchingLocationPreset,
  parseStoredLocationPresets,
} from '@/utils/location-presets';

describe('location-presets utils', () => {
  it('creates a stable preset with coordinates', () => {
    const preset = createLocationPreset({
      label: 'Shoreditch Park',
      address: ' Shoreditch Park, London N1 6TA ',
      coordinates: { latitude: 51.5353123, longitude: -0.0907123 },
    });

    assert.ok(preset);
    assert.equal(preset?.label, 'Shoreditch Park');
    assert.equal(preset?.address, 'Shoreditch Park, London N1 6TA');
    assert.equal(preset?.coordinates?.latitude, 51.535312);
    assert.equal(preset?.coordinates?.longitude, -0.090712);
  });

  it('dedupes by address and coordinates', () => {
    const deduped = dedupeLocationPresets([
      {
        id: 'a',
        label: 'Shoreditch Park',
        address: 'Shoreditch Park, London N1 6TA',
        coordinates: { latitude: 51.53531, longitude: -0.09071 },
      },
      {
        id: 'b',
        label: 'Shoreditch',
        address: 'Shoreditch Park, London N1 6TA',
        coordinates: { latitude: 51.53531, longitude: -0.09071 },
      },
      {
        id: 'c',
        label: 'Hackney Marshes',
        address: 'Hackney Marshes Centre, London E9 5PF',
        coordinates: { latitude: 51.5519, longitude: -0.0339 },
      },
    ]);

    assert.equal(deduped.length, 2);
  });

  it('parses legacy string arrays from storage', () => {
    const parsed = parseStoredLocationPresets([
      'Shoreditch Park, London',
      {
        id: 'custom-1',
        label: 'Home Turf',
        address: 'Powerleague Shoreditch, Braithwaite Street, London E1 6GJ',
        coordinates: { latitude: 51.5244, longitude: -0.0754 },
      },
    ]);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0]?.label, 'Shoreditch Park');
    assert.equal(parsed[1]?.id, 'custom-1');
  });

  it('matches preset by coordinates before address text', () => {
    const presets = parseStoredLocationPresets([
      {
        id: 'preset-home',
        label: 'Home Turf',
        address: 'Example Address',
        coordinates: { latitude: 51.5, longitude: -0.12 },
      },
    ]);

    const match = findMatchingLocationPreset(presets, 'Different display text', {
      latitude: 51.5,
      longitude: -0.12,
    });

    assert.equal(match?.id, 'preset-home');
  });
});
