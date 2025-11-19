import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function ChatInput() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [value, setValue] = useState('');
  const placeholderColor = useMemo(() => (scheme === 'dark' ? '#94A3B8' : '#94A3B8'), [scheme]);

  return (
    <View style={[styles.container, { borderColor: palette.border, backgroundColor: palette.card }]}
      accessibilityRole="none">
      <Pressable accessibilityRole="button" style={styles.iconButton}>
        <IconSymbol name="paperclip" size={22} color={palette.icon} />
      </Pressable>
      <TextInput
        style={[styles.input, { color: palette.text }]}
        placeholder="Drop a note, media, or PDF"
        placeholderTextColor={placeholderColor}
        value={value}
        onChangeText={setValue}
        multiline
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
        disabled={!value}
        onPress={() => setValue('')}>
        {value ? (
          <IconSymbol name="paperplane.fill" size={18} color="#FFFFFF" />
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
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  sendButton: {
    height: 40,
    width: 40,
    borderRadius: Radii.pill,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
