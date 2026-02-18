import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Radii, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type ChatInputProps = {
  onAttach?: () => void;
  onSend?: (message: string) => void;
  disabled?: boolean;
  initialValue?: string;
};

export function ChatInput({ onAttach, onSend, disabled, initialValue }: ChatInputProps) {
  const { colors: palette, scheme } = useTheme();
  const [value, setValue] = useState(initialValue ?? '');
  const placeholderColor = palette.muted;
  const canAttach = Boolean(onAttach) && !disabled;

  return (
    <Row
      align="flex-end"
      gap="sm"
      style={[styles.container, { borderColor: palette.border, backgroundColor: palette.card }]}
      accessibilityRole="none"
    >
      <Clickable
        accessibilityRole="button"
        accessibilityLabel="Attach media or file"
        accessibilityState={{ disabled: !canAttach }}
        style={[styles.iconButton, !canAttach && { opacity: 0.45 }]}
        onPress={canAttach ? onAttach : undefined}
        disabled={!canAttach}
      >
        <IconSymbol name="paperclip" size={22} color={palette.icon} />
      </Clickable>
      <TextInput
        style={[styles.input, { color: palette.text }]}
        placeholder="Drop a note, media, or PDF"
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={setValue}
        multiline
        editable={!disabled}
      />
      <Clickable
        accessibilityRole="button"
        accessibilityLabel={value ? 'Send message' : 'Record voice message'}
        style={({ pressed }) => [
          styles.sendButton,
          {
            backgroundColor: value
              ? pressed
                ? palette.tintPressed
                : palette.tint
              : palette.surface,
            borderColor: value ? 'transparent' : palette.border,
          },
        ]}
        disabled={!value || disabled}
        accessibilityState={{ disabled: !value || Boolean(disabled) }}
        onPress={() => {
          const trimmed = value.trim();
          if (!trimmed || disabled) return;
          onSend?.(trimmed);
          setValue('');
        }}
      >
        {value ? (
          <IconSymbol
            name="paperplane.fill"
            size={18}
            color={scheme === 'light' ? palette.onPrimary : palette.text}
          />
        ) : (
          <IconSymbol name="mic.fill" size={20} color={palette.icon} />
        )}
      </Clickable>
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.sm,
  },
  iconButton: {
    height: 36,
    width: 36,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: { ...Typography.subheading, flex: 1, paddingVertical: Spacing.xs },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
