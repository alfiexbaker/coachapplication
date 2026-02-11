import { StyleSheet } from 'react-native';

import { Components, Radii, Spacing } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.xs,
  },
  durationText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  content: {
    padding: Components.card.padding,
    gap: Spacing.xs,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  categoryBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.sm,
  },
  categoryText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  videoBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  videoBadgeText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(24),
  },
  description: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(20),
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  metaItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  metaText: {
    fontSize: scaleFont(13),
  },
  footerRight: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  assignmentCount: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  assignmentCountText: {
    fontSize: scaleFont(12),
  },
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  categoryIndicator: {
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
  compactMeta: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
