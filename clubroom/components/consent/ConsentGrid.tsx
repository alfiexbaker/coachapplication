import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Consent, ConsentType } from '@/constants/types';
import { consentService } from '@/services/consent-service';

interface ConsentGridProps {
  consents: Consent[];
  compact?: boolean;
  showLabels?: boolean;
}

interface ConsentItemProps {
  type: ConsentType;
  granted: boolean;
  compact: boolean;
  showLabel: boolean;
}

function ConsentItem({ type, granted, compact, showLabel }: ConsentItemProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const iconName = consentService.getConsentIcon(type);
  const label = consentService.getConsentLabel(type);

  const backgroundColor = granted
    ? `${palette.success}12`
    : `${palette.muted}08`;
  const iconColor = granted ? palette.success : palette.muted;

  const iconSize = compact ? 16 : 20;
  const statusSize = compact ? 10 : 12;

  return (
    <View
      style={[
        styles.item,
        {
          backgroundColor,
          padding: compact ? Spacing.xs / 2 : Spacing.xs,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={iconSize}
          color={iconColor}
        />
        {granted ? (
          <Ionicons
            name="checkmark-circle"
            size={statusSize}
            color={palette.success}
            style={[styles.statusIcon, { backgroundColor: palette.surface }]}
          />
        ) : (
          <Ionicons
            name="close-circle"
            size={statusSize}
            color={palette.muted}
            style={[styles.statusIcon, { backgroundColor: palette.surface }]}
          />
        )}
      </View>
      {showLabel && (
        <ThemedText
          style={[
            styles.label,
            { color: granted ? palette.text : palette.muted },
          ]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      )}
    </View>
  );
}

export function ConsentGrid({
  consents,
  compact = false,
  showLabels = false,
}: ConsentGridProps) {
  const consentTypes = consentService.getConsentTypes();

  return (
    <View style={[styles.grid, { gap: compact ? 4 : Spacing.xs }]}>
      {consentTypes.map((type) => {
        const consent = consents.find((c) => c.type === type);
        return (
          <ConsentItem
            key={type}
            type={type}
            granted={consent?.granted ?? false}
            compact={compact}
            showLabel={showLabels}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.sm,
    gap: 4,
  },
  iconContainer: {
    position: 'relative',
  },
  statusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
});
