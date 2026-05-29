import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Modal, StyleSheet } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { CardTier } from '@/types/progress-types';
import { HapticPatterns } from '@/utils/haptics';

const TIER_COLORS: Record<CardTier, string> = {
  bronze: '#CD7F32',
  silver: '#C0C0C0',
  gold: '#FFD700',
  platinum: '#4A90D9',
  diamond: '#E040FB',
};

export interface LevelUpCeremonyRef {
  show: (payload: { levelName: string; tier: CardTier }) => void;
}

interface LevelUpCeremonyProps {
  onComplete?: () => void;
  ref?: Ref<LevelUpCeremonyRef>;
}

export function LevelUpCeremony({ onComplete, ref }: LevelUpCeremonyProps) {
  const { colors } = useTheme();
  const confettiRef = useRef<ConfettiCannon>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const overlayOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.82);
  const titleScale = useSharedValue(0.6);
  const subtitleOpacity = useSharedValue(0);

  const [visible, setVisible] = useState(false);
  const [levelName, setLevelName] = useState('Progressing');
  const [tier, setTier] = useState<CardTier>('bronze');

  useImperativeHandle(
    ref,
    () => ({
      show: (payload: { levelName: string; tier: CardTier }) => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }

        const hide = () => {
          if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
          }
          overlayOpacity.set(withTiming(0, { duration: 240 }));
          cardScale.set(withTiming(0.96, { duration: 200 }));
          titleScale.set(withTiming(0.9, { duration: 180 }));
          subtitleOpacity.set(withTiming(0, { duration: 150 }));
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 250);
        };

        setLevelName(payload.levelName);
        setTier(payload.tier);
        setVisible(true);

        overlayOpacity.set(0);
        cardScale.set(0.82);
        titleScale.set(0.6);
        subtitleOpacity.set(0);

        overlayOpacity.set(withTiming(1, { duration: 220 }));
        cardScale.set(withSpring(1, { damping: 12, stiffness: 105 }));
        titleScale.set(withDelay(260, withSpring(1, { damping: 11, stiffness: 110 })));
        subtitleOpacity.set(withDelay(360, withTiming(1, { duration: 240 })));

        void HapticPatterns.levelUp();
        setTimeout(() => {
          confettiRef.current?.start();
        }, 280);

        timerRef.current = setTimeout(hide, 2600);
      },
    }),
    [cardScale, confettiRef, onComplete, overlayOpacity, subtitleOpacity, timerRef, titleScale],
  );

  const accent = TIER_COLORS[tier];

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: titleScale.value }],
  }));
  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View
        style={[styles.overlay, { backgroundColor: withAlpha(colors.text, 0.74) }, overlayStyle]}
      >
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              borderColor: withAlpha(accent, 0.38),
              backgroundColor: withAlpha(accent, 0.16),
            },
          ]}
        >
          <Column align="center" gap="sm">
            <Row
              align="center"
              justify="center"
              style={[
                styles.iconCircle,
                {
                  backgroundColor: withAlpha(accent, 0.22),
                  borderColor: withAlpha(accent, 0.4),
                },
              ]}
            >
              <Ionicons name="trophy" size={56} color={accent} />
            </Row>
            <Animated.View style={titleStyle}>
              <ThemedText style={[styles.title, { color: colors.onPrimary }]}>LEVEL UP</ThemedText>
            </Animated.View>
            <Animated.View style={subtitleStyle}>
              <ThemedText style={[styles.subtitle, { color: withAlpha(colors.onPrimary, 0.92) }]}>
                {levelName}
              </ThemedText>
            </Animated.View>
          </Column>
        </Animated.View>

        <ConfettiCannon
          ref={confettiRef}
          count={220}
          origin={{ x: -10, y: 0 }}
          autoStart={false}
          fadeOut
          explosionSpeed={360}
          fallSpeed={3200}
          colors={[accent, '#F59E0B', '#60A5FA', '#34D399']}
        />
      </Animated.View>
    </Modal>
  );
}

LevelUpCeremony.displayName = 'LevelUpCeremony';

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  iconCircle: {
    width: 126,
    height: 126,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  title: {
    ...Typography.display,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.heading,
    textAlign: 'center',
  },
});
