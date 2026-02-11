import { StyleSheet } from 'react-native';

import { Spacing, Radii } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  statsCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  statsRow: {
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxs,
  },
  statValue: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  statLabel: {
    fontSize: scaleFont(11),
    fontWeight: '500',
  },
  capacitySection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  capacityHeader: {
    justifyContent: 'space-between',
    marginBottom: Spacing.xxs,
  },
  capacityLabel: {
    fontSize: scaleFont(12),
    fontWeight: '500',
  },
  capacityValue: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  capacityBar: {
    height: 6,
    borderRadius: Radii.xs,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: Radii.xs,
  },
  filterChip: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: 8,
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  filterChipCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
    minWidth: 22,
    alignItems: 'center',
  },
  filterChipCountText: {
    fontSize: scaleFont(11),
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: scaleFont(15),
    textAlign: 'center',
  },
});
