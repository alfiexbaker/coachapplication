import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Chip } from '@/components/primitives/chip';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ChatThreadSummary } from '@/constants/types';

type HeaderProps = {
  colors: ThemeColors;
  thread: ChatThreadSummary;
  onBack: () => void;
};

export const ChatScreenHeader = React.memo(function ChatScreenHeader({
  colors,
  thread,
  onBack,
}: HeaderProps) {
  const isGroup = thread.kind === 'group';
  const headerTitle = thread.title || thread.serviceName || 'Conversation';
  const headerSubtitle =
    thread.subtitle ||
    (isGroup
      ? `${thread.memberCount ?? '-'} members${thread.scopeLabel ? ` · ${thread.scopeLabel}` : ''}`
      : thread.serviceName);

  return (
    <Row align="center" gap="md" style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
      <Clickable onPress={onBack} style={styles.backButton} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <View style={styles.chatHeaderInfo}>
        <ThemedText type="subtitle" style={styles.chatHeaderName}>
          {headerTitle}
        </ThemedText>
        <ThemedText style={[styles.chatSubtitle, { color: colors.muted }]}>
          {headerSubtitle}
        </ThemedText>
      </View>
      {isGroup && thread.groupType ? (
        <Chip dense>
          {thread.groupType === 'club' ? 'Club' : thread.groupType === 'squad' ? 'Squad' : 'Class'}
        </Chip>
      ) : null}
    </Row>
  );
});

type SafetyProps = {
  colors: ThemeColors;
  showSafetyBanner: boolean;
  onDismiss: () => void;
};

export const ChatSafetyBanner = React.memo(function ChatSafetyBanner({
  colors,
  showSafetyBanner,
  onDismiss,
}: SafetyProps) {
  if (!showSafetyBanner) return null;

  return (
    <Row
      align="center"
      gap="sm"
      style={[
        styles.safetyBanner,
        { backgroundColor: withAlpha(colors.warning, 0.06), borderColor: colors.border },
      ]}
    >
      <Ionicons name="shield-checkmark" size={18} color={colors.warning} />
      <View style={styles.safetyTextWrap}>
        <ThemedText type="defaultSemiBold">Stay safe</ThemedText>
        <ThemedText style={{ color: colors.muted, ...Typography.small }}>
          Messaging unlocks after a confirmed booking. Report concerns any time.
        </ThemedText>
      </View>
      <Clickable onPress={onDismiss} accessibilityLabel="Dismiss safety message">
        <Ionicons name="close" size={16} color={colors.icon} />
      </Clickable>
    </Row>
  );
});

type PostingAsProps = {
  colors: ThemeColors;
  thread: ChatThreadSummary;
  postingAs?: string;
  onSelect: (value: string) => void;
};

export const ChatPostingAsSelector = React.memo(function ChatPostingAsSelector({
  colors,
  thread,
  postingAs,
  onSelect,
}: PostingAsProps) {
  const isGroup = thread.kind === 'group';
  if (!isGroup || !thread.postingAsOptions?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.postingAsRow, { borderColor: colors.border }]}
    >
      {thread.postingAsOptions.map((option) => {
        const selected = postingAs === option;
        return (
          <Clickable
            key={option}
            onPress={() => onSelect(option)}
            style={[
              styles.postingAsChip,
              {
                backgroundColor: selected ? withAlpha(colors.tint, 0.09) : colors.surface,
                borderColor: selected ? colors.tint : colors.border,
              },
            ]}
          >
            <Row align="center" gap="xs">
              <Ionicons
                name={selected ? 'checkmark-circle' : 'person-circle-outline'}
                size={16}
                color={selected ? colors.tint : colors.icon}
              />
              <ThemedText style={{ color: selected ? colors.text : colors.muted }}>
                Post as {option}
              </ThemedText>
            </Row>
          </Clickable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  chatHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
  },
  chatHeaderInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  chatHeaderName: {
    ...Typography.heading,
  },
  chatSubtitle: {
    ...Typography.bodySmallSemiBold,
  },
  postingAsRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderBottomWidth: 1,
  },
  postingAsChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  safetyBanner: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  safetyTextWrap: {
    flex: 1,
    gap: Spacing.micro,
  },
});
