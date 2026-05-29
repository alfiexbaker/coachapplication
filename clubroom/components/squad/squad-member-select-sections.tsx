/**
 * Extracted sub-components for SquadMemberSelect.
 *
 * SelectAllHeader — count + select all/deselect toggle.
 * NotificationBanner — parent notification count display.
 * MemberCard — individual member row with avatar, meta, checkbox.
 */

import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SquadMemberWithSelection } from '@/services/invite';
import { styles } from './squad-member-select-styles';

// ─── SelectAllHeader ────────────────────────────────────────────────────────

interface SelectAllHeaderProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  disabled: boolean;
  onSelectAll: () => void;
  onSelectNone: () => void;
  palette: ThemeColors;
}

export const SelectAllHeader = function SelectAllHeader({
  selectedCount,
  totalCount,
  allSelected,
  disabled,
  onSelectAll,
  onSelectNone,
  palette,
}: SelectAllHeaderProps) {
  return (
    <Row align="center" justify="between">
      <ThemedText type="defaultSemiBold">
        {selectedCount} of {totalCount} selected
      </ThemedText>
      <Row gap="xs">
        <Clickable
          onPress={allSelected ? onSelectNone : onSelectAll}
          disabled={disabled}
          style={[
            styles.selectAllButton,
            {
              backgroundColor: allSelected ? withAlpha(palette.tint, 0.09) : palette.surface,
              borderColor: allSelected ? palette.tint : palette.border,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          <Row align="center" gap="xs">
            <Ionicons
              name={allSelected ? 'checkmark-done' : 'checkbox-outline'}
              size={14}
              color={allSelected ? palette.tint : palette.muted}
            />
            <ThemedText
              style={{
                ...Typography.caption,
                color: allSelected ? palette.tint : palette.text,
                fontWeight: '600',
              }}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </ThemedText>
          </Row>
        </Clickable>
      </Row>
    </Row>
  );
};

// ─── NotificationBanner ─────────────────────────────────────────────────────

interface NotificationBannerProps {
  parentCount: number;
  palette: ThemeColors;
}

export const NotificationBanner = function NotificationBanner({
  parentCount,
  palette,
}: NotificationBannerProps) {
  return (
    <Row
      align="center"
      gap="sm"
      style={[styles.notificationBanner, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
    >
      <Ionicons name="notifications-outline" size={16} color={palette.tint} />
      <ThemedText style={[styles.notificationText, { color: palette.tint }]}>
        {parentCount} parent{parentCount !== 1 ? 's' : ''} will receive notifications
      </ThemedText>
    </Row>
  );
};

// ─── MemberCard ─────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: SquadMemberWithSelection;
  isSelected: boolean;
  disabled: boolean;
  onToggle: () => void;
  palette: ThemeColors;
}

export const MemberCard = function MemberCard({
  member,
  isSelected,
  disabled,
  onToggle,
  palette,
}: MemberCardProps) {
  const isDisabled = disabled || member.hasPendingInvite;

  return (
    <Clickable
      onPress={onToggle}
      disabled={isDisabled}
      style={[
        styles.memberItem,
        {
          backgroundColor: isSelected ? withAlpha(palette.tint, 0.06) : palette.surface,
          borderColor: isSelected ? palette.tint : palette.border,
          opacity: isDisabled ? 0.5 : 1,
        },
      ]}
    >
      <Row align="center" gap="md">
        <View style={[styles.avatar, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <ThemedText style={[styles.avatarText, { color: palette.tint }]}>
            {(member.athleteId || 'A').charAt(0)}
          </ThemedText>
        </View>

        <View style={styles.memberInfo}>
          <ThemedText type="defaultSemiBold">{member.athleteId}</ThemedText>
          <Row align="center">
            {member.position && (
              <>
                <ThemedText style={[styles.metaDot, { color: palette.muted }]}>
                  {' '}
                  {'\u2022'}{' '}
                </ThemedText>
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {member.position}
                </ThemedText>
              </>
            )}
            {member.jerseyNumber && (
              <>
                <ThemedText style={[styles.metaDot, { color: palette.muted }]}>
                  {' '}
                  {'\u2022'}{' '}
                </ThemedText>
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  #{member.jerseyNumber}
                </ThemedText>
              </>
            )}
          </Row>
          <ThemedText style={[styles.parentText, { color: palette.muted }]}>
            Parent: {member.parentId}
          </ThemedText>
        </View>

        {member.hasPendingInvite ? (
          <View
            style={[styles.pendingBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
          >
            <ThemedText style={[styles.pendingText, { color: palette.warning }]}>
              Invited
            </ThemedText>
          </View>
        ) : (
          <View
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? palette.tint : 'transparent',
                borderColor: isSelected ? palette.tint : palette.border,
              },
            ]}
          >
            {isSelected && <Ionicons name="checkmark" size={14} color={palette.onPrimary} />}
          </View>
        )}
      </Row>
    </Clickable>
  );
};

// ─── State Screens ──────────────────────────────────────────────────────────

export function MemberSelectLoading({ palette }: { palette: ThemeColors }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={palette.tint} />
      <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
        Loading squad members…
      </ThemedText>
    </View>
  );
}

export function MemberSelectError({
  error,
  onRetry,
  palette,
}: {
  error: string;
  onRetry: () => void;
  palette: ThemeColors;
}) {
  return (
    <View style={styles.errorContainer}>
      <Ionicons name="alert-circle" size={24} color={palette.error} />
      <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
      <Clickable onPress={onRetry} style={[styles.retryButton, { borderColor: palette.tint }]}>
        <ThemedText style={{ color: palette.tint }}>Retry</ThemedText>
      </Clickable>
    </View>
  );
}

export function MemberSelectEmpty({ palette }: { palette: ThemeColors }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color={palette.muted} />
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        No members in this squad
      </ThemedText>
    </View>
  );
}
