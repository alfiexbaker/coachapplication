/**
 * Map Content — Platform resolver stub for TypeScript.
 *
 * Metro resolves map-content.native.tsx on iOS/Android and
 * map-content.web.tsx on web. This file exists solely so that
 * `tsc --noEmit` can resolve the `@/components/discover/map-content`
 * import in app/discover/map.tsx.
 */
export { default } from './map-content.web';
export type { MapContentProps, MapScreenData } from './map-content-types';
