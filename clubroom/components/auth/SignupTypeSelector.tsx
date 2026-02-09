/**
 * Signup Type Selector Modal
 *
 * Lets users choose their account type during signup.
 */

import { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

// Re-export extracted components for backward compat
export { ACCOUNT_TYPE_OPTIONS, AccountTypeCard } from './signup-type-selector-sections';
export type { SignupType, AccountTypeOption, AccountTypeCardProps } from './signup-type-selector-sections';

import { ACCOUNT_TYPE_OPTIONS, AccountTypeCard } from './signup-type-selector-sections';
import type { SignupType } from './signup-type-selector-sections';

interface SignupTypeSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: SignupType) => void;
}

export function SignupTypeSelector({ visible, onClose, onSelect }: SignupTypeSelectorProps) {
  const { colors: palette } = useTheme();
  const [selectedType, setSelectedType] = useState<SignupType | null>(null);

  const handleContinue = () => {
    if (selectedType) onSelect(selectedType);
  };

  const handleClose = () => {
    setSelectedType(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Clickable accessibilityLabel="Close" onPress={handleClose}>
            <Ionicons name="close" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="subtitle">Create Account</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <View style={styles.titleSection}>
            <ThemedText type="title" style={styles.title}>How will you use the app?</ThemedText>
            <ThemedText style={[styles.description, { color: palette.muted }]}>
              Select the option that best describes you. You can change this later.
            </ThemedText>
          </View>

          <View style={styles.cardsContainer}>
            {ACCOUNT_TYPE_OPTIONS.map((option) => (
              <AccountTypeCard
                key={option.type}
                option={option}
                isSelected={selectedType === option.type}
                onSelect={() => setSelectedType(option.type)}
                palette={palette}
              />
            ))}
          </View>
        </View>

        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          <Button onPress={handleContinue} disabled={!selectedType} variant="primary" style={styles.continueButton}>
            Continue
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  titleSection: { marginBottom: Spacing.xl },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  description: { ...Typography.body, textAlign: 'center' },
  cardsContainer: { gap: Spacing.sm },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  continueButton: { width: '100%' },
});
