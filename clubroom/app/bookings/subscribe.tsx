/**
 * Subscribe Screen
 *
 * Coach selection → recurring booking form. Two-phase UI.
 * All state/logic in useSubscribe hook.
 */

import { View, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { ThemedView } from '@/components/themed-view';
import { SubscribeForm } from '@/components/recurring';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useSubscribe, type CoachOption } from '@/hooks/use-subscribe';

export default function SubscribeScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const c = useSubscribe();

  if (!c.selectedCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Stack.Screen options={{ title: 'Select a Coach', headerShown: true }} />
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Choose Your Coach</ThemedText>
          <ThemedText style={[styles.headerSubtext, { color: palette.muted }]}>
            Select a coach to set up recurring sessions with
          </ThemedText>
        </ThemedView>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.coachList} showsVerticalScrollIndicator={false}>
          {c.coaches.map((coach: CoachOption) => (
            <SurfaceCard key={coach.id} style={styles.coachCard} onPress={() => c.setSelectedCoach(coach)}>
              <Row style={styles.coachRow}>
                <Image source={{ uri: coach.photoUrl }} style={styles.coachAvatar} contentFit="cover" />
                <View style={styles.coachInfo}>
                  <ThemedText type="defaultSemiBold">{coach.name}</ThemedText>
                  <Row style={styles.coachMeta}>
                    <Ionicons name="star" size={14} color={palette.warning} />
                    <ThemedText style={[styles.coachMetaText, { color: palette.muted }]}>{coach.rating.toFixed(1)} ({coach.totalSessions} sessions)</ThemedText>
                  </Row>
                  <Row style={styles.coachMeta}>
                    <Ionicons name="location-outline" size={14} color={palette.muted} />
                    <ThemedText style={[styles.coachMetaText, { color: palette.muted }]}>{coach.location}</ThemedText>
                  </Row>
                </View>
                <View style={styles.coachPrice}>
                  <ThemedText type="defaultSemiBold" style={{ color: palette.tint }}>${coach.pricePerSession}</ThemedText>
                  <ThemedText style={[styles.priceLabel, { color: palette.muted }]}>/session</ThemedText>
                </View>
              </Row>
              <Row style={styles.specialtiesRow}>
                {coach.sessionTypes.slice(0, 3).map((specialty, index) => (
                  <View key={index} style={[styles.specialtyBadge, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
                    <ThemedText style={[styles.specialtyText, { color: palette.tint }]}>{specialty}</ThemedText>
                  </View>
                ))}
              </Row>
            </SurfaceCard>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ title: 'New Subscription', headerShown: true,
        headerLeft: () => (
          <Clickable accessibilityLabel="Go back" onPress={c.clearCoach} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color={palette.foreground} />
          </Clickable>
        ),
      }} />
      <SubscribeForm
        coach={{ id: c.selectedCoach.id, name: c.selectedCoach.name, photoUrl: c.selectedCoach.photoUrl,
          sessionTypes: c.selectedCoach.sessionTypes, pricePerSession: c.selectedCoach.pricePerSession, location: c.selectedCoach.location }}
        userId={c.currentUser?.id || 'user1'} userName={c.currentUser?.fullName || 'Guest User'}
        athletes={c.athletes} onSubmit={c.handleSubmit} onCancel={c.handleCancel} submitting={c.submitting} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  headerSubtext: { ...Typography.small, marginTop: Spacing.xxs },
  headerButton: { padding: Spacing.xs },
  scrollView: { flex: 1 },
  coachList: { padding: Spacing.md, gap: Spacing.sm },
  coachCard: { gap: Spacing.sm },
  coachRow: { alignItems: 'center', gap: Spacing.sm },
  coachAvatar: { width: 56, height: 56, borderRadius: Radii['2xl'] },
  coachInfo: { flex: 1, gap: Spacing.micro },
  coachMeta: { alignItems: 'center', gap: Spacing.xxs },
  coachMetaText: { ...Typography.small },
  coachPrice: { alignItems: 'flex-end' },
  priceLabel: { ...Typography.caption },
  specialtiesRow: { flexWrap: 'wrap', gap: Spacing.xs },
  specialtyBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  specialtyText: { ...Typography.caption },
});
