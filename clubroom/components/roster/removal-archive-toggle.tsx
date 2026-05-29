import { StyleSheet, Switch, View } from 'react-native';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ArchiveToggleProps {
  archive: boolean;
  onToggle: (value: boolean) => void;
}

export function ArchiveToggle({ archive, onToggle }: ArchiveToggleProps) {
  const { colors: palette } = useTheme();

  return (
    <Row
      align="center"
      justify="between"
      style={[styles.archiveRow, { borderColor: palette.border }]}
    >
      <View style={styles.archiveInfo}>
        <ThemedText type="defaultSemiBold">Keep history</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>
          Archive session history and notes for records
        </ThemedText>
      </View>
      <Switch
        value={archive}
        onValueChange={onToggle}
        trackColor={{ false: palette.border, true: palette.tint }}
        thumbColor={archive ? palette.background : palette.surface}
      />
    </Row>
  );
}

const styles = StyleSheet.create({
  archiveRow: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  archiveInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
});
