import { memo, useState, useCallback } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface MedicalTagInputProps {
  label: string;
  placeholder: string;
  items: string[];
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
}

export const MedicalTagInput = memo(function MedicalTagInput({
  label, placeholder, items, onAdd, onRemove,
}: MedicalTagInputProps) {
  const { colors } = useTheme();
  const [inputValue, setInputValue] = useState('');

  const handleAdd = useCallback(() => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, onAdd]);

  return (
    <View style={styles.container}>
      <ThemedText style={Typography.bodySmallSemiBold}>{label}</ThemedText>
      <Row gap="xs">
        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Clickable accessibilityLabel="Add medical tag" onPress={handleAdd} style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={20} color={colors.onPrimary} />
        </Clickable>
      </Row>
      {items.length > 0 && (
        <View style={styles.tagList}>
          {items.map((item, index) => (
            <View key={index} style={[styles.tag, { backgroundColor: withAlpha(colors.tint, 0.06), borderColor: colors.border }]}>
              <ThemedText style={Typography.small}>{item}</ThemedText>
              <Clickable onPress={() => onRemove(index)}>
                <Ionicons name="close" size={16} color={colors.muted} />
              </Clickable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { gap: Spacing.xs },
  input: { borderWidth: 1.5, borderRadius: Radii.md, padding: Spacing.sm, ...Typography.body },
  addButton: { width: 44, height: 44, borderRadius: Radii.md, justifyContent: 'center', alignItems: 'center' },
  tagList: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  tag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
});
