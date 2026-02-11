import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SelectionTile } from '@/components/primitives/selection-tile';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface ServiceListItem {
  id: string;
  title: string;
  description: string;
  price: string;
  capacity?: string;
  iconName: string;
}

interface ServiceSelectionListProps {
  services: ServiceListItem[];
  selectedServiceId?: string;
  onSelect: (id: string) => void;
}

export function ServiceSelectionList({
  services,
  selectedServiceId,
  onSelect,
}: ServiceSelectionListProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.title}>
        Select Session Type
      </ThemedText>
      <View style={styles.list}>
        {services.map((service) => {
          const selected = service.id === selectedServiceId;
          return (
            <SelectionTile
              key={service.id}
              title={service.title}
              description={service.description}
              meta={service.capacity}
              iconName={service.iconName as keyof typeof Ionicons.glyphMap}
              selected={selected}
              onPress={() => onSelect(service.id)}
              rightAdornment={
                <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>
                  {service.price}
                </ThemedText>
              }
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  title: { ...Typography.subheading, paddingHorizontal: Spacing.lg },
  list: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
