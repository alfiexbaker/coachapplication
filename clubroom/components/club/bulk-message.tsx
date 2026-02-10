import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Spacing, Radii, Components, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { BulkMessageCompose } from './bulk-message-compose';
import { BulkMessageSent } from './bulk-message-sent';
import { Row } from '@/components/primitives';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecipientScope = 'squad' | 'club';
export type DeliveryStatus = 'pending' | 'delivered' | 'read';

export interface Recipient {
  id: string;
  name: string;
  role?: string;
  status: DeliveryStatus;
}

export interface BulkMessageProps {
  squads?: { id: string; name: string }[];
  onSend: (scope: RecipientScope, squadId: string | null, message: string) => void;
  onBack?: () => void;
  recipients?: Recipient[];
  isSending?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

type ScreenState = 'compose' | 'preview' | 'sent';

export function BulkMessage({
  squads = [],
  onSend,
  onBack,
  recipients = [],
  isSending = false,
}: BulkMessageProps) {
  const { colors: palette } = useTheme();

  const [screen, setScreen] = useState<ScreenState>('compose');
  const [scope, setScope] = useState<RecipientScope>('squad');
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(
    squads.length > 0 ? squads[0].id : null,
  );
  const [messageText, setMessageText] = useState('');

  const handlePreview = useCallback(() => {
    if (!messageText.trim()) return;
    setScreen('preview');
  }, [messageText]);

  const handleSend = useCallback(() => {
    onSend(scope, scope === 'squad' ? selectedSquadId : null, messageText.trim());
    setScreen('sent');
  }, [messageText, onSend, scope, selectedSquadId]);

  const handleReset = useCallback(() => {
    setMessageText('');
    setScreen('compose');
  }, []);

  const selectedSquadName =
    scope === 'club'
      ? 'Whole Club'
      : squads.find((s) => s.id === selectedSquadId)?.name ?? 'Select a squad';

  // ─── Preview screen ─────────────────────────────────────────────────────

  const renderPreview = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Preview</ThemedText>

      <SurfaceCard style={styles.previewCard}>
        <Row style={styles.previewHeader}>
          <Ionicons name="people" size={Components.icon.md} color={palette.tint} />
          <ThemedText style={[styles.previewRecipient, { color: palette.text }]}>
            To: {selectedSquadName}
          </ThemedText>
        </Row>
        <ThemedText style={[styles.previewBody, { color: palette.text }]}>{messageText}</ThemedText>
      </SurfaceCard>

      <Row style={styles.previewActions}>
        <Clickable
          onPress={() => setScreen('compose')}
          accessibilityRole="button"
          accessibilityLabel="Edit message"
          style={{
            flex: 1,
            height: Components.button.height,
            borderRadius: Radii.button,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: palette.surface,
            borderWidth: 1,
            borderColor: palette.border,
          }}
        >
          <ThemedText style={{ ...Typography.bodySemiBold, color: palette.text }}>Edit</ThemedText>
        </Clickable>
        <Clickable
          onPress={handleSend}
          disabled={isSending}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          style={{
            flex: 2,
            height: Components.button.height,
            borderRadius: Radii.button,
            backgroundColor: palette.tint,
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.xs,
          }}
        >
          <Ionicons name="send" size={Components.icon.md} color={palette.onPrimary} />
          <ThemedText style={{ ...Typography.bodySemiBold, color: palette.onPrimary }}>
            {isSending ? 'Sending...' : 'Send Now'}
          </ThemedText>
        </Clickable>
      </Row>
    </ScrollView>
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <PageContainer
      header={<PageHeader title="Bulk Message" showBack onBackPress={onBack} />}
      scrollable={false}
    >
      {screen === 'compose' ? (
        <BulkMessageCompose
          scope={scope}
          onScopeChange={setScope}
          squads={squads}
          selectedSquadId={selectedSquadId}
          onSquadSelect={setSelectedSquadId}
          messageText={messageText}
          onMessageChange={setMessageText}
          onPreview={handlePreview}
        />
      ) : null}
      {screen === 'preview' ? renderPreview() : null}
      {screen === 'sent' ? (
        <BulkMessageSent
          recipientLabel={selectedSquadName}
          recipients={recipients}
          onReset={handleReset}
        />
      ) : null}
    </PageContainer>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs / 2,
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewRecipient: {
    ...Typography.bodySemiBold,
  },
  previewBody: {
    ...Typography.body,
  },
  previewActions: {
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
