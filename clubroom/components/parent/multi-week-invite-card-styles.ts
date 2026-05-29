import { StyleSheet } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
  },
  headerContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  selectAllButton: {
    paddingVertical: Spacing.xxs,
    paddingHorizontal: Spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  weekRow: {
    padding: Spacing.sm,
    borderRadius: Radii.md,
    borderWidth: 1,
    minHeight: 44,
  },
  weekRowLeft: {
    flex: 1,
    gap: Spacing.micro,
  },
});
