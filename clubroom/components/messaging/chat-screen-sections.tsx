import React from 'react';
import { FlatList, StyleSheet, View, type ListRenderItemInfo } from 'react-native';
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
  onOpenMenu?: () => void;
};

export const ChatScreenHeader = function ChatScreenHeader({
  colors,
  thread,
  onBack,
  onOpenMenu,
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
        <Chip
          dense
          label={
            thread.groupType === 'club' ? 'Club' : thread.groupType === 'squad' ? 'Squad' : 'Class'
          }
        />
      ) : null}
      {onOpenMenu ? (
        <Clickable
          onPress={onOpenMenu}
          style={styles.backButton}
          accessibilityLabel="Open conversation options"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Clickable>
      ) : null}
    </Row>
  );
};

type SafetyProps = {
  colors: ThemeColors;
  showSafetyBanner: boolean;
  onDismiss: () => void;
};

const renderChatSafetyBanner = function renderChatSafetyBanner({
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
};
export const ChatSafetyBanner = renderChatSafetyBanner;

type PostingAsProps = {
  colors: ThemeColors;
  thread: ChatThreadSummary;
  postingAs?: string;
  onSelect: (value: string) => void;
};

const renderChatPostingAsSelector = function renderChatPostingAsSelector({
  colors,
  thread,
  postingAs,
  onSelect,
}: PostingAsProps) {
  const isGroup = thread.kind === 'group';
  if (!isGroup || !thread.postingAsOptions?.length) return null;
  const postingAsItems = getPostingAsItems(thread.postingAsOptions, postingAs, onSelect, colors);

  return (
    <FlatList
      horizontal
      data={postingAsItems}
      keyExtractor={keyPostingAsItem}
      renderItem={renderPostingAsItem}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.postingAsRow, { borderColor: colors.border }]}
    />
  );
};
export const ChatPostingAsSelector = renderChatPostingAsSelector;

interface PostingAsItem {
  key: string;
  option: string;
  selected: boolean;
  colors: ThemeColors;
  onPress: () => void;
}

function getPostingAsItems(
  options: string[],
  postingAs: string | undefined,
  onSelect: (value: string) => void,
  colors: ThemeColors,
): PostingAsItem[] {
  return options.map((option) => ({
    key: option,
    option,
    selected: postingAs === option,
    colors,
    onPress: () => onSelect(option),
  }));
}

function keyPostingAsItem(item: PostingAsItem) {
  return item.key;
}

function renderPostingAsItem({ item }: ListRenderItemInfo<PostingAsItem>) {
  return (
    <Clickable
      onPress={item.onPress}
      style={[
        styles.postingAsChip,
        {
          backgroundColor: item.selected ? withAlpha(item.colors.tint, 0.09) : item.colors.surface,
          borderColor: item.selected ? item.colors.tint : item.colors.border,
        },
      ]}
    >
      <Row align="center" gap="xs">
        <Ionicons
          name={item.selected ? 'checkmark-circle' : 'person-circle-outline'}
          size={16}
          color={item.selected ? item.colors.tint : item.colors.icon}
        />
        <ThemedText style={{ color: item.selected ? item.colors.text : item.colors.muted }}>
          Post as {item.option}
        </ThemedText>
      </Row>
    </Clickable>
  );
}

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
