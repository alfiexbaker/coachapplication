/**
 * UI Primitives
 *
 * Production-grade primitive component library.
 * Every screen in the app should compose from these building blocks.
 *
 * Usage:
 *   import { Button, Card, Badge, Avatar, Input } from '@/components/ui/primitives';
 */

// Button
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';

// Card
export { Card } from './Card';
export type { CardProps, CardVariant } from './Card';

// Badge
export { Badge } from './Badge';
export type { BadgeProps, BadgeVariant, BadgeSize } from './Badge';

// Avatar
export { Avatar } from './Avatar';
export type { AvatarProps, AvatarSize } from './Avatar';

// Input
export { Input } from './Input';
export type { InputProps } from './Input';

// Chip
export { Chip } from './Chip';
export type { ChipProps } from './Chip';

// Divider
export { Divider } from './Divider';
export type { DividerProps } from './Divider';

// Section
export { Section } from './Section';
export type { SectionProps } from './Section';

// ListItem
export { ListItem } from './ListItem';
export type { ListItemProps } from './ListItem';

// Tag
export { Tag } from './Tag';
export type { TagProps, TagColor, TagSemanticColor, TagSize } from './Tag';

// ProgressBar
export { ProgressBar } from './ProgressBar';
export type { ProgressBarProps, ProgressBarColor } from './ProgressBar';

// StatusBanner
export { StatusBanner } from './StatusBanner';
export type { StatusBannerProps, StatusBannerVariant } from './StatusBanner';

// DateTimeField
export { DateTimeField } from './DateTimeField';
export type { DateTimeFieldProps } from './DateTimeField';

// LoadingScreen
export { LoadingScreen } from './LoadingScreen';
export type { LoadingScreenProps } from './LoadingScreen';
