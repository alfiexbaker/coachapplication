import { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { SessionNotesForm } from '@/components/session/session-notes-form';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Clickable } from '@/components/primitives/clickable';
import { useSessionNote } from '@/hooks/use-session-note';
import { SessionNoteFields } from '@/services/session-notes-service';

export default function SessionNotesScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const { note, loading, saving, error, persist, refresh } = useSessionNote(bookingId);
  const [mode, setMode] = useState<'view' | 'edit'>(note ? 'view' : 'edit');
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  useEffect(() => {
    setMode(note ? 'view' : 'edit');
  }, [note]);

  const handleSubmit = async (data: SessionNoteFields) => {
    if (!bookingId) return;
    try {
      await persist(data);
      setMode('view');
      Alert.alert('Notes saved', 'Parents can now see these inside booking details.');
    } catch {
      Alert.alert('Save failed', 'Please retry in a moment.');
    }
  };

  const header = useMemo(() => {
    if (loading && !note) {
      return (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={palette.tint} />
          <ThemedText style={{ color: palette.muted }}>Loading session notes…</ThemedText>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.loadingRow, { justifyContent: 'space-between' }]}>
          <ThemedText style={{ color: palette.error, flex: 1 }}>{error}</ThemedText>
          <Clickable onPress={refresh} style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
            <ThemedText style={{ color: palette.tint, fontWeight: '700' }}>Retry</ThemedText>
          </Clickable>
        </View>
      );
    }

    return null;
  }, [error, loading, note, palette.error, palette.muted, palette.tint, refresh]);

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
              style={{ padding: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: palette.border }}
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
  loadingRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
});
