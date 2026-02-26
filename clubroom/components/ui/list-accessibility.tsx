import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

type AccessibleListCellProps = PropsWithChildren<ViewProps>;

export function AccessibleListCell({ children, ...props }: AccessibleListCellProps) {
  return (
    <View {...props} accessible accessibilityRole="listitem">
      {children}
    </View>
  );
}

