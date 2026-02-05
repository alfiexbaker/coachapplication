import { useEffect, useMemo, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PARTICLE_COUNT = 35;
const DURATION = 3000;

const CONFETTI_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFE66D',
  '#A8E6CF',
  '#FF8B94',
  '#7EC8E3',
  '#C3AED6',
  '#FFD93D',
  '#6BCB77',
  '#FF6F91',
];

interface Particle {
  x: number;
  color: string;
  size: number;
  rotationSpeed: number;
  delay: number;
  swayAmplitude: number;
}

export interface ConfettiProps {
  active: boolean;
}

export function Confetti({ active }: ConfettiProps) {
  const scheme = useColorScheme() ?? 'light';
  const animationRef = useRef(new Animated.Value(0)).current;

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: 6 + Math.random() * 8,
      rotationSpeed: 360 + Math.random() * 720,
      delay: Math.random() * 600,
      swayAmplitude: 20 + Math.random() * 40,
    }));
  }, []);

  useEffect(() => {
    if (active) {
      animationRef.setValue(0);
      Animated.timing(animationRef, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    } else {
      animationRef.setValue(0);
    }
  }, [active, animationRef]);

  if (!active) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => {
        const translateY = animationRef.interpolate({
          inputRange: [0, 1],
          outputRange: [-particle.size, SCREEN_HEIGHT + particle.size],
        });

        const translateX = animationRef.interpolate({
          inputRange: [0, 0.25, 0.5, 0.75, 1],
          outputRange: [
            0,
            particle.swayAmplitude,
            0,
            -particle.swayAmplitude,
            0,
          ],
        });

        const rotate = animationRef.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${particle.rotationSpeed}deg`],
        });

        const opacity = animationRef.interpolate({
          inputRange: [0, 0.1, 0.8, 1],
          outputRange: [0, 1, 1, 0],
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: particle.x,
                width: particle.size,
                height: particle.size,
                borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                transform: [{ translateY }, { translateX }, { rotate }],
                opacity,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    top: 0,
  },
});
