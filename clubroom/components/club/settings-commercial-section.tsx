import React, { memo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubRole, OrganizationCommercialMode } from '@/constants/types';
import {
  COMMERCIAL_MODE_CHOICES,
  formatCommercialModeLabel,
} from '@/utils/organization-commercial-mode';
import { formatOrganizationRoleLabel } from '@/contracts/club-governance';

interface SettingsCommercialSectionProps {
  colors: ThemeColors;
  commercialMode: OrganizationCommercialMode;
  canEditCommercialMode: boolean;
  isSaving: boolean;
  viewerRole?: ClubRole;
  onSelectMode: (mode: OrganizationCommercialMode) => void;
}

function formatRole(role?: ClubRole): string {
  return formatOrganizationRoleLabel(role);
}

export const SettingsCommercialSection = memo(function SettingsCommercialSection({
  colors,
  commercialMode,
  canEditCommercialMode,
  isSaving,
  viewerRole,
  onSelectMode,
}: SettingsCommercialSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <View style={styles.header}>
          <ThemedText type="defaultSemiBold" style={Typography.heading}>
            Commercial Responsibility
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Decide who families are billed by for new club bookings. Clubroom does not process
            payments in-app.
          </ThemedText>
        </View>

        <View
          style={[
            styles.statusCard,
            {
              backgroundColor: withAlpha(colors.info, 0.08),
              borderColor: withAlpha(colors.info, 0.24),
            },
          ]}
        >
          <Row align="center" gap="xs">
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} />
            <ThemedText style={[Typography.smallSemiBold, { color: colors.text }]}>
              Current mode: {formatCommercialModeLabel(commercialMode)}
            </ThemedText>
          </Row>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            Changes only affect new club bookings. Existing bookings keep their stored billing and
            support ownership.
          </ThemedText>
        </View>

        {COMMERCIAL_MODE_CHOICES.map((option) => {
          const isSelected = option.value === commercialMode;
          const isDisabled = isSaving || !canEditCommercialMode || isSelected;

          return (
            <Clickable
              key={option.value}
              disabled={isDisabled}
              onPress={() => onSelectMode(option.value)}
              style={[
                styles.optionCard,
                {
                  borderColor: isSelected ? colors.tint : colors.border,
                  backgroundColor: isSelected
                    ? withAlpha(colors.tint, 0.08)
                    : withAlpha(colors.surface, 0.96),
                  opacity: isSaving && !isSelected ? 0.7 : 1,
                },
              ]}
              accessibilityLabel={`Use ${option.title} commercial mode`}
            >
              <Row align="center" justify="between" gap="sm">
                <View style={styles.optionCopy}>
                  <ThemedText style={Typography.subheading}>{option.title}</ThemedText>
                  <ThemedText style={[Typography.small, { color: colors.muted }]}>
                    {option.summary}
                  </ThemedText>
                </View>
                {isSaving && isSelected ? (
                  <ActivityIndicator color={colors.tint} />
                ) : (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor: isSelected
                          ? withAlpha(colors.tint, 0.14)
                          : withAlpha(colors.muted, 0.12),
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        Typography.caption,
                        { color: isSelected ? colors.tint : colors.muted, fontWeight: '700' },
                      ]}
                    >
                      {isSelected ? 'Current' : 'Available'}
                    </ThemedText>
                  </View>
                )}
              </Row>
              <ThemedText style={[Typography.small, { color: colors.muted }]}>
                {option.billingSummary}
              </ThemedText>
            </Clickable>
          );
        })}

        <View
          style={[
            styles.footerCard,
            {
              backgroundColor: withAlpha(colors.warning, 0.08),
              borderColor: withAlpha(colors.warning, 0.24),
            },
          ]}
        >
          <ThemedText style={[Typography.smallSemiBold, { color: colors.text }]}>
            Edit access
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            {canEditCommercialMode
              ? 'Only the owner can change this mode. You will be asked to confirm before it updates.'
              : `${formatRole(viewerRole)} access is read-only here. Only the owner can change billing responsibility.`}
          </ThemedText>
        </View>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  statusCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  optionCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  optionCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  badge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  footerCard: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
});
