import { StyleSheet } from 'react-native';

import { Radii, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  coverContainer: {
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: 200,
  },
  profileHeader: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  avatarContainer: {
    marginTop: -50,
    position: 'relative',
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: Radii.full,
    borderWidth: 4,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: Spacing.xxs,
    right: Spacing.xxs,
    width: 32,
    height: 32,
    borderRadius: Radii.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  profileInfo: {
    gap: Spacing.xs,
  },
  schoolName: {
    ...Typography.subheading,
    opacity: 0.8,
  },
  location: {
    ...Typography.body,
    opacity: 0.6,
  },
  statsRow: {
    gap: Spacing.xl,
    marginTop: Spacing.sm,
  },
  statItem: {
    gap: Spacing.micro,
  },
  statLabel: {
    ...Typography.caption,
    opacity: 0.6,
  },
  followButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.pill,
    gap: Spacing.xs,
    marginTop: Spacing.md,
    minWidth: 120,
    height: 40,
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  followButtonText: {
    ...Typography.bodySemiBold,
  },
  badgesRow: {
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  badgeText: {
    ...Typography.caption,
  },
  editProfileButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  editProfileText: {
    ...Typography.bodySemiBold,
  },
});
