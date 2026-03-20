import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPlayerCardPalette,
  getPlayerCardTextContrast,
} from '@/components/progress/player-card-palette';

test('player card palette keeps readable contrast for all shipped tiers', () => {
  const tiers = [
    { gradient: ['#101A2E', '#2A425B'] as [string, string], accent: '#C9904E', overlay: '#08101D' },
    { gradient: ['#0F1A2E', '#32475D'] as [string, string], accent: '#A5B4C3', overlay: '#08101D' },
    { gradient: ['#111B30', '#2D445F'] as [string, string], accent: '#D9B160', overlay: '#08111D' },
    { gradient: ['#0D1930', '#245071'] as [string, string], accent: '#69ABE4', overlay: '#07101C' },
    { gradient: ['#0E192C', '#20556A'] as [string, string], accent: '#78D5DB', overlay: '#06101A' },
  ];

  for (const tier of tiers) {
    const palette = buildPlayerCardPalette(tier);
    assert.ok(/^#/.test(palette.text));
    assert.ok(getPlayerCardTextContrast(tier) >= 4.5);
  }
});

test('player card palette selects light foreground for dark tier backgrounds', () => {
  const palette = buildPlayerCardPalette({
    gradient: ['#101A2E', '#2A425B'],
    accent: '#C9904E',
    overlay: '#08101D',
  });

  assert.equal(palette.text, '#F8FAFC');
});
