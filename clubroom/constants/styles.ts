/**
 * Centralized Style Library
 *
 * Provides pre-built, reusable style patterns to ensure consistency across the app.
 * Color-dependent styles are factory functions that accept `colors` from useTheme().
 *
 * Usage:
 *   import { LayoutStyles, createCardStyles } from '@/constants/styles';
 *   import { useTheme } from '@/hooks/useTheme';
 *
 *   const { colors } = useTheme();
 *   const CardStyles = createCardStyles(colors);
 *
 *   <View style={[CardStyles.base, Shadows[scheme].card]} />
 */

import { withAlpha } from '@/constants/theme';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { Spacing, Radii, Typography, Components } from './theme';
import type { ThemeColors } from '@/hooks/useTheme';

// ============================================================================
// LAYOUT PATTERNS (static — no color dependencies)
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

export const createCardStyles = (colors: ThemeColors) => ({
  // Base card (apply Shadows[scheme].card dynamically)
  base: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
  } as ViewStyle,

  // Compact card (apply Shadows[scheme].subtle dynamically)
  compact: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.xs,
  } as ViewStyle,

  // Bordered card — no shadow, just border
  bordered: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,

  // Flat card — no shadow or border
  flat: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
  } as ViewStyle,

  // Interactive card — pressable (apply Shadows[scheme].card dynamically)
  interactive: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.sm,
  } as ViewStyle,
});

// ============================================================================
// LIST ITEM STYLES
// ============================================================================

export const createListStyles = (colors: ThemeColors) => ({
  // Standard list item
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    minHeight: Components.listItem.standard,
  } as ViewStyle,

  // Compact list item
  itemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: Spacing.xs,
    minHeight: Components.listItem.compact,
  } as ViewStyle,

  // Large list item
  itemLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minHeight: Components.listItem.large,
  } as ViewStyle,

  // Item content wrapper
  itemContent: {
    flex: 1,
    gap: 2,
  } as ViewStyle,

  // Item with border bottom
  itemBordered: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  } as ViewStyle,

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.border,
  } as ViewStyle,
});

// ============================================================================
// BUTTON STYLES
// ============================================================================

export const createButtonStyles = (colors: ThemeColors) => ({
  // Primary button — filled
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    backgroundColor: colors.tint,
  } as ViewStyle,
  primaryText: {
    color: colors.onPrimary,
    fontSize: Typography.subheading.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Secondary button — outlined
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.md,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
    borderColor: colors.tint,
    backgroundColor: 'transparent',
  } as ViewStyle,
  secondaryText: {
    color: colors.tint,
    fontSize: Typography.subheading.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Ghost button — no background
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  ghostText: {
    color: colors.tint,
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Compact button
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: Components.buttonCompact.height,
    paddingHorizontal: Spacing.sm,
    borderRadius: Components.buttonCompact.borderRadius,
  } as ViewStyle,
  compactText: {
    fontSize: Typography.small.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Icon button
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  iconSmall: {
    width: 32,
    height: 32,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,

  // Full width button
  fullWidth: {
    width: '100%',
  } as ViewStyle,
});

// ============================================================================
// BADGE & CHIP STYLES
// ============================================================================

export const createBadgeStyles = (colors: ThemeColors) => ({
  // Standard badge
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  } as ViewStyle,
  badgeText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Pill badge
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  } as ViewStyle,
  pillText: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Status badges
  statusSuccess: {
    backgroundColor: withAlpha(colors.success, 0.09),
  } as ViewStyle,
  statusWarning: {
    backgroundColor: withAlpha(colors.warning, 0.09),
  } as ViewStyle,
  statusError: {
    backgroundColor: withAlpha(colors.error, 0.09),
  } as ViewStyle,
  statusNeutral: {
    backgroundColor: colors.border,
  } as ViewStyle,

  // Chip (selectable)
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
  } as ViewStyle,
  chipActive: {
    backgroundColor: withAlpha(colors.tint, 0.06),
    borderColor: colors.tint,
  } as ViewStyle,
  chipText: {
    fontSize: Typography.small.fontSize,
    fontWeight: '600',
  } as TextStyle,
});

// ============================================================================
// AVATAR STYLES
// ============================================================================

export const createAvatarStyles = (colors: ThemeColors) => ({
  // Sizes
  sm: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
  } as ViewStyle,
  md: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
  } as ViewStyle,
  lg: {
    width: Components.avatar.lg,
    height: Components.avatar.lg,
    borderRadius: Components.avatar.lg / 2,
  } as ViewStyle,
  xl: {
    width: Components.avatar.xl,
    height: Components.avatar.xl,
    borderRadius: Components.avatar.xl / 2,
  } as ViewStyle,

  // Placeholder (initials)
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.tint, 0.09),
  } as ViewStyle,
  placeholderText: {
    color: colors.tint,
    fontWeight: '600',
  } as TextStyle,
});

// ============================================================================
// INPUT STYLES
// ============================================================================

