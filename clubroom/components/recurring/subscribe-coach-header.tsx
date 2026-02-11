/**
 * SubscribeCoachHeader — Coach info card at top of subscribe form.
 */
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Radii, Typography } from '@/constants/theme';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { useTheme } from '@/hooks/useTheme';
import type { CoachInfo } from '@/hooks/use-subscribe-form';

interface Props {
  coach: CoachInfo;
}

function SubscribeCoachHeaderInner({ coach }: Props) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row align="center" gap="sm">
        {coach.photoUrl ? (
          <Image source={{ uri: coach.photoUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.placeholder, { backgroundColor: palette.border }]}>
            <Ionicons name="person" size={24} color={palette.muted} />
          </View>
        )}
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">{coach.name}</ThemedText>
          {coach.pricePerSession && (
            <ThemedText style={[styles.price, { color: palette.muted }]}>
              ${coach.pricePerSession} per session
            </ThemedText>
          )}
        </View>
      </Row>
    </SurfaceCard>
  );
}

export const SubscribeCoachHeader = memo(SubscribeCoachHeaderInner);

const styles = StyleSheet.create({
  card: { marginBottom: 0 },
  avatar: { width: 56, height: 56, borderRadius: Radii['2xl'] },
  placeholder: {
    width: 56,
    height: 56,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  price: { ...Typography.small },
});
