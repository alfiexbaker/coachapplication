import { StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
  },
  joinButtonCompact: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  joinButtonText: { ...Typography.bodySmallSemiBold },
  countBadge: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    marginLeft: Spacing.xxs,
  },
  countText: { ...Typography.caption },
  onWaitlistCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
  },
  onWaitlistCardCompact: {
    padding: Spacing.xs,
  },
  waitlistInfo: {
    gap: Spacing.micro,
  },
  positionBadge: {},
  positionText: { ...Typography.smallSemiBold },
  waitlistLabel: { ...Typography.caption },
  waitlistActions: {},
  autoBookToggle: {},
  autoBookLabel: { ...Typography.caption },
  switch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
    marginLeft: -4,
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 10,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
  leaveButtonText: { ...Typography.caption },
  optionsCard: {
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  optionsTitle: { ...Typography.subheading },
  autoBookOption: {
    padding: Spacing.sm,
    borderRadius: Radii.sm,
  },
  autoBookOptionContent: {},
  autoBookOptionText: {
    flex: 1,
    gap: Spacing.micro,
  },
  autoBookDescription: { ...Typography.caption, lineHeight: 16 },
  optionsButtons: {},
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  confirmButtonText: {
    fontWeight: '600',
  },
});
