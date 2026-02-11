import { StyleSheet } from 'react-native';

import { Components, Fonts, Spacing, Typography } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
    fontFamily: Fonts?.sans,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontFamily: Fonts?.sans,
  },
  inputWithLeftIcon: {
    paddingLeft: Components.input.paddingHorizontal + Components.icon.md + Spacing.xs,
  },
  inputWithRightIcon: {
    paddingRight: Components.input.paddingHorizontal + Components.icon.md + Spacing.xs,
  },
  multiline: {
    height: undefined,
    minHeight: 100,
    paddingVertical: Spacing.sm,
    textAlignVertical: 'top',
  },
  iconLeft: {
    position: 'absolute',
    left: Spacing.sm,
    zIndex: 1,
  },
  iconRight: {
    position: 'absolute',
    right: Spacing.sm,
    zIndex: 1,
  },
  helperBase: {
    ...Typography.caption,
    fontFamily: Fonts?.sans,
  },
});
