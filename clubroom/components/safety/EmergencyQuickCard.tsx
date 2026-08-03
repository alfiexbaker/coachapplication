import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Row } from '@/components/primitives/row';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Radii, Spacing, Typography, Components, withAlpha } from '@/constants/theme';
import { safetyService } from '@/services/safety-service';
import type { EmergencyContact } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import {
  EmergencyCallSection,
  NoContactWarning,
} from './emergency-quick-card-sections';

// Re-export extracted components for backward compat
export {
  EmergencyCallSection,
  NoContactWarning,
} from './emergency-quick-card-sections';
export type {
  EmergencyCallSectionProps,
  NoContactWarningProps,
} from './emergency-quick-card-sections';

type AlertLevel = 'none' | 'low' | 'medium' | 'high';

interface EmergencyQuickCardProps {
  athleteName: string;
  alertLevel: AlertLevel;
  primaryContact: EmergencyContact | null;
  onCallPrimary?: () => void;
  onPress?: () => void;
}

export function EmergencyQuickCard({
  athleteName,
  alertLevel,
  primaryContact,
  onCallPrimary,
  onPress,
}: EmergencyQuickCardProps) {
  const { colors: palette } = useTheme();

  const alertColor = safetyService.getAlertLevelColor(alertLevel);
  const alertLabel = safetyService.getAlertLevelLabel(alertLevel);
  const hasAlerts = alertLevel !== 'none';

  return (
    <SurfaceCard
      style={[styles.card, { borderColor: withAlpha(alertColor, 0.19) }]}
      onPress={onPress}
    >
      {/* Header */}
      <Row align="center" gap="md" style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: withAlpha(alertColor, 0.09) }]}>
          <Ionicons
            name={hasAlerts ? 'warning' : 'shield-checkmark'}
            size={24}
            color={alertColor}
          />
        </View>
        <View style={styles.headerInfo}>
          <ThemedText type="defaultSemiBold" numberOfLines={1} style={styles.athleteName}>
            {athleteName}
          </ThemedText>
          <Row
            align="center"
            gap="xxs"
            style={[styles.alertBadge, { backgroundColor: withAlpha(alertColor, 0.09) }]}
          >
            <View style={[styles.alertDot, { backgroundColor: alertColor }]} />
            <ThemedText style={[styles.alertText, { color: alertColor }]}>{alertLabel}</ThemedText>
          </Row>
        </View>
      </Row>

      {primaryContact ? (
        <EmergencyCallSection contact={primaryContact} onCall={onCallPrimary} palette={palette} />
      ) : (
        <NoContactWarning palette={palette} />
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  header: {
    padding: Components.card.padding,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  athleteName: { ...Typography.heading },
  alertBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    marginTop: Spacing.xxs,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.xs,
  },
  alertText: { ...Typography.caption },
});
