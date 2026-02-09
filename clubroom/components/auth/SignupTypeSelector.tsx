/**
 * Signup Type Selector Modal
 *
 * Lets users choose their account type during signup.
 * Options: Player, Parent/Guardian, Coach
 */

import { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export type SignupType = 'player' | 'parent' | 'coach';

interface AccountTypeOption {
  type: SignupType;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const ACCOUNT_TYPE_OPTIONS: AccountTypeOption[] = [
  {
    type: 'player',
    title: 'Player',
    subtitle: 'I play football',
    icon: 'football-outline',
  },
  {
    type: 'parent',
    title: 'Parent/Guardian',
    subtitle: "I manage my children's training",
    icon: 'people-outline',
  },
  {
    type: 'coach',
    title: 'Coach',
    subtitle: 'I coach players',
    icon: 'fitness-outline',
  },
];

interface SignupTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: SignupType) => void;
}

export function SignupTypeSelector({
  visible,
  onClose,
  onSelect,
}: SignupTypeSelectorProps) {
  const { colors: palette } = useTheme();
  const [selectedType, setSelectedType] = useState<SignupType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable onPress={handleClose}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle">Create Account</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleSection}>
            <ThemedText type="title" style={styles.title}>
              How will you use the app?
            </ThemedText>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              Select the option that best describes you. You can change this later.
            </ThemedText>
          </View>

          {/* Account Type Cards */}
          <View style={styles.cardsContainer}>
            {ACCOUNT_TYPE_OPTIONS.map((option) => {
              const isSelected = selectedType === option.type;

              return (
                <Clickable
                  key={option.type}
                  onPress={() => setSelectedType(option.type)}
                  accessibilityRole="button"
                  accessibilityLabel={`${option.title}: ${option.subtitle}`}
                  style={[
                    styles.card,
                    {
                      backgroundColor: isSelected
                        ? withAlpha(palette.tint, 0.03)
                        : palette.surface,
                      borderColor: isSelected ? palette.tint : palette.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: isSelected
                          ? withAlpha(palette.tint, 0.09)
                          : withAlpha(palette.tint, 0.03),
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={32}
                      color={isSelected ? palette.tint : palette.muted}
                    />
                  </View>
                  <View style={styles.cardText}>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[
                        styles.cardTitle,
                        isSelected ? { color: palette.tint } : undefined,
                      ]}
                    >
                      {option.title}
                    </ThemedText>
                    <ThemedText style={[styles.cardSubtitle, { color: palette.muted }]}>
                      {option.subtitle}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.radioOuter,
                      {
                        borderColor: isSelected ? palette.tint : palette.border,
                      },
                    ]}
                  >
                    {isSelected && (
                      <View
                        style={[styles.radioInner, { backgroundColor: palette.tint }]}
                      />
                    )}
                  </View>
                </Clickable>
              );
            })}
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Button
            onPress={handleContinue}
            disabled={!selectedType}
            variant="primary"
            style={styles.continueButton}
          >
            Continue
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  titleSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: Spacing.sm,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.lg,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: Spacing.micro,
  },
  cardTitle: {
    ...Typography.heading,
  },
  cardSubtitle: {
    ...Typography.body,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: Radii.sm,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  continueButton: {
    width: '100%',
  },
});
