import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ChatInputProps = {
  onAttach?: () => void;
  onSend?: (message: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onAttach, onSend, disabled }: ChatInputProps) {
  const { colors: palette, scheme } = useTheme();
  const [value, setValue] = useState('');
  const placeholderColor = useMemo(() => (scheme === 'dark' ? palette.muted : palette.muted), [scheme]);

  return (
    <View style={[styles.container, { borderColor: palette.border, backgroundColor: palette.card }]}
      accessibilityRole="none">
      <Pressable accessibilityRole="button" style={styles.iconButton} onPress={onAttach}>
        <IconSymbol name="paperclip" size={22} color={palette.icon} />
      </Pressable>
      <TextInput
        style={[styles.input, { color: palette.text }]}
        placeholder="Drop a note, media, or PDF"
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={setValue}
        multiline
        editable={!disabled}
      />
      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: value ? (pressed ? palette.tintPressed : palette.tint) : palette.surface,
            borderColor: value ? 'transparent' : palette.border,
          },
        ]}
        disabled={!value || disabled}
        onPress={() => {
          const trimmed = value.trim();
          if (!trimmed || disabled) return;
          onSend?.(trimmed);
          setValue('');
        }}>
        {value ? (
          <IconSymbol name="paperplane.fill" size={18} color={scheme === 'light' ? palette.onPrimary : palette.text} />
        ) : (
          <IconSymbol name="mic.fill" size={20} color={palette.icon} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { ...Typography.subheading, flex: 1,
    paddingVertical: Spacing.xs },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
