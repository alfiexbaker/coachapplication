import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface WarningBoxProps {
  archive: boolean;
}

export function WarningBox({ archive }: WarningBoxProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      align="center"
      gap="sm"
      style={[
        styles.warningBox,
        { backgroundColor: withAlpha(palette.warning, 0.06), borderColor: palette.warning },
      ]}
    >
      <Ionicons name="information-circle" size={18} color={palette.warning} />
      <ThemedText style={{ ...Typography.small, color: palette.warning, flex: 1 }}>
        {archive
          ? 'This will remove them from active roster but keep their history.'
          : 'This action cannot be undone. All data will be permanently deleted.'}
      </ThemedText>
    </Row>
  );
}

const styles = StyleSheet.create({
  warningBox: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
