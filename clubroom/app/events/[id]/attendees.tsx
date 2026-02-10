import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { AttendeeList } from '@/components/event/AttendeeList';
import { CheckInButton } from '@/components/event/CheckInButton';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEventAttendees } from '@/hooks/use-event-attendees';

export default function EventAttendeesScreen() {
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    event, rsvps, attendance, stats, currentAttendance, loading, refreshing,
    isCoach, isEventToday, checkInAvailable, currentUser,
    handleCheckIn, handleUndoCheckIn, handleAttendeePress, handleExport, handleSendReminder,
  } = useEventAttendees(id);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.tint} /></View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
          <ThemedText style={[styles.errorText, { color: colors.muted }]}>Event not found</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" style={[styles.header, { borderBottomColor: colors.border }]}>
        <Clickable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        <View style={styles.headerContent}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>Attendees</ThemedText>
          <ThemedText style={[styles.headerSubtitle, { color: colors.muted }]} numberOfLines={1}>{event.title}</ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </Row>

      {(isEventToday || checkInAvailable || currentAttendance) && currentUser && (
        <View style={styles.checkInSection}>
          <SurfaceCard style={styles.checkInCard}>
            {isEventToday && (
              <Row align="center" gap="xxs" style={styles.todayBadge}>
                <Ionicons name="today" size={14} color={colors.success} />
                <ThemedText style={[styles.todayText, { color: colors.success }]}>Event is today</ThemedText>
              </Row>
            )}
            <CheckInButton event={event} userId={currentUser.id} userName={currentUser.name || 'Unknown'} userRole={isCoach ? 'COACH' : 'PARENT'} userPhotoUrl={currentUser.avatar} currentAttendance={currentAttendance} onCheckIn={handleCheckIn} onUndoCheckIn={handleUndoCheckIn} />
          </SurfaceCard>
        </View>
      )}

      <View style={styles.listContainer}>
        <AttendeeList rsvps={rsvps} attendance={attendance} stats={stats || undefined} onAttendeePress={handleAttendeePress} showFilters showStats loading={refreshing} emptyMessage="No RSVPs yet. Be the first to respond!" />
      </View>

      {isCoach && (
        <Row gap="sm" style={[styles.coachActions, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Clickable style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleExport}>
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="download-outline" size={20} color={colors.text} />
              <ThemedText style={styles.actionText}>Export List</ThemedText>
            </Row>
          </Clickable>
          <Clickable style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={handleSendReminder}>
            <Row align="center" justify="center" gap="xxs">
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              <ThemedText style={styles.actionText}>Send Reminder</ThemedText>
            </Row>
          </Clickable>
        </Row>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg, gap: Spacing.md },
  errorText: { ...Typography.subheading, textAlign: 'center' },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerContent: { flex: 1, alignItems: 'center' },
  headerSubtitle: { ...Typography.caption },
  checkInSection: { padding: Spacing.md },
  checkInCard: { padding: Spacing.md, gap: Spacing.sm },
  todayBadge: { marginBottom: Spacing.xs },
  todayText: { ...Typography.smallSemiBold },
  listContainer: { flex: 1, paddingHorizontal: Spacing.md },
  coachActions: { padding: Spacing.md, borderTopWidth: 1 },
  actionButton: { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
  actionText: { ...Typography.smallSemiBold },
});
