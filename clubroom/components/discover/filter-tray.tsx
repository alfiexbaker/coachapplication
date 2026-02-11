import { StyleSheet, View } from 'react-native';

import { Chip } from '@/components/primitives/chip';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Row } from '@/components/primitives';

export interface FilterGroup {
  id: string;
  label: string;
  chips: {
    id: string;
    label: string;
    active: boolean;
    onPress: () => void;
  }[];
}

interface FilterTrayProps {
  groups: FilterGroup[];
  onClear?: () => void;
}

export function FilterTray({ groups, onClear }: FilterTrayProps) {
  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View key={group.id} style={styles.group}>
          <ThemedText type="defaultSemiBold">{group.label}</ThemedText>
          <Row style={styles.chipRow}>
            {group.chips.map((chip) => (
              <Chip key={chip.id} active={chip.active} onPress={chip.onPress}>
                {chip.label}
              </Chip>
            ))}
          </Row>
        </View>
      ))}
      {onClear ? <Chip onPress={onClear}>Clear filters</Chip> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  group: {
    marginBottom: Spacing.md,
  },
  chipRow: {
    flexWrap: 'wrap',
    marginTop: Spacing.sm,
  },
});
