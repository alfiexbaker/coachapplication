import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { SessionNotesForm } from '@/components/session/session-notes-form';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { Clickable } from '@/components/primitives/clickable';
import { useSessionNote } from '@/hooks/use-session-note';
import { SessionNoteFields } from '@/services/progress-service';
import { ok } from '@/types/result';

export default function SessionNotesScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { note, loading, saving, error, persist, refresh } = useSessionNote(bookingId);
  const [mode, setMode] = useState<'view' | 'edit'>(note ? 'view' : 'edit');
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });

  useEffect(() => {
    setMode(note ? 'view' : 'edit');
  }, [note]);

  const handleSubmit = async (data: SessionNoteFields) => {
    try {
      await persist(data);
      setMode('view');
      Alert.alert('Notes saved', 'Parents can now see these inside booking details.');
    } catch {
      Alert.alert('Save failed', 'Please retry in a moment.');
    }
  };

  const header = useMemo(() => {
    if (error) {
      return (
        <Row align="center" gap="sm" justify="space-between" style={styles.loadingRow}>
          <ThemedText style={{ color: palette.error, flex: 1 }}>{error}</ThemedText>
          <Clickable
            onPress={refresh}
            style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}
          >
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Retry</ThemedText>
          </Clickable>
        </Row>
      );
    }

    return null;
  }, [error, palette.error, palette.tint, refresh]);

  if (loading && !note) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <LoadingState variant="form" />
      </SafeAreaView>
    );
  }

  if (error && !note) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <ErrorState message={error} onRetry={refresh} />
      </SafeAreaView>
    );
  }

  if (!bookingId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
        <EmptyState
          icon="document-text-outline"
          title="Booking not found"
          message="Missing booking id for session notes."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Session notes</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Booking ID: {bookingId}</ThemedText>

        {header}

        {mode === 'view' && note ? (
          <View style={{ gap: Spacing.md }}>
            <SessionNotesView {...note} />
            <Clickable
              onPress={() => setMode('edit')}
              style={{
                padding: Spacing.md,
                borderRadius: Radii.md,
                borderWidth: 1,
                borderColor: palette.border,
              }}
            >
              <ThemedText style={{ textAlign: 'center', color: palette.tint, fontWeight: '700' }}>
                Edit notes
              </ThemedText>
            </Clickable>
          </View>
        ) : (
          <SessionNotesForm
            onSubmit={handleSubmit}
            initialValues={note ?? undefined}
            submitting={saving}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingRow: {},
});
