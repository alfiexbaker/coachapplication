import { StyleSheet } from 'react-native';

import { Spacing, Radii } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  statusContainer: {
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  statusText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    flex: 1,
  },
  checkedInContainer: {
    gap: Spacing.xs,
  },
  checkedInBadge: {
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  checkedInIcon: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedInInfo: {
    flex: 1,
  },
  checkedInTitle: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  checkedInTime: {
    fontSize: scaleFont(12),
  },
  guestsBadge: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  guestsBadgeText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  undoButton: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xxs,
    paddingHorizontal: 8,
  },
  undoButtonText: {
    fontSize: scaleFont(13),
    textDecorationLine: 'underline',
  },
  checkInButton: {
    paddingVertical: 14,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  locationWarning: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
  },
  locationWarningText: {
    fontSize: scaleFont(12),
    flex: 1,
  },
  locationInfo: {
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: Spacing.xxs,
  },
  locationInfoText: {
    fontSize: scaleFont(12),
  },
});
