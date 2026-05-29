/**
 * Subscribe Screen
 *
 * Coach selection → recurring booking form. Two-phase UI.
 * All state/logic in useSubscribe hook.
 */

import { View, StyleSheet, FlatList, RefreshControl, type ListRenderItemInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Clickable } from '@/components/primitives/clickable';
import { Image } from 'expo-image';
import type { ReactNode } from 'react';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { ThemedView } from '@/components/themed-view';
import { SubscribeForm } from '@/components/recurring';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Spacing, Typography, Radii, withAlpha } from '@/constants/theme';
import { useSubscribe, type CoachOption } from '@/hooks/use-subscribe';
import type { ThemeColors } from '@/hooks/useTheme';

export default function SubscribeScreen() {
  const c = useSubscribe();
  const palette = c.colors;
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );
  const renderCoachSelectionShell = (content: ReactNode) =>
    renderShell(
      <>
        <Stack.Screen options={{ title: 'Select a Coach', headerShown: true }} />
        {content}
      </>,
    );

  if (c.status === 'loading') {
    return renderCoachSelectionShell(<LoadingState variant="list" />);
  }

  if (c.status === 'error') {
    return renderCoachSelectionShell(
      <ErrorState message={c.error?.message ?? 'Failed to load coaches'} onRetry={c.retry} />,
    );
  }

  if (c.status === 'empty') {
    return renderCoachSelectionShell(
      <EmptyState
        icon="people-outline"
        title="No coaches available"
        message="No coaches are available for recurring bookings right now. Pull to refresh and try again."
        actionLabel="Retry"
        onPressAction={c.onRefresh}
      />,
    );
  }

  if (!c.selectedCoach) {
    const coachItems = getCoachSelectionItems(c.coaches, palette, c.setSelectedCoach);

    return renderCoachSelectionShell(
      <>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">Choose Your Coach</ThemedText>
          <ThemedText style={[styles.headerSubtext, { color: palette.muted }]}>
            Select a coach to set up recurring sessions with
          </ThemedText>
        </ThemedView>
        <FlatList
          style={styles.scrollView}
          contentContainerStyle={styles.coachList}
          showsVerticalScrollIndicator={false}
          data={coachItems}
          keyExtractor={keyCoachSelectionItem}
          renderItem={renderCoachSelectionItem}
          refreshControl={
            <RefreshControl
              refreshing={c.refreshing}
              onRefresh={c.onRefresh}
              tintColor={palette.tint}
            />
          }
        />
      </>,
    );
  }

  return renderShell(
    <>
      <Stack.Screen
        options={{
          title: 'New Subscription',
          headerShown: true,
          headerLeft: () => (
            <Clickable
              accessibilityLabel="Go back"
              onPress={c.clearCoach}
              style={styles.headerButton}
            >
              <Ionicons name="arrow-back" size={24} color={palette.foreground} />
            </Clickable>
          ),
        }}
      />
      <SubscribeForm
        coach={{
          id: c.selectedCoach.id,
          name: c.selectedCoach.name,
          photoUrl: c.selectedCoach.photoUrl,
          sessionTypes: c.selectedCoach.sessionTypes,
          pricePerSession: c.selectedCoach.pricePerSession,
          location: c.selectedCoach.location,
        }}
        userId={c.currentUser?.id || 'user1'}
        userName={c.currentUser?.fullName || 'Guest User'}
        athletes={c.athletes}
        onSubmit={c.handleSubmit}
        onCancel={c.handleCancel}
        submitting={c.submitting}
      />
    </>,
  );
}

interface CoachSelectionItem {
  key: string;
  coach: CoachOption;
  palette: ThemeColors;
  onPress: () => void;
}

function getCoachSelectionItems(
  coaches: CoachOption[],
  palette: ThemeColors,
  onSelectCoach: (coach: CoachOption) => void,
): CoachSelectionItem[] {
  return coaches.map((coach) => ({
    key: coach.id,
    coach,
    palette,
    onPress: () => onSelectCoach(coach),
  }));
}

function keyCoachSelectionItem(item: CoachSelectionItem): string {
  return item.key;
}

function renderCoachSelectionItem({ item }: ListRenderItemInfo<CoachSelectionItem>) {
  return (
    <SurfaceCard style={styles.coachCard} onPress={item.onPress}>
      <Row style={styles.coachRow}>
        <Image
          source={{ uri: item.coach.photoUrl }}
          style={styles.coachAvatar}
          contentFit="cover"
        />
        <View style={styles.coachInfo}>
          <ThemedText type="defaultSemiBold">{item.coach.name}</ThemedText>
          <Row style={styles.coachMeta}>
            <Ionicons name="star" size={14} color={item.palette.warning} />
            <ThemedText style={[styles.coachMetaText, { color: item.palette.muted }]}>
              {item.coach.rating.toFixed(1)} ({item.coach.totalSessions} sessions)
            </ThemedText>
          </Row>
          <Row style={styles.coachMeta}>
            <Ionicons name="location-outline" size={14} color={item.palette.muted} />
            <ThemedText style={[styles.coachMetaText, { color: item.palette.muted }]}>
              {item.coach.location}
            </ThemedText>
          </Row>
        </View>
        <View style={styles.coachPrice}>
          <ThemedText type="defaultSemiBold" style={{ color: item.palette.tint }}>
            ${item.coach.pricePerSession}
          </ThemedText>
          <ThemedText style={[styles.priceLabel, { color: item.palette.muted }]}>
            /session
          </ThemedText>
        </View>
      </Row>
      <Row style={styles.specialtiesRow}>
        {item.coach.sessionTypes.slice(0, 3).map((specialty) => (
          <View
            key={specialty}
            style={[styles.specialtyBadge, { backgroundColor: withAlpha(item.palette.tint, 0.1) }]}
          >
            <ThemedText style={[styles.specialtyText, { color: item.palette.tint }]}>
              {specialty}
            </ThemedText>
          </View>
        ))}
      </Row>
    </SurfaceCard>
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
  specialtyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  specialtyText: { ...Typography.caption },
});
