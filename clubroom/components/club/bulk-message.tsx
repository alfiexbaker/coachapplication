import { useCallback, useState } from 'react';
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Colors, Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<DeliveryStatus, { icon: string; label: string }> = {
  pending: { icon: 'time-outline', label: 'Pending' },
  delivered: { icon: 'checkmark', label: 'Delivered' },
  read: { icon: 'checkmark-done', label: 'Read' },
};

// ─── Component ───────────────────────────────────────────────────────────────

type ScreenState = 'compose' | 'preview' | 'sent';

export function BulkMessage({
  squads = [],
  onSend,
  onBack,
  recipients = [],
  isSending = false,
}: BulkMessageProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

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

  // ─── Compose screen ─────────────────────────────────────────────────────

  const renderCompose = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Recipient selection */}
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Send to</ThemedText>
      <View style={styles.scopeRow}>
        <Clickable
          onPress={() => setScope('squad')}
          accessibilityRole="button"
          accessibilityLabel="Send to squad"
          style={{
            flex: 1,
            height: Components.button.height,
            borderRadius: Radii.button,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: scope === 'squad' ? palette.tint : palette.surface,
            borderWidth: scope === 'squad' ? 0 : 1,
            borderColor: palette.border,
          }}
        >
          <ThemedText
            style={{
              ...Typography.bodySemiBold,
              color: scope === 'squad' ? palette.onPrimary : palette.text,
            }}
          >
            Squad
          </ThemedText>
        </Clickable>
        <Clickable
          onPress={() => setScope('club')}
          accessibilityRole="button"
          accessibilityLabel="Send to whole club"
          style={{
            flex: 1,
            height: Components.button.height,
            borderRadius: Radii.button,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: scope === 'club' ? palette.tint : palette.surface,
            borderWidth: scope === 'club' ? 0 : 1,
            borderColor: palette.border,
          }}
        >
          <ThemedText
            style={{
              ...Typography.bodySemiBold,
              color: scope === 'club' ? palette.onPrimary : palette.text,
            }}
          >
            Whole Club
          </ThemedText>
        </Clickable>
      </View>

      {/* Squad picker */}
      {scope === 'squad' && squads.length > 0 ? (
        <View style={styles.squadPicker}>
          {squads.map((squad) => (
            <Clickable
              key={squad.id}
              onPress={() => setSelectedSquadId(squad.id)}
              accessibilityRole="button"
              accessibilityLabel={squad.name}
              style={{
                paddingHorizontal: Spacing.sm,
                paddingVertical: Spacing.xs,
                borderRadius: Radii.pill,
                backgroundColor:
                  selectedSquadId === squad.id ? withAlpha(palette.tint, 0.15) : palette.surface,
                borderWidth: 1,
                borderColor:
                  selectedSquadId === squad.id ? palette.tint : palette.border,
              }}
            >
              <ThemedText
                style={{
                  ...Typography.small,
                  fontWeight: selectedSquadId === squad.id ? '600' : '400',
                  color: selectedSquadId === squad.id ? palette.tint : palette.text,
                }}
              >
                {squad.name}
              </ThemedText>
            </Clickable>
          ))}
        </View>
      ) : null}

      {/* Message composer */}
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Message</ThemedText>
      <TextInput
        style={[
          styles.textArea,
          {
            backgroundColor: palette.surface,
            color: palette.text,
            borderColor: palette.border,
          },
        ]}
        value={messageText}
        onChangeText={setMessageText}
        placeholder="Write your message..."
        placeholderTextColor={palette.muted}
        multiline
        textAlignVertical="top"
        maxLength={2000}
      />
      <ThemedText style={[styles.charCount, { color: palette.muted }]}>
        {messageText.length}/2000
      </ThemedText>

      {/* Preview button */}
      <Clickable
        onPress={handlePreview}
        disabled={!messageText.trim()}
        accessibilityRole="button"
        accessibilityLabel="Preview message"
        style={{
          height: Components.button.height,
          borderRadius: Radii.button,
          backgroundColor: messageText.trim() ? palette.tint : palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: Spacing.sm,
        }}
      >
        <ThemedText style={{ ...Typography.bodySemiBold, color: palette.onPrimary }}>
          Preview Message
        </ThemedText>
      </Clickable>
    </ScrollView>
  );

  // ─── Preview screen ─────────────────────────────────────────────────────

  const renderPreview = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Preview</ThemedText>

      <SurfaceCard style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Ionicons name="people" size={Components.icon.md} color={palette.tint} />
          <ThemedText style={[styles.previewRecipient, { color: palette.text }]}>
            To: {selectedSquadName}
          </ThemedText>
        </View>
        <ThemedText style={[styles.previewBody, { color: palette.text }]}>{messageText}</ThemedText>
      </SurfaceCard>

      <View style={styles.previewActions}>
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
            flexDirection: 'row',
            gap: Spacing.xs,
          }}
        >
          <Ionicons name="send" size={Components.icon.md} color={palette.onPrimary} />
          <ThemedText style={{ ...Typography.bodySemiBold, color: palette.onPrimary }}>
            {isSending ? 'Sending...' : 'Send Now'}
          </ThemedText>
        </Clickable>
      </View>
    </ScrollView>
  );

  // ─── Sent / Delivery Status screen ──────────────────────────────────────

  const renderRecipient = useCallback(
    ({ item }: { item: Recipient }) => {
      const statusInfo = STATUS_ICONS[item.status];
      const statusColor =
        item.status === 'read'
          ? palette.success
          : item.status === 'delivered'
            ? palette.tint
            : palette.muted;

      return (
        <View style={[styles.recipientRow, { borderBottomColor: palette.border }]}>
          <View style={[styles.recipientAvatar, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
            <ThemedText style={[styles.recipientInitial, { color: palette.tint }]}>
              {item.name.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={styles.recipientInfo}>
            <ThemedText style={[styles.recipientName, { color: palette.text }]}>{item.name}</ThemedText>
            {item.role ? (
              <ThemedText style={[styles.recipientRole, { color: palette.muted }]}>{item.role}</ThemedText>
            ) : null}
          </View>
          <View style={styles.statusContainer}>
            <Ionicons
              name={statusInfo.icon as keyof typeof Ionicons.glyphMap}
              size={Components.icon.md}
              color={statusColor}
            />
            <ThemedText style={[styles.statusLabel, { color: statusColor }]}>
              {statusInfo.label}
            </ThemedText>
          </View>
        </View>
      );
    },
    [palette],
  );

  const renderSent = () => (
    <View style={styles.sentContainer}>
      {/* Success banner */}
      <View style={[styles.successBanner, { backgroundColor: withAlpha(palette.success, 0.1) }]}>
        <Ionicons name="checkmark-circle" size={Components.icon.xl} color={palette.success} />
        <ThemedText style={[styles.successText, { color: palette.success }]}>Message Sent</ThemedText>
        <ThemedText style={[styles.successSub, { color: palette.muted }]}>
          Sent to {selectedSquadName}
        </ThemedText>
      </View>

      {/* Delivery status list */}
      {recipients.length > 0 ? (
        <>
          <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Delivery Status</ThemedText>
          <FlatList
            data={recipients}
            renderItem={renderRecipient}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : null}

      {/* New message button */}
      <Clickable
        onPress={handleReset}
        accessibilityRole="button"
        accessibilityLabel="Send another message"
        style={{
          height: Components.button.height,
          borderRadius: Radii.button,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: Spacing.sm,
        }}
      >
        <ThemedText style={{ ...Typography.bodySemiBold, color: palette.text }}>
          Send Another Message
        </ThemedText>
      </Clickable>
    </View>
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <PageContainer
      header={<PageHeader title="Bulk Message" showBack onBackPress={onBack} />}
      scrollable={false}
    >
      {screen === 'compose' ? renderCompose() : null}
      {screen === 'preview' ? renderPreview() : null}
      {screen === 'sent' ? renderSent() : null}
    </PageContainer>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  scopeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  squadPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  textArea: {
    minHeight: 120,
    borderRadius: Radii.md,
    borderWidth: 1,
    padding: Spacing.sm,
    ...Typography.body,
  },
  charCount: {
    ...Typography.caption,
    textAlign: 'right',
  },
  previewCard: {
    gap: Spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  sentContainer: {
    flex: 1,
    gap: Spacing.xs,
  },
  successBanner: {
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radii.card,
    gap: Spacing.xs,
  },
  successText: {
    ...Typography.heading,
  },
  successSub: {
    ...Typography.body,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  recipientAvatar: {
    width: Components.avatar.sm,
    height: Components.avatar.sm,
    borderRadius: Components.avatar.sm / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipientInitial: {
    ...Typography.caption,
    fontWeight: '700',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    ...Typography.bodySemiBold,
  },
  recipientRole: {
    ...Typography.small,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  statusLabel: {
    ...Typography.caption,
  },
});
