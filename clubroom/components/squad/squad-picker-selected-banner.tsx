import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface SelectedBannerProps {
  selectedCount: number;
  totalMembers: number;
}

export function SelectedBanner({ selectedCount, totalMembers }: SelectedBannerProps) {
  const { colors: palette } = useTheme();

  if (selectedCount === 0) return null;

  return (
    <Row
      align="center"
      gap="sm"
      style={[styles.selectedBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
    >
      <Ionicons name="people" size={18} color={palette.tint} />
      <ThemedText style={{ color: palette.tint, fontWeight: '600', flex: 1 }}>
        {selectedCount} squad{selectedCount !== 1 ? 's' : ''} selected
        {totalMembers > 0 && ` (${totalMembers} athletes)`}
      </ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  selectedBanner: {
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
});
