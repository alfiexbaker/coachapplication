import { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, type SharedValue } from 'react-native-reanimated';

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

function ConfettiParticle({ anim, particle }: { anim: SharedValue<number>; particle: Particle }) {
  const style = useAnimatedStyle(() => {
    const translateY = interpolate(anim.value, [0, 1], [-particle.size, SCREEN_HEIGHT + particle.size]);
    const translateX = interpolate(anim.value, [0, 0.25, 0.5, 0.75, 1], [0, particle.swayAmplitude, 0, -particle.swayAmplitude, 0]);
    const rotate = interpolate(anim.value, [0, 1], [0, particle.rotationSpeed]);
    const opacity = interpolate(anim.value, [0, 0.1, 0.8, 1], [0, 1, 1, 0]);

    return {
      left: particle.x,
      width: particle.size,
      height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: particle.color,
      transform: [{ translateY }, { translateX }, { rotate: `${rotate}deg` }],
      opacity,
    };
  });

  return <Animated.View style={[styles.particle, style]} />;
}

export function Confetti({ active }: ConfettiProps) {
  const animationRef = useSharedValue(0);

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
      animationRef.value = 0;
      animationRef.value = withTiming(1, { duration: DURATION, easing: Easing.linear });
    } else {
      animationRef.value = 0;
    }
  }, [active, animationRef]);

  if (!active) {
    return null;
  }

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map((particle, index) => (
        <ConfettiParticle key={index} anim={animationRef} particle={particle} />
      ))}
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
