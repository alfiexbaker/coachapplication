/**
 * StepAccountType — Account type selection step of onboarding.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, Components, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AccountType } from '@/services/auth-service';
import { ACCOUNT_TYPES } from './onboarding-types';

interface StepAccountTypeProps {
  accountType: AccountType | null;
  onSelectAccountType: (type: AccountType) => void;
}

function StepAccountTypeInner({ accountType, onSelectAccountType }: StepAccountTypeProps) {
  const { colors: palette } = useTheme();

  return (
    <View style={styles.content}>
      <ThemedText type="title" style={styles.title}>
        How will you use Clubroom?
      </ThemedText>
      <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
        Choose your account type. You can always change this later.
      </ThemedText>

      <View style={styles.grid}>
        {ACCOUNT_TYPES.map((item) => {
          const isSelected = accountType === item.type;
          return (
            <Clickable
              key={item.type}
              onPress={() => onSelectAccountType(item.type)}
              accessibilityLabel={`Select ${item.title}`}
              style={[
                styles.card,
                {
                  backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.card,
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: isSelected ? palette.tint : withAlpha(palette.muted, 0.12) },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={Components.icon.lg}
                  color={isSelected ? palette.onPrimary : palette.muted}
                />
              </View>
              <ThemedText type="defaultSemiBold" style={styles.cardTitle}>
                {item.title}
              </ThemedText>
              <ThemedText style={[styles.cardDesc, { color: palette.muted }]}>
                {item.description}
              </ThemedText>
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: palette.tint }]}>
                  <Ionicons name="checkmark" size={14} color={palette.onPrimary} />
                </View>
              )}
            </Clickable>
          );
        })}
      </View>
    </View>
  );
}

export const StepAccountType = memo(StepAccountTypeInner);

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.body,
    marginTop: -Spacing.xs,
  },
  grid: {
    gap: Spacing.sm,
  },
  card: {
    padding: Spacing.md,
    borderRadius: Radii.card,
    borderWidth: 2,
    gap: Spacing.xs,
    position: 'relative',
  },
  iconCircle: {
    width: Components.avatar.md,
    height: Components.avatar.md,
    borderRadius: Components.avatar.md / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    ...Typography.body,
  },
  cardDesc: {
    ...Typography.small,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
