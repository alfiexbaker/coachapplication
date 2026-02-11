import { StyleSheet } from 'react-native';

import { Spacing, Radii } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 160,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  virtualBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  virtualBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(24),
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  detailsContainer: {
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  detailRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailText: {
    fontSize: scaleFont(14),
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  attendanceInfo: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  attendanceText: {
    fontSize: scaleFont(13),
  },
  footerRight: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  price: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  freeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  freeText: {
    fontSize: scaleFont(12),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  compactTypeIndicator: {
    width: 4,
    height: '100%',
    minHeight: 48,
    borderRadius: Radii.xs,
  },
  compactContent: {
    flex: 1,
    gap: Spacing.xxs,
  },
  compactHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  compactTitle: {
    flex: 1,
    fontSize: scaleFont(15),
  },
  compactPrice: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  compactDetails: {
    gap: Spacing.md,
  },
  compactDetailItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  compactDetailText: {
    fontSize: scaleFont(12),
  },
});
