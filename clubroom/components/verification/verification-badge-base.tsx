import { StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { LEVEL_CONFIG, SIZE_CONFIG, type VerificationLevel } from './verification-badge-config';

export type VerificationBadgeProps = {
  level: VerificationLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
};

export function VerificationBadge({
  level,
  size = 'medium',
  showLabel = true,
}: VerificationBadgeProps) {
  const { colors: palette } = useTheme();
  const config = LEVEL_CONFIG[level];
  const sizeConfig = SIZE_CONFIG[size];
  const color = palette[config.colorKey];

  return (
    <Row
      align="center"
      style={[
        styles.container,
        {
          backgroundColor: withAlpha(color, 0.09),
          paddingHorizontal: sizeConfig.paddingH,
          paddingVertical: sizeConfig.paddingV,
          gap: sizeConfig.gap,
        },
      ]}
    >
      <Ionicons
        name={config.icon as keyof typeof Ionicons.glyphMap}
        size={sizeConfig.iconSize}
        color={color}
      />
      {showLabel && (
        <ThemedText
          style={[
            styles.label,
            {
              color,
              fontSize: sizeConfig.fontSize,
            },
          ]}
        >
          {size === 'small' ? config.shortLabel : config.label}
        </ThemedText>
      )}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radii.pill,
  },
  label: {
    fontWeight: '600',
  },
});
