import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';

interface VerificationStatusCardProps {
  colors: ThemeColors;
  icon: ComponentProps<typeof Ionicons>['name'];
  tone: string;
  title: string;
  detail: string;
  footer?: ReactNode;
}

export function VerificationStatusCard({
  colors,
  icon,
  tone,
  title,
  detail,
  footer,
}: VerificationStatusCardProps) {
  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center">
        <View style={[styles.icon, { backgroundColor: withAlpha(tone, 0.1) }]}>
          <Ionicons name={icon} size={22} color={tone} />
        </View>
        <Column flex gap="xxs">
          <ThemedText type="defaultSemiBold">{title}</ThemedText>
          <ThemedText style={[styles.detail, { color: colors.muted }]}>{detail}</ThemedText>
        </Column>
      </Row>
      {footer}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.sm },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detail: { ...Typography.bodySmall },
});
