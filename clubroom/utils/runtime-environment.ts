export function isExpoStaticRender(): boolean {
  return !('window' in globalThis) && process.env.EXPO_WEB_OUTPUT === 'static';
}
