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
import { Row } from '@/components/primitives';

interface StepAccountTypeProps {
  accountType: AccountType | null;
  onSelectAccountType: (type: AccountType) => void;
}

function StepAccountTypeInner({ accountType, onSelectAccountType }: StepAccountTypeProps) {
  const { colors: palette } = useTheme();
  const selectedType = ACCOUNT_TYPES.find((item) => item.type === accountType) ?? null;

  const selectedHighlights =
    accountType === 'COACH'
      ? ['Build a coaching profile', 'Set rates and availability', 'Grow bookings with trust signals']
      : ['Discover nearby coaches', 'Track progress and milestones', 'Book and manage sessions fast'];

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

      <View
        style={[
          styles.previewCard,
          {
            backgroundColor: selectedType ? withAlpha(palette.tint, 0.05) : withAlpha(palette.text, 0.02),
            borderColor: selectedType ? withAlpha(palette.tint, 0.16) : palette.border,
          },
        ]}
      >
        {selectedType ? (
          <>
            <Row style={styles.previewHeader}>
              <View style={[styles.previewIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
                <Ionicons name={selectedType.icon} size={18} color={palette.tint} />
              </View>
              <View style={styles.previewCopy}>
                <ThemedText style={styles.previewTitle}>{selectedType.title} selected</ThemedText>
                <ThemedText style={[styles.previewSubtitle, { color: palette.muted }]}>
                  Great choice. Next we will tailor the form to this role.
                </ThemedText>
              </View>
            </Row>
            <View style={styles.previewList}>
              {selectedHighlights.map((item) => (
                <Row key={item} style={styles.previewListItem}>
                  <Ionicons name="checkmark-circle" size={14} color={palette.tint} />
                  <ThemedText style={[styles.previewListText, { color: palette.foreground }]}>
                    {item}
                  </ThemedText>
                </Row>
              ))}
            </View>
          </>
        ) : (
          <Row style={styles.placeholderRow}>
            <Ionicons name="sparkles-outline" size={16} color={palette.muted} />
            <ThemedText style={[styles.placeholderText, { color: palette.muted }]}>
              Select an account type to preview your onboarding journey.
            </ThemedText>
          </Row>
        )}
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
  previewCard: {
    borderRadius: Radii.card,
    borderWidth: 1,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  previewHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  previewTitle: {
    ...Typography.bodySemiBold,
  },
  previewSubtitle: {
    ...Typography.small,
  },
  previewList: {
    gap: Spacing.xxs,
  },
  previewListItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewListText: {
    ...Typography.small,
    flex: 1,
  },
  placeholderRow: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  placeholderText: {
    ...Typography.small,
    flex: 1,
  },
});
