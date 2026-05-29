import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface CoachBadgeData {
  qualificationLevel?: string;
  yearsExperience?: number;
  dbsChecked?: boolean;
}

interface CoachBadgeProps {
  coach: CoachBadgeData;
}

function buildSubtitle(coach: CoachBadgeData): string {
  const qualification = coach.qualificationLevel?.trim();
  const yearsExperience = coach.yearsExperience;
  const currentYear = new Date().getFullYear();
  const sinceYear =
    typeof yearsExperience === 'number' && yearsExperience > 0
      ? currentYear - yearsExperience
      : null;

  if (qualification && sinceYear) {
    return `${qualification} · Since ${sinceYear}`;
  }

  if (qualification) {
    return qualification;
  }

  if (sinceYear) {
    return `Since ${sinceYear}`;
  }

  return 'Qualified coach';
}

export const CoachBadge = function CoachBadge({ coach }: CoachBadgeProps) {
  const { colors } = useTheme();
  const subtitle = buildSubtitle(coach);

  return (
    <Row align="center" gap="xxs" wrap>
      <Ionicons name="shield-checkmark" size={14} color={colors.success} />
      <ThemedText style={[styles.label, { color: colors.muted }]}>{subtitle}</ThemedText>
      {coach.dbsChecked ? (
        <View
          style={[
            styles.dbsChip,
            {
              backgroundColor: withAlpha(colors.success, 0.12),
              borderColor: withAlpha(colors.success, 0.3),
            },
          ]}
        >
          <ThemedText style={[styles.dbsText, { color: colors.success }]}>DBS</ThemedText>
        </View>
      ) : null}
    </Row>
  );
};

const styles = StyleSheet.create({
  label: {
    ...Typography.caption,
  },
  dbsChip: {
    minHeight: 20,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.xxs,
    justifyContent: 'center',
  },
  dbsText: {
    ...Typography.micro,
  },
});
