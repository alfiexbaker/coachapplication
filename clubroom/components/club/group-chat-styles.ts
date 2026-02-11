import { StyleSheet } from 'react-native';

import { Components, Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pinnedBanner: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
  },
  pinnedContent: {
    flex: 1,
  },
  pinnedSender: {
    ...Typography.caption,
    fontWeight: '600',
  },
  pinnedBody: {
    ...Typography.small,
  },
  unreadBadge: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    marginVertical: Spacing.xs,
  },
  unreadText: {
    ...Typography.caption,
  },
  listContent: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.xs,
  },
  messageLine: {
    marginBottom: Spacing.xs / 2,
  },
  messageLineOwn: {
    justifyContent: 'flex-end',
  },
  messageLineOther: {
    justifyContent: 'flex-start',
    gap: Spacing.xs,
  },
  avatarSmall: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...Typography.caption,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    gap: Spacing.micro,
  },
  bubbleOwn: {
    borderRadius: Radii.card,
    borderBottomRightRadius: Radii.sm,
  },
  bubbleOther: {
    borderRadius: Radii.card,
    borderBottomLeftRadius: Radii.sm,
    borderWidth: 1,
  },
  senderName: {
    ...Typography.caption,
    fontWeight: '600',
  },
  messageBody: {
    ...Typography.body,
  },
  timestamp: {
    ...Typography.caption,
    alignSelf: 'flex-end',
  },
  inputBar: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderTopWidth: 1,
  },
  attachButton: {
    width: Components.button.height,
    height: Components.button.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: Components.input.height,
    maxHeight: 120,
    borderRadius: Radii.md,
    paddingHorizontal: Components.input.paddingHorizontal,
    paddingVertical: Spacing.xs,
    borderWidth: 1,
    ...Typography.body,
  },
});
