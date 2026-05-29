import { Switch } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { SettingsRow } from './settings-row-base';

export interface SettingsToggleRowProps {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggleRow({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
}: SettingsToggleRowProps) {
  const { colors: palette } = useTheme();

  return (
    <SettingsRow
      icon={icon}
      iconColor={iconColor}
      title={title}
      subtitle={subtitle}
      showChevron={false}
      disabled={disabled}
      rightElement={
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: palette.border, true: palette.accent }}
          thumbColor={palette.surface}
          disabled={disabled}
          accessibilityLabel={`Toggle ${title}`}
        />
      }
    />
  );
}
