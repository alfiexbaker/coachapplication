import { SafeAreaView } from 'react-native-safe-area-context';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { SessionNotesForm } from '@/components/session/session-notes-form';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useState } from 'react';

export default function SessionNotesScreen() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [payload, setPayload] = useState<any>(null);
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">Session notes</ThemedText>
        <ThemedText style={{ color: palette.muted }}>Booking ID: {bookingId}</ThemedText>

        {submitted && payload ? (
          <SessionNotesView {...payload} />
        ) : (
          <SessionNotesForm
            onSubmit={(data) => {
              setPayload(data);
              setSubmitted(true);
              Alert.alert('Notes saved', 'Parents can now see these inside booking details.');
            }}
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
});
