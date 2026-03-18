import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import type { GroupType } from '@/constants/types';
import { scaleFont } from '@/utils/scale';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export interface GroupTypeOption {
  value: GroupType;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const GROUP_TYPE_OPTIONS: GroupTypeOption[] = [
  {
    value: 'GENERAL',
    label: 'General',
    description: 'Private logistics and updates for a focused parent or family thread',
    icon: 'chatbubbles-outline',
  },
  {
    value: 'CLUB',
    label: 'Club',
    description: 'Shared coordination for one club, team, or staff-parent handoff',
    icon: 'football-outline',
  },
  {
    value: 'SESSION',
    label: 'Session',
    description: 'Session-specific updates for players attending the same block',
    icon: 'calendar-outline',
  },
];

type GroupTypeSelectorProps = {
  selected: GroupType;
  onSelect: (type: GroupType) => void;
  disabled?: boolean;
  palette: ThemeColors;
};

export const GroupTypeSelector = memo(function GroupTypeSelector({
  selected,
  onSelect,
  disabled,
  palette,
}: GroupTypeSelectorProps) {
  return (
    <Row style={styles.typeOptions}>
      {GROUP_TYPE_OPTIONS.map((option) => (
        <SurfaceCard
          key={option.value}
          style={[
            styles.typeOption,
            selected === option.value ? { borderColor: palette.tint, borderWidth: 2 } : undefined,
          ]}
          onPress={() => onSelect(option.value)}
          tactile={!disabled}
        >
          <View
            style={[
              styles.typeIconContainer,
              {
                backgroundColor:
                  selected === option.value
                    ? withAlpha(palette.tint, 0.09)
                    : palette.surfaceSecondary,
              },
            ]}
          >
            <Ionicons
              name={option.icon}
              size={24}
              color={selected === option.value ? palette.tint : palette.icon}
            />
          </View>
          <ThemedText
            type="defaultSemiBold"
            style={[
              styles.typeLabel,
              selected === option.value ? { color: palette.tint } : undefined,
            ]}
          >
            {option.label}
          </ThemedText>
          <ThemedText style={[styles.typeDescription, { color: palette.muted }]} numberOfLines={2}>
            {option.description}
          </ThemedText>
        </SurfaceCard>
      ))}
    </Row>
  );
});

const styles = StyleSheet.create({
  typeOptions: { flexWrap: 'wrap', gap: Spacing.sm },
  typeOption: { width: '47%', padding: Spacing.sm, gap: Spacing.xs, alignItems: 'center' },
  typeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeLabel: { fontSize: scaleFont(14), textAlign: 'center' },
  typeDescription: { fontSize: scaleFont(11), textAlign: 'center', lineHeight: scaleFont(15) },
});
