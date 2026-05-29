import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';

interface StatusBannerProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
}

function StatusBannerComponent({ icon, label, color }: StatusBannerProps) {
  return (
    <Row
      align="center"
      gap="xs"
      style={[styles.banner, { backgroundColor: withAlpha(color, 0.09) }]}
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={color} />
      <ThemedText style={[Typography.bodySemiBold, { color }]}>{label}</ThemedText>
    </Row>
  );
}

export const StatusBanner = StatusBannerComponent;

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
});
