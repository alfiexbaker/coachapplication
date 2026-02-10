import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface Athlete {
  id: string;
  name: string;
  age?: number;
  position?: string;
}

export interface AthletePickerProps {
  athletes: Athlete[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  includeSelf?: boolean;
  selfId?: string;
  selfName?: string;
}

export function AthletePicker({
  athletes,
  selectedIds,
  onSelectionChange,
  includeSelf = false,
  selfId,
  selfName = 'Myself',
}: AthletePickerProps) {
  const { colors: palette } = useTheme();

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const buildSubtitle = (athlete: Athlete): string | null => {
    const parts: string[] = [];
    if (athlete.age) parts.push(`${athlete.age} years old`);
    if (athlete.position) parts.push(athlete.position);
    return parts.length > 0 ? parts.join(' - ') : null;
  };

  const renderRow = (id: string, name: string, subtitle: string | null) => {
    const isSelected = selectedIds.includes(id);

    return (
      <SurfaceCard
        key={id}
        style={styles.row}
        onPress={() => toggleSelection(id)}
        haptics
        tactile
      >
        <Row align="center" gap="sm">
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected ? palette.tint : palette.muted}
          />
          <View style={styles.textContainer}>
            <ThemedText type="defaultSemiBold">{name}</ThemedText>
            {subtitle && (
              <ThemedText style={{ ...Typography.small, color: palette.muted }}>
                {subtitle}
              </ThemedText>
            )}
          </View>
        </Row>
      </SurfaceCard>
    );
  };

  return (
    <View style={styles.container}>
      {includeSelf && selfId && renderRow(selfId, selfName, null)}
      {athletes.map((athlete) =>
        renderRow(athlete.id, athlete.name, buildSubtitle(athlete))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  row: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  textContainer: {
    flex: 1,
    gap: Spacing.micro,
  },
});
