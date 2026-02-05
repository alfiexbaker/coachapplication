/**
 * Centralized Style Library
 *
 * Provides pre-built, reusable style patterns to ensure consistency across the app.
 * Import and spread these styles instead of recreating them in each component.
 *
 * Usage:
 *   import { CommonStyles, CardStyles, ListStyles } from '@/constants/styles';
 *
 *   const styles = StyleSheet.create({
 *     card: { ...CardStyles.base },
 *     row: { ...CommonStyles.row },
 *   });
 */

import { StyleSheet, TextStyle } from 'react-native';
import { Colors, Spacing, Radii, Typography, Components, Shadows } from './theme';

// ============================================================================
// LAYOUT PATTERNS
// ============================================================================

export const LayoutStyles = StyleSheet.create({
  // Flex layouts
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  column: {
    flexDirection: 'column',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex1: {
    flex: 1,
  },

  // Spacing
  gap4: { gap: 4 },
  gap8: { gap: Spacing.xs },
  gap12: { gap: 12 },
  gap16: { gap: Spacing.sm },
  gap24: { gap: Spacing.md },
  gap32: { gap: Spacing.lg },
});

// ============================================================================
// CARD STYLES
// ============================================================================

export const CardStyles = StyleSheet.create({
  // Base card - use for all cards
  base: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.card,
  },

  // Compact card - less padding
  compact: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.xs,
    ...Shadows.light.subtle,
  },

  // Bordered card - no shadow, just border
  bordered: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },

  // Flat card - no shadow or border
  flat: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
  },

  // Interactive card - pressable
  interactive: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    ...Shadows.light.card,
  },
});

// ============================================================================
// LIST ITEM STYLES
// ============================================================================

export const ListStyles = StyleSheet.create({
  // Standard list item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: Components.listItem.standard,
  },

  // Compact list item
  itemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    minHeight: Components.listItem.compact,
  },

  // Large list item
  itemLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minHeight: Components.listItem.large,
  },

  // Item content wrapper
  itemContent: {
    flex: 1,
    gap: 2,
  },

  // Item with border bottom
  itemBordered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: Colors.light.border,
  },
});

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const ButtonStyles = StyleSheet.create({
  // Primary button - filled
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    backgroundColor: Colors.light.tint,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // Secondary button - outlined
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
    borderColor: Colors.light.tint,
    backgroundColor: 'transparent',
  },
  secondaryText: {
    color: Colors.light.tint,
    fontSize: 16,
    fontWeight: '600',
  },

  // Ghost button - no background
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.sm,
  },
  ghostText: {
    color: Colors.light.tint,
    fontSize: 15,
    fontWeight: '600',
  },

  // Compact button
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
  },
  compactText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Icon button
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Full width button
  fullWidth: {
    width: '100%',
  },
});

// ============================================================================
// BADGE & CHIP STYLES
// ============================================================================

