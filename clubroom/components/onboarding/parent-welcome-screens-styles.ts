import { StyleSheet } from 'react-native';

import { Components, Radii, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollInner: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  sectionBlock: {
    width: '100%',
    gap: Spacing.xs,
  },
  agePicker: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  ageChip: {
    width: 44,
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRow: {},
  levelChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  areasGrid: {},
  areaCard: {
    width: '48%',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    position: 'relative',
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachList: {
    width: '100%',
    gap: Spacing.sm,
  },
  coachCard: {
    width: '100%',
  },
  coachRow: {},
  coachAvatar: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  coachMeta: {
    alignItems: 'flex-end',
    gap: Spacing.micro,
  },
  ratingRow: {},
});