export const createInputStyles = (colors: ThemeColors) => ({
  // Standard input
  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: Typography.subheading.fontSize,
    color: colors.text,
  } as TextStyle,

  // Input with icon
  inputWithIcon: {
    paddingLeft: 44,
  } as ViewStyle,

  // Multiline input
  multiline: {
    height: 'auto' as const,
    minHeight: 100,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  } as TextStyle,

  // Input container (for icons)
  container: {
    position: 'relative',
  } as ViewStyle,
  iconLeft: {
    position: 'absolute',
    left: Spacing.sm,
    top: '50%',
    marginTop: -10,
    zIndex: 1,
  } as ViewStyle,

  // Label
  label: {
    fontSize: Typography.small.fontSize,
    fontWeight: '500',
    color: colors.muted,
    marginBottom: 6,
  } as TextStyle,

  // Error state
  error: {
    borderColor: colors.error,
  } as ViewStyle,
  errorText: {
    fontSize: Typography.caption.fontSize,
    color: colors.error,
    marginTop: 4,
  } as TextStyle,
});

// ============================================================================
// TYPOGRAPHY STYLES
// ============================================================================

export const createTextStyles = (colors: ThemeColors) => ({
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
  muted: { color: colors.muted } as TextStyle,
  success: { color: colors.success } as TextStyle,
  warning: { color: colors.warning } as TextStyle,
  error: { color: colors.error } as TextStyle,
  tint: { color: colors.tint } as TextStyle,

  // Alignment
  center: { textAlign: 'center' } as TextStyle,
  right: { textAlign: 'right' } as TextStyle,
});

// ============================================================================
// SECTION STYLES
// ============================================================================

export const createSectionStyles = (colors: ThemeColors) => ({
  // Page section
  section: {
    gap: Spacing.sm,
  } as ViewStyle,

  // Section header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
  headerTitle: {
    fontSize: Typography.lg.fontSize,
    fontWeight: '600',
    letterSpacing: -0.2,
  } as TextStyle,
  headerAction: {
    fontSize: Typography.bodySmall.fontSize,
    fontWeight: '600',
    color: colors.tint,
  } as TextStyle,

  // Content padding
  paddedContent: {
    paddingHorizontal: Spacing.sm,
  } as ViewStyle,
});

// ============================================================================
// MODAL STYLES
// ============================================================================

export const createModalStyles = (colors: ThemeColors) => ({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  } as ViewStyle,
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
  } as ViewStyle,

  // Container
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl + 20, // Safe area
  } as ViewStyle,
  containerCenter: {
    backgroundColor: colors.surface,
    borderRadius: Radii.card,
    padding: Spacing.lg,
    maxWidth: Components.modal.maxWidth,
    width: '100%',
  } as ViewStyle,

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  } as ViewStyle,
  headerTitle: {
    fontSize: Typography.heading.fontSize,
    fontWeight: '600',
  } as TextStyle,

  // Handle
  handle: {
    width: 36,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: Radii.xs,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  } as ViewStyle,
});

// ============================================================================
// EMPTY STATE STYLES
// ============================================================================

export const createEmptyStateStyles = (colors: ThemeColors) => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  } as ViewStyle,
  icon: {
    width: 64,
    height: 64,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
    marginBottom: Spacing.xs,
  } as ViewStyle,
  title: {
    fontSize: Typography.lg.fontSize,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
  message: {
    fontSize: Typography.bodySmall.fontSize,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  } as TextStyle,
});

// ============================================================================
// STAT DISPLAY STYLES
// ============================================================================

export const createStatStyles = (colors: ThemeColors) => ({
  // Stat card
  card: {
    alignItems: 'center',
    padding: Spacing.sm,
    gap: 4,
  } as ViewStyle,
  value: {
    fontSize: Typography.xl.fontSize,
    fontWeight: '700',
    letterSpacing: -0.5,
  } as TextStyle,
  label: {
    fontSize: Typography.caption.fontSize,
    fontWeight: '500',
    color: colors.muted,
  } as TextStyle,

  // Stat row
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  } as ViewStyle,

  // Inline stat
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  } as ViewStyle,
  inlineValue: {
    fontSize: Typography.body.fontSize,
    fontWeight: '600',
  } as TextStyle,
  inlineLabel: {
    fontSize: Typography.small.fontSize,
    color: colors.muted,
  } as TextStyle,
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
 * Get status color (pass colors from useTheme())
 */
export const getStatusColor = (
  status: 'success' | 'warning' | 'error' | 'neutral',
  colors: ThemeColors,
): string => {
  switch (status) {
    case 'success': return colors.success;
    case 'warning': return colors.warning;
    case 'error': return colors.error;
    default: return colors.muted;
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

export const createCommonPatterns = (colors: ThemeColors) => {
  const CardStyles = createCardStyles(colors);
  const ListStyles = createListStyles(colors);
  const InputStyles = createInputStyles(colors);

  return {
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
      container: { flex: 1, backgroundColor: colors.background } as ViewStyle,
      content: { padding: Spacing.sm, gap: Spacing.md } as ViewStyle,
      section: { gap: Spacing.sm } as ViewStyle,
    },
  };
};
