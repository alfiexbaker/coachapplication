import { memo } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Radii, Components, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { RecipientScope } from './bulk-message';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BulkMessageComposeProps {
  scope: RecipientScope;
  onScopeChange: (scope: RecipientScope) => void;
  squads: { id: string; name: string }[];
  selectedSquadId: string | null;
  onSquadSelect: (id: string) => void;
  messageText: string;
  onMessageChange: (text: string) => void;
  onPreview: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const BulkMessageCompose = memo(function BulkMessageCompose({
  scope,
  onScopeChange,
  squads,
  selectedSquadId,
  onSquadSelect,
  messageText,
  onMessageChange,
  onPreview,
}: BulkMessageComposeProps) {
  const { colors: palette } = useTheme();

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Recipient selection */}
      <ThemedText style={[styles.sectionLabel, { color: palette.muted }]}>Send to</ThemedText>
      <View style={styles.scopeRow}>
        <Clickable
          onPress={() => onScopeChange('squad')}
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
          onPress={() => onScopeChange('club')}
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
              onPress={() => onSquadSelect(squad.id)}
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
        onChangeText={onMessageChange}
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
        onPress={onPreview}
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
});

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
});
