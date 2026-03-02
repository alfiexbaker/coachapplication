import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  avatarSmall: { width: 36, height: 36, borderRadius: Radii.xl },
  avatarMedium: { width: 48, height: 48, borderRadius: Radii.xl },
  statusDot: { width: 8, height: 8, borderRadius: Radii.xs },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.3 },
  compactCard: { padding: Spacing.xs },
  compactRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactContent: { flex: 1, gap: Spacing.micro },
  compactTitle: { ...Typography.bodySemiBold },
  compactMeta: { ...Typography.small },
  compactLocation: { ...Typography.caption, fontWeight: '600' },
  locationRow: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  detailedCard: { padding: Spacing.sm, gap: Spacing.sm },
  detailedHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailedHeaderContent: { flex: 1, gap: Spacing.micro },
  detailedTitle: { ...Typography.heading },
  detailedSubtitle: { ...Typography.bodySmall },
  ownershipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    marginTop: Spacing.micro,
  },
  ownershipText: { ...Typography.micro, fontWeight: '700' },
  metaSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: { ...Typography.bodySmall, flex: 1 },
  priceRow: { alignItems: 'flex-end' },
  priceText: { ...Typography.heading },
  actionsRow: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  actionText: { ...Typography.bodySmallSemiBold },
});
