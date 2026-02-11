import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { Consent, ConsentType } from '@/constants/types';
import { consentService } from '@/services/consent-service';
import { Row } from '@/components/primitives';

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
  const { colors: palette } = useTheme();

  const iconName = consentService.getConsentIcon(type);
  const label = consentService.getConsentLabel(type);

  const backgroundColor = granted
    ? withAlpha(palette.success, 0.07)
    : withAlpha(palette.muted, 0.03);
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
          style={[styles.label, { color: granted ? palette.text : palette.muted }]}
          numberOfLines={1}
        >
          {label}
        </ThemedText>
      )}
    </View>
  );
}

export function ConsentGrid({ consents, compact = false, showLabels = false }: ConsentGridProps) {
  const consentTypes = consentService.getConsentTypes();

  return (
    <Row style={[styles.grid, { gap: compact ? 4 : Spacing.xs }]}>
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
    </Row>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexWrap: 'wrap',
  },
  item: {
    alignItems: 'center',
    borderRadius: Radii.sm,
    gap: Spacing.xxs,
  },
  iconContainer: {
    position: 'relative',
  },
  statusIcon: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    borderRadius: Radii.md,
    overflow: 'hidden',
  },
  label: { ...Typography.caption },
});
