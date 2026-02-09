import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FamilyCalendarEvent } from '@/services/family';

interface NextSessionCardProps {
  session: FamilyCalendarEvent;
  onPress: (session: FamilyCalendarEvent) => void;
}

export const NextSessionCard = memo(function NextSessionCard({
  session,
  onPress,
}: NextSessionCardProps) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(() => onPress(session), [onPress, session]);

  const formattedDate = new Date(session.start).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
  const formattedTime = new Date(session.start).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <Clickable onPress={handlePress}>
      <SurfaceCard style={[styles.card, { borderColor: session.colorCode, borderWidth: 2 }]}>
        <View style={[styles.badge, { backgroundColor: withAlpha(session.colorCode, 0.09) }]}>
          <Ionicons name="time" size={16} color={session.colorCode} />
          <ThemedText style={[Typography.caption, { color: session.colorCode }]}>Next Up</ThemedText>
        </View>
        <ThemedText type="defaultSemiBold" style={Typography.subheading}>{session.title}</ThemedText>
        <Row gap="md" style={{ flexWrap: 'wrap' }}>
          <Row gap="xxs" align="center">
            <Ionicons name="person" size={14} color={palette.muted} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>{session.childName}</ThemedText>
          </Row>
          <Row gap="xxs" align="center">
            <Ionicons name="calendar" size={14} color={palette.muted} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>{formattedDate}</ThemedText>
          </Row>
          <Row gap="xxs" align="center">
            <Ionicons name="time" size={14} color={palette.muted} />
            <ThemedText style={[Typography.small, { color: palette.muted }]}>{formattedTime}</ThemedText>
          </Row>
        </Row>
      </SurfaceCard>
    </Clickable>
  );
});

const styles = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xxs, borderRadius: Radii.pill, alignSelf: 'flex-start' },
});
