import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { SessionNotesForm } from '@/components/session/session-notes-form';
import { SessionNotesView } from '@/components/session/session-notes-view';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { SectionSkeleton, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Radii } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { Clickable } from '@/components/primitives/clickable';
import { useSessionNote } from '@/hooks/use-session-note';
import { SessionNoteFields } from '@/services/progress-service';
import { ok } from '@/types/result';
import { useAuth } from '@/hooks/use-auth';
import { uiFeedback } from '@/services/ui-feedback';

export default function SessionNotesScreen() {
  const { bookingId: bookingIdParam } = useLocalSearchParams<{ bookingId?: string | string[] }>();
  const bookingId = Array.isArray(bookingIdParam) ? bookingIdParam[0] : (bookingIdParam ?? '');
  const { currentUser } = useAuth();
  const isCoach = currentUser?.role === 'COACH';
  const { note, loading, saving, error, persist, refresh } = useSessionNote(bookingId);
  const [mode, setMode] = useState<'view' | 'edit'>(isCoach && !note ? 'edit' : 'view');
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });

  useEffect(() => {
    setMode(isCoach && !note ? 'edit' : 'view');
  }, [isCoach, note]);

  const handleSubmit = async (data: SessionNoteFields) => {
    if (!isCoach) {
      uiFeedback.showToast('Only coaches can submit session notes.');
      return;
    }

    try {
      await persist(data);
      setMode('view');
      uiFeedback.showToast('Parents can now see these inside booking details.', 'success');
    } catch {
      uiFeedback.showToast('Please retry in a moment.', 'error');
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
  const renderShell = (content: ReactNode) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }} edges={['top', 'bottom']}>
      {content}
    </SafeAreaView>
  );

  if (loading && !note) {
    return renderShell(
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{isCoach ? 'Session notes' : 'Coach notes'}</ThemedText>
        <SectionSkeleton variant="form" titleWidth="34%" />
      </ScrollView>,
    );
  }

  if (error && !note) {
    return renderShell(<ErrorState message={error} onRetry={refresh} />);
  }

  if (!bookingId) {
    return renderShell(
      <EmptyState
        icon="document-text-outline"
        title="Booking not found"
        message="Missing booking id for session notes."
      />,
    );
  }

  return renderShell(
    <>
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="title">{isCoach ? 'Session notes' : 'Coach notes'}</ThemedText>

        {header}

        {mode === 'view' && note ? (
          <View style={{ gap: Spacing.md }}>
            <SessionNotesView {...note} />
            {isCoach ? (
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
            ) : null}
          </View>
        ) : isCoach ? (
          <SessionNotesForm
            onSubmit={handleSubmit}
            initialValues={note ?? undefined}
            submitting={saving}
          />
        ) : (
          <EmptyState
            icon="document-text-outline"
            title="Coach notes not available yet"
            message="Your coach will add feedback once the session is completed."
          />
        )}
      </ScrollView>
    </>,
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingRow: {},
});
