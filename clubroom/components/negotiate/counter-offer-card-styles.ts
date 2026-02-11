import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  header: {},
  proposerInfo: {},
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    ...Typography.small,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.small,
    fontWeight: '600',
  },
  timeChangeContainer: {},
  timeBlock: {
    flex: 1,
    gap: Spacing.xxs,
  },
  proposedTimeBlock: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  timeLabel: {
    ...Typography.small,
    fontWeight: '600',
    marginBottom: Spacing.micro,
  },
  timeRow: {},
  timeValue: {
    ...Typography.small,
  },
  arrowContainer: {
    paddingHorizontal: Spacing.xs,
  },
  messageContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  messageText: {
    ...Typography.small,
    flex: 1,
    fontStyle: 'italic',
  },
  rejectionContainer: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
  },
  rejectionText: {
    ...Typography.small,
    flex: 1,
  },
  expiryRow: {},
  expiryText: {
    ...Typography.small,
    fontWeight: '500',
  },
});