export const BadgeStyles = StyleSheet.create({
  // Standard badge
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Pill badge
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Status badges
  statusSuccess: {
    backgroundColor: `${Colors.light.success}15`,
  },
  statusWarning: {
    backgroundColor: `${Colors.light.warning}15`,
  },
  statusError: {
    backgroundColor: `${Colors.light.error}15`,
  },
  statusNeutral: {
    backgroundColor: Colors.light.border,
  },

  // Chip (selectable)
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: `${Colors.light.tint}10`,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

// ============================================================================
// AVATAR STYLES
// ============================================================================

export const AvatarStyles = StyleSheet.create({
  // Sizes
  sm: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
  },
  md: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
  },
  lg: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
  },
  xl: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Components.avatar.xl / 2,
  },

  // Placeholder (initials)
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.light.tint}15`,
  },
  placeholderText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
});

// ============================================================================
// INPUT STYLES
// ============================================================================

export const InputStyles = StyleSheet.create({
  // Standard input
  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
    fontSize: 16,
    color: Colors.light.text,
  },

  // Input with icon
  inputWithIcon: {
    paddingLeft: 44,
  },

  // Multiline input
  multiline: {
    height: 'auto' as any,
    minHeight: 100,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },

  // Input container (for icons)
  container: {
    position: 'relative',
  },
  iconLeft: {
    position: 'absolute',
    left: Spacing.sm,
    top: '50%',
    marginTop: -10,
    zIndex: 1,
  },

  // Label
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.light.muted,
    marginBottom: 6,
  },

  // Error state
  error: {
    borderColor: Colors.light.error,
  },
  errorText: {
    fontSize: 12,
    color: Colors.light.error,
    marginTop: 4,
  },
});

// ============================================================================
// TYPOGRAPHY STYLES
// ============================================================================

export const TextStyles = StyleSheet.create({
  // Headings
  display: Typography.display as TextStyle,
  title: Typography.title as TextStyle,
  heading: Typography.heading as TextStyle,
  subheading: Typography.subheading as TextStyle,

  // Body
  body: Typography.body as TextStyle,
  bodySemiBold: Typography.bodySemiBold as TextStyle,
  small: Typography.small as TextStyle,
  caption: Typography.caption as TextStyle,
  micro: Typography.micro as TextStyle,

  // Colors
  muted: { color: Colors.light.muted },
  success: { color: Colors.light.success },
  warning: { color: Colors.light.warning },
  error: { color: Colors.light.error },
  tint: { color: Colors.light.tint },

  // Alignment
  center: { textAlign: 'center' },
  right: { textAlign: 'right' },
});

// ============================================================================
// SECTION STYLES
// ============================================================================

export const SectionStyles = StyleSheet.create({
  // Page section
  section: {
    gap: Spacing.sm,
  },

  // Section header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  headerAction: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },

  // Content padding
  paddedContent: {
    paddingHorizontal: Spacing.sm,
  },
});

// ============================================================================
// MODAL STYLES
// ============================================================================

export const ModalStyles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  },

  // Container
  container: {
    backgroundColor: Colors.light.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20, // Safe area
  },
  containerCenter: {
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    maxWidth: Components.modal.maxWidth,
    width: '100%',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },

  // Handle
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
});

// ============================================================================
// EMPTY STATE STYLES
// ============================================================================

export const EmptyStateStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.border,
    marginBottom: Spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});

// ============================================================================
// STAT DISPLAY STYLES
// ============================================================================

export const StatStyles = StyleSheet.create({
  // Stat card
  card: {
    alignItems: 'center',
    padding: Spacing.sm,
    gap: 4,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.muted,
  },

  // Stat row
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  // Inline stat
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  inlineLabel: {
    fontSize: 13,
    color: Colors.light.muted,
  },
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get dynamic background color with opacity
 */
export const withOpacity = (color: string, opacity: number): string => {
  const hex = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return `${color}${hex}`;
};

/**
 * Get status color
 */
export const getStatusColor = (status: 'success' | 'warning' | 'error' | 'neutral'): string => {
  switch (status) {
    case 'success': return Colors.light.success;
    case 'warning': return Colors.light.warning;
    case 'error': return Colors.light.error;
    default: return Colors.light.muted;
  }
};

/**
 * Format price in GBP
 */
export const formatPrice = (amount: number): string => {
  if (amount === 0) return 'Free';
  return `£${amount.toLocaleString('en-GB')}`;
};

// ============================================================================
// COMMON STYLE PATTERNS (ready-to-use combinations)
// ============================================================================

export const CommonPatterns = {
  // Card with header and content
  cardWithHeader: {
    card: CardStyles.base,
    header: { ...LayoutStyles.rowBetween, marginBottom: Spacing.sm },
    content: { gap: Spacing.xs },
  },

  // List with items
  list: {
    container: { gap: Spacing.xs },
    item: ListStyles.item,
    separator: ListStyles.separator,
  },

  // Form field
  formField: {
    container: { gap: 6 },
    label: InputStyles.label,
    input: InputStyles.input,
    error: InputStyles.errorText,
  },

  // Page layout
  page: {
    container: { flex: 1, backgroundColor: Colors.light.background },
    content: { padding: Spacing.sm, gap: Spacing.md },
    section: { gap: Spacing.sm },
  },
};
