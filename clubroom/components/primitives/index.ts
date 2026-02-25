/**
 * Primitives Index
 *
 * Central export for all primitive components and styles.
 * Import from here instead of individual files for cleaner imports.
 *
 * Usage:
 *   import { SurfaceCard, Clickable, StatCard } from '@/components/primitives';
 */

// Components
export { SurfaceCard, type SurfaceCardProps } from './surface-card';
export { Clickable, type ClickableProps } from './clickable';
export { StatCard, type StatCardProps } from './stat-card';
export { PageHeader, type PageHeaderProps } from './page-header';
export { SectionHeader, type SectionHeaderProps } from './section-header';
export { ScreenHeader, type ScreenHeaderProps, SCREEN_TYPOGRAPHY } from './screen-header';

// Layout primitives
export { Row, type RowProps } from './row';
export { Column, type ColumnProps } from './column';
export { Spacer, type SpacerProps } from './spacer';
export { Center, type CenterProps } from './center';

// Image
export { SafeImage } from './safe-image';
