import { View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';

export interface AlertSeverityDotProps {
  level: 'none' | 'low' | 'medium' | 'high';
  size?: number;
}

export function AlertSeverityDot({ level, size = 8 }: AlertSeverityDotProps) {
  const { colors: palette } = useTheme();

  const color =
    level === 'high'
      ? palette.error
      : level === 'medium'
        ? palette.warning
        : level === 'low'
          ? palette.muted
          : palette.success;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }}
    />
  );
}
