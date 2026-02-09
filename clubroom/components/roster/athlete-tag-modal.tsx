import React, { memo } from 'react';
import { View, StyleSheet, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface AthleteTagModalProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const AthleteTagModal = memo(function AthleteTagModal({
  visible,
  value,
  onChangeText,
  onSubmit,
  onClose,
}: AthleteTagModalProps) {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: colors.surface }]}>
          <Row gap="sm" align="center" justify="space-between" style={styles.header}>
            <ThemedText type="title">Add Tag</ThemedText>
            <Clickable accessibilityLabel="Close" onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Clickable>
          </Row>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
            placeholder="Enter tag name..."
            placeholderTextColor={colors.muted}
            value={value}
            onChangeText={onChangeText}
            autoFocus
            accessibilityLabel="Tag name"
          />
          <Button onPress={onSubmit} disabled={!value.trim()}>
            Add Tag
          </Button>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    gap: Spacing.sm,
  },
  header: {
    marginBottom: Spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.body,
  },
});
