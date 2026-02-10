import { PropsWithChildren, useState } from 'react';
import { StyleSheet, Pressable } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Row } from '@/components/primitives/row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { colors: palette } = useTheme();

  return (
    <ThemedView>
      <Pressable
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        onPress={() => setIsOpen((value) => !value)}>
        <Row align="center" gap="xxs">
          <IconSymbol
            name="chevron.right"
            size={18}
            weight="medium"
            color={palette.icon}
            style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
          />

          <ThemedText type="defaultSemiBold">{title}</ThemedText>
        </Row>
      </Pressable>
      {isOpen && <ThemedView style={styles.content}>{children}</ThemedView>}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  content: {
    marginTop: Spacing.xxs,
    marginLeft: 24,
  },
});
