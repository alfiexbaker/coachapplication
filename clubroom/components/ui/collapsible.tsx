import { PropsWithChildren, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Row } from '@/components/primitives/row';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export function Collapsible({ children, title }: PropsWithChildren & { title: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const { colors: palette } = useTheme();
  const animatedHeight = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener?.('reduceMotionChanged', setReduceMotion);
    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  useEffect(() => {
    const duration = reduceMotion ? 0 : isOpen ? 250 : 200;
    animatedHeight.value = withTiming(isOpen ? contentHeight : 0, { duration });
  }, [animatedHeight, contentHeight, isOpen, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value,
    overflow: 'hidden',
  }));

  return (
    <ThemedView>
      <Clickable
        style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        onPress={() => setIsOpen((value) => !value)}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${title}`}
        accessibilityState={{ expanded: isOpen }}
      >
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
      </Clickable>
      <Animated.View style={animatedStyle}>
        <View
          onLayout={(event) => {
            const nextHeight = Math.ceil(event.nativeEvent.layout.height);
            setContentHeight((prev) => (prev === nextHeight ? prev : nextHeight));
          }}
          style={styles.measureWrapper}
          pointerEvents={isOpen ? 'auto' : 'none'}
        >
          <ThemedView style={styles.content}>{children}</ThemedView>
        </View>
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  measureWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  content: {
    marginTop: Spacing.xxs,
    marginLeft: Spacing.md,
  },
});
