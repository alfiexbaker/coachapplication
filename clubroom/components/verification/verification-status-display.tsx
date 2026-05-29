import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { VerificationStatus } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';
import { VerificationBadge } from './verification-badge-base';

export interface VerificationStatusDisplayProps {
  status: VerificationStatus;
}

export function VerificationStatusDisplay({ status }: VerificationStatusDisplayProps) {
  const { colors: palette } = useTheme();

  const items = [
    { label: 'Email', verified: status.email.status === 'VERIFIED' },
    { label: 'Phone', verified: status.phone.status === 'VERIFIED' },
    { label: 'ID', verified: status.identity.status === 'VERIFIED' },
    { label: 'Background', verified: status.backgroundCheck.status === 'VERIFIED' },
    { label: 'Credentials', verified: status.credentials.some((c) => c.status === 'VERIFIED') },
    { label: 'Insurance', verified: status.insurance.status === 'VERIFIED' },
  ];

  return (
    <View style={styles.statusDisplay}>
      <View style={styles.badgeRow}>
        <VerificationBadge level={status.overallLevel} size="large" />
      </View>
      <Row wrap gap="sm">
        {items.map((item) => (
          <Row key={item.label} align="center" gap="xxs" style={styles.statusItem}>
            <Ionicons
              name={item.verified ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={item.verified ? palette.success : palette.muted}
            />
            <ThemedText
              style={[
                styles.statusItemLabel,
                { color: item.verified ? palette.text : palette.muted },
              ]}
            >
              {item.label}
            </ThemedText>
          </Row>
        ))}
      </Row>
    </View>
  );
}

const styles = StyleSheet.create({
  statusDisplay: {
    gap: Spacing.sm,
  },
  badgeRow: {
    alignItems: 'flex-start',
  },
  statusItem: {
    minWidth: 90,
  },
  statusItemLabel: { ...Typography.small },
});
