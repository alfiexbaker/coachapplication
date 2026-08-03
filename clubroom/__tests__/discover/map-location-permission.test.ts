import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('map keeps the selected search area until location is explicitly requested', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'components/discover/map-content.native.tsx'),
    'utf8',
  );

  assert.match(source, /const selectedSearchRegion: Region/);
  assert.match(source, /latitude: filters\.location\?\.lat \?\? DEFAULT_REGION\.latitude/);
  assert.match(source, /initialRegion=\{selectedSearchRegion\}/);
  assert.match(source, /const requestCurrentLocation = async/);
  assert.match(source, /void requestCurrentLocation\(\)/);
  assert.match(source, /accessibilityLabel=\{userLocation \? 'Re-center on my location' : 'Use my location'\}/);
  assert.doesNotMatch(source, /useEffect/);
});
