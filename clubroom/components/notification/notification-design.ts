/**
 * Notification UI design tokens.
 * Centralizes spacing, sizing, and motion so list quality is consistent.
 */
export const NotificationDesign = {
  list: {
    sectionGap: 8,
    cardGap: 6,
    horizontalPadding: 24,
  },
  card: {
    paddingX: 12,
    paddingY: 10,
    radius: 14,
    iconSize: 18,
    iconBox: 36,
    unreadDot: 7,
  },
  filter: {
    chipHeight: 34,
    chipIcon: 13,
    groupInset: 2,
  },
  actions: {
    iconButton: 34,
  },
  swipe: {
    actionWidth: 68,
    rightThreshold: 54,
  },
  motion: {
    fast: 160,
    standard: 220,
    spring: {
      stiffness: 220,
      damping: 22,
      mass: 0.85,
    },
  },
} as const;

