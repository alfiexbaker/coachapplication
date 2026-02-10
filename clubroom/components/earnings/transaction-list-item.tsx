import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

export function TransactionListItem({
  title,
  subtitle,
  amount,
  status,
}: {
  title: string;
  subtitle: string;
  amount: string;
  status: string;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row style={[styles.row, { borderBottomColor: palette.border }]}> 
      <View style={{ flex: 1 }}>
        <ThemedText type="defaultSemiBold">{title}</ThemedText>
        <ThemedText style={{ color: palette.muted }}>{subtitle}</ThemedText>
      </View>
      <View style={{ alignItems: 'flex-end', gap: Spacing.xxs }}>
        <ThemedText type="defaultSemiBold">{amount}</ThemedText>
        <ThemedText style={{ ...Typography.caption, color: palette.muted }}>{status}</ThemedText>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
});
