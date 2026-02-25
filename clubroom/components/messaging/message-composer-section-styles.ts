import { Platform, StyleSheet } from 'react-native';

import { Spacing, Radii, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  replyPreview: {
    padding: Spacing.sm,
    marginHorizontal: Spacing.md,
    borderRadius: Radii.sm,
    borderLeftWidth: 3,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  replyText: { ...Typography.small, marginTop: Spacing.micro },
  attachmentsRow: {
    paddingHorizontal: Spacing.md,
  },
  attachmentPreview: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    maxWidth: 150,
  },
  attachmentName: { ...Typography.caption, flex: 1 },
  composerRow: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
  },
  actionsRow: {
    paddingBottom: Spacing.xs,
  },
  actionButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  input: {
    ...Typography.subheading,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: Spacing.xxs,
    lineHeight: Typography.bodySmall.lineHeight,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendPlaceholder: {
    width: 44,
  },
  quickActionsContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  quickAction: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  quickActionText: { ...Typography.smallSemiBold },
});
