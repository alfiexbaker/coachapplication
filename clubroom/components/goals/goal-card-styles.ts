import { StyleSheet } from 'react-native';

import { Spacing, Radii, Components } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  card: {
    padding: Components.card.padding,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  title: {
    fontSize: scaleFont(16),
    lineHeight: scaleFont(22),
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  footer: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  footerLeft: {
    gap: Spacing.md,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  footerText: {
    fontSize: scaleFont(12),
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
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
  compactMeta: {
    gap: Spacing.md,
  },
  metaText: {
    fontSize: scaleFont(11),
  },
  featuredCard: {
    padding: Components.card.padding,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  featuredHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
    flexWrap: 'wrap',
  },
  featuredTitle: {
    fontSize: scaleFont(20),
    marginTop: Spacing.xs,
  },
  metaRow: {
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  metaLabel: {
    fontSize: scaleFont(13),
  },
  milestonesPreview: {
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.sm,
  },
});
