import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  title: {
    ...Typography.heading,
    letterSpacing: -0.2,
  },
  metaRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  typeBadgeText: {
    ...Typography.micro,
    letterSpacing: 0.2,
  },
  memberInfo: {
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  memberCount: {
    ...Typography.caption,
  },
  description: {
    ...Typography.bodySmall,
  },
  lastMessage: {
    paddingTop: Spacing.sm,
    marginTop: Spacing.xs,
    borderTopWidth: 1,
    gap: Spacing.xxs,
  },
  lastMessageLabel: {
    ...Typography.micro,
    letterSpacing: 0.5,
  },
  lastMessageRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  lastMessageText: {
    flex: 1,
    ...Typography.bodySmall,
  },
  lastMessageTime: {
    ...Typography.caption,
  },
  unreadBadgeLarge: {
    minWidth: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  unreadTextLarge: {
    ...Typography.caption,
    fontWeight: '700',
  },
  compactCard: {
    alignItems: 'center',
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
    ...Typography.body,
  },
  compactDetails: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  previewText: {
    flex: 1,
    ...Typography.small,
  },
  timeLabel: {
    ...Typography.caption,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  unreadText: {
    ...Typography.micro,
    fontWeight: '700',
  },
});
