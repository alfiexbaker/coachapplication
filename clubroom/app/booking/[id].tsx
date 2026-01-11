import { useMemo } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { StatusBadge } from '@/components/booking/status-badge';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { upcomingBookings } from '@/constants/mock-data';
import { EmptyState } from '@/components/ui/empty-state';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { useSessionNote } from '@/hooks/use-session-note';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const booking = useMemo(() => upcomingBookings.find((b) => b.id === id), [id]);
  const {
    note: sessionNote,
    loading: sessionNoteLoading,
    error: sessionNoteError,
    refresh: refreshSessionNote,
  } = useSessionNote(id);

  if (!booking) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <EmptyState
          icon="warning"
          title="Booking not found"
          message="Double-check the link or pick a booking from the list."
          actionLabel="Back to bookings"
          onPressAction={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const followUpActions = [
    {
      label: 'Share homework reminder',
      completed: Boolean(sessionNote?.homework),
    },
    {
      label: 'Confirm attendance',
      completed: Boolean(sessionNote?.attendance),
    },
    {
      label: 'Log effort & focus',
      completed: Boolean(sessionNote?.effort && sessionNote?.focus?.length),
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, gap: 6 }}>
            <ThemedText type="title">{booking.service}</ThemedText>
            <ThemedText style={{ color: palette.muted }}>{booking.locationLabel}</ThemedText>
          </View>
          <StatusBadge status={booking.status as any} />
        </View>

        <SurfaceCard style={styles.card}>
          <InfoRow icon="person" label="Coach" value={booking.coachName} />
          <InfoRow icon="calendar" label="Date" value={new Date(booking.start).toLocaleString()} />
          <InfoRow
            icon="navigate"
            label="Directions"
            value={booking.locationLabel}
            actionLabel="Open"
            onAction={() => {
              const location = encodeURIComponent(booking.locationLabel);
              const url = `https://maps.google.com/?q=${location}`;
              Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open maps application.');
              });
            }}
          />
          <InfoRow icon="card" label="Payment" value="£65 (mock)" />
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <ThemedText type="defaultSemiBold">Actions</ThemedText>
          <View style={styles.actionRow}>
            <Clickable style={styles.actionButton} onPress={() => router.push('/chat')}>
              <Ionicons name="chatbubbles" size={18} color={palette.tint} />
              <ThemedText style={[styles.actionLabel, { color: palette.tint }]}>Message coach</ThemedText>
            </Clickable>
            <Clickable
              style={[styles.actionButton, { backgroundColor: `${palette.error}10` }]}
              onPress={() => {
                Alert.alert(
                  'Cancel Booking',
                  'Are you sure you want to cancel this session? Cancellation fees may apply.',
                  [
                    { text: 'Keep Booking', style: 'cancel' },
                    {
                      text: 'Cancel Session',
                      style: 'destructive',
                      onPress: () => {
                        Alert.alert('Booking Cancelled', 'Your session has been cancelled. Any refund will be processed within 3-5 business days.');
                        router.back();
                      }
                    },
                  ]
                );
              }}>
              <Ionicons name="close-circle" size={18} color={palette.error} />
              <ThemedText style={[styles.actionLabel, { color: palette.error }]}>Cancel</ThemedText>
            </Clickable>
          </View>
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Session notes & development</ThemedText>
            <Clickable style={styles.linkPill} onPress={() => router.push(`/session-notes/${id}`)}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
                {sessionNote ? 'View & edit' : 'Add notes'}
              </ThemedText>
            </Clickable>
          </View>

          {sessionNoteLoading && !sessionNote ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.tint} />
              <ThemedText style={{ color: palette.muted }}>Loading coach notes…</ThemedText>
            </View>
          ) : null}

          {sessionNoteError ? (
            <Clickable onPress={refreshSessionNote} style={styles.errorPill}>
              <Ionicons name="refresh" size={16} color={palette.error} />
              <ThemedText style={{ color: palette.error, fontWeight: '700' }}>Retry loading notes</ThemedText>
            </Clickable>
          ) : null}

          {sessionNote ? (
            <View style={{ gap: Spacing.sm }}>
              <SessionNotesView {...sessionNote} />
            </View>
          ) : !sessionNoteLoading ? (
            <View style={{ gap: Spacing.xs }}>
              <ThemedText style={{ color: palette.muted }}>
                Capture what was covered, effort and homework so parents can track the session.
              </ThemedText>
              <Clickable
                onPress={() => router.push(`/session-notes/${id}`)}
                style={[styles.ctaButton, { backgroundColor: `${palette.tint}12` }]}
              >
                <Ionicons name="create" size={16} color={palette.tint} />
                <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Add coach notes</ThemedText>
              </Clickable>
            </View>
          ) : null}
        </SurfaceCard>

        <SurfaceCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <ThemedText type="defaultSemiBold">Follow-ups parents will see</ThemedText>
            <Clickable style={styles.linkPill} onPress={refreshSessionNote}>
              <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>
                {sessionNoteLoading ? 'Refreshing…' : 'Sync now'}
              </ThemedText>
            </Clickable>
          </View>
          <View style={{ gap: Spacing.sm }}>
            {followUpActions.map((action) => (
              <View key={action.label} style={styles.metaItem}>
                <Ionicons
                  name={action.completed ? 'checkmark-circle' : 'radio-button-off'}
                  size={18}
                  color={action.completed ? palette.tint : palette.icon}
                />
                <ThemedText style={{ color: action.completed ? palette.tint : palette.muted }}>
                  {action.label}
                </ThemedText>
              </View>
            ))}
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  actionLabel,
  onAction,
}: {
  icon: string;
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <Ionicons name={icon as any} size={18} color={palette.icon} />
        <View style={{ gap: 2 }}>
          <ThemedText type="defaultSemiBold">{label}</ThemedText>
          <ThemedText style={{ color: palette.muted }}>{value}</ThemedText>
        </View>
      </View>
      {actionLabel ? (
        <Clickable style={styles.linkPill} onPress={onAction ?? (() => {})}>
          <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>{actionLabel}</ThemedText>
        </Clickable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  card: {
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  infoLeft: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  linkPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: '#f1f5f9',
  },
  errorPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    backgroundColor: `${Colors.light.error}10`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionLabel: {
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginTop: Spacing.sm,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  ctaButton: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.button,
    borderWidth: 1,
    borderColor: `${Colors.light.border}40`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    alignSelf: 'flex-start',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
