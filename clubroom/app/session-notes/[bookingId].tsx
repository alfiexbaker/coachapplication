import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { SessionNotesForm } from '@/components/session/session-notes-form';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionNoteFields, SessionNoteRecord, getSessionNote, saveSessionNote } from '@/services/session-notes-service';
import { Clickable } from '@/components/primitives/clickable';

export default function SessionNotesScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [payload, setPayload] = useState<SessionNoteRecord | null>(null);
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  useEffect(() => {
    async function loadNotes() {
      if (!bookingId) return;
      const note = await getSessionNote(bookingId);
      setPayload(note);
      setSubmitted(!!note);
    }

    loadNotes();
  }, [bookingId]);

  const handleSubmit = async (data: SessionNoteFields) => {
    if (!bookingId) return;
    const record = await saveSessionNote(bookingId, data);
    setPayload(record);
    setSubmitted(true);
    Alert.alert('Notes saved', 'Parents can now see these inside booking details.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Session notes</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Booking ID: {bookingId}</ThemedText>

        {submitted && payload ? (
          <View style={{ gap: Spacing.md }}>
            <SessionNotesView {...payload} />
            <Clickable
              onPress={() => setSubmitted(false)}
              style={{ padding: Spacing.md, borderRadius: 12, borderWidth: 1, borderColor: palette.border }}
            >
              <ThemedText style={{ textAlign: 'center', color: palette.tint, fontWeight: '700' }}>
                Edit notes
              </ThemedText>
            </Clickable>
          </View>
        ) : (
          <SessionNotesForm onSubmit={handleSubmit} initialValues={payload ?? undefined} />
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
});
