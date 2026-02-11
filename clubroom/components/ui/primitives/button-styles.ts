import { StyleSheet } from 'react-native';

import { Components } from '@/constants/theme';

export const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: Components.button.minWidth,
  },
  label: {
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  fullWidth: {
    width: '100%',
  },
});
