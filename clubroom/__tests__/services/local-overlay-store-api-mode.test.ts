import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

process.env.EXPO_PUBLIC_USE_MOCK = 'false';

afterEach(async () => {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  await AsyncStorage.clear();
});

describe('local overlay store API mode', () => {
  it('fails closed instead of reading or writing local overlay values outside mock mode', async () => {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const { getLocalOverlayValue, setLocalOverlayValue } = await import(
      '@/services/local-overlay-store'
    );

    await AsyncStorage.setItem('clubroom.overlay.test', JSON.stringify({ source: 'local' }));

    await assert.rejects(
      () => getLocalOverlayValue('clubroom.overlay.test', { source: 'fallback' }),
      /mock-only.*\/v1 authority/,
    );

    await assert.rejects(
      () => setLocalOverlayValue('clubroom.overlay.test', { source: 'write-attempt' }),
      /mock-only.*\/v1 authority/,
    );

    assert.equal(
      await AsyncStorage.getItem('clubroom.overlay.test'),
      JSON.stringify({ source: 'local' }),
    );
  });
});
