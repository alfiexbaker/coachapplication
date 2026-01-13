import { View, StyleSheet } from 'react-native';

import { SelectionTile } from '@/components/primitives/selection-tile';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

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

export function ServiceSelectionList({ services, selectedServiceId, onSelect }: ServiceSelectionListProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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
              iconName={service.iconName as any}
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
  title: {
    fontSize: 16,
    paddingHorizontal: Spacing.lg,
  },
  list: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
});
