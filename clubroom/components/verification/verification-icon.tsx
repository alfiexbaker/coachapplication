import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/useTheme';
import { LEVEL_CONFIG, type VerificationLevel } from './verification-badge-config';

export interface VerificationIconProps {
  level: VerificationLevel;
  size?: number;
}

export function VerificationIcon({ level, size = 18 }: VerificationIconProps) {
  const { colors: palette } = useTheme();
  const config = LEVEL_CONFIG[level];
  const color = palette[config.colorKey];

  if (level === 'NONE') {
    return null;
  }

  return (
    <Ionicons name={config.icon as keyof typeof Ionicons.glyphMap} size={size} color={color} />
  );
}
