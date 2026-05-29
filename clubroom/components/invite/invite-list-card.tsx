/** InviteListCard — Memoized invite card for the invites list screen. */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInvite, SessionInviteType } from '@/constants/types';
import {
  getSessionInviteAthleteNames,
  getSessionInviteCoachName,
} from '@/utils/session-invite-display';
import { formatInUserTimezone } from '@/utils/timezone';
import { uiFeedback } from '@/services/ui-feedback';

type ViewMode = 'sent' | 'received';

interface InviteListCardProps {
  invite: SessionInvite;
  index: number;
  mode: ViewMode;
  colors: ThemeColors;
  childLabel?: string;
  onPress: () => void;
  onQuickDecline?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

function statusCfg(status: string, c: ThemeColors) {
  const m: Record<string, { bg: string; text: string; icon: string }> = {
    ACCEPTED: { bg: withAlpha(c.success, 0.15), text: c.success, icon: 'checkmark-circle-outline' },
    DECLINED: { bg: withAlpha(c.error, 0.15), text: c.error, icon: 'close-circle-outline' },
    EXPIRED: { bg: withAlpha(c.muted, 0.12), text: c.muted, icon: 'time-outline' },
  };
  return (
    m[status] ?? { bg: withAlpha(c.warning, 0.15), text: c.warning, icon: 'hourglass-outline' }
  );
}

function typeCfg(t: SessionInviteType, c: ThemeColors) {
  const m: Record<SessionInviteType, { label: string; icon: string; bg: string; text: string }> = {
    OPEN: { label: 'Open', icon: 'globe-outline', bg: withAlpha(c.success, 0.09), text: c.success },
    CLOSED: {
      label: 'Closed',
      icon: 'lock-closed-outline',
      bg: withAlpha(c.warning, 0.09),
      text: c.warning,
    },
    SQUAD_ONLY: {
      label: 'Squad Only',
      icon: 'people-outline',
      bg: withAlpha(c.info, 0.09),
      text: c.info,
    },
  };
  return m[t];
}

function expiryText(inv: SessionInvite): string | null {
  if (inv.status !== 'PENDING') return null;
  const diff = new Date(inv.expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const d = Math.floor(diff / 864e5),
    h = Math.floor((diff % 864e5) / 36e5);
  if (d > 0) return `${d}d ${h}h left`;
  return h > 0 ? `${h}h left` : 'Expires soon';
}

function getRecurringSummary(invite: SessionInvite): {
  pattern: string;
  range: string | null;
  totalSessions: number;
} | null {
  if (!invite.isRecurring) return null;

  const sortedSlots = Array.from(invite.proposedSlots).toSorted((a, b) => {
    const aKey = `${a.date}T${a.startTime}`;
    const bKey = `${b.date}T${b.startTime}`;
    return aKey.localeCompare(bKey);
  });

  const totalSessions = invite.recurrenceWeeks ?? sortedSlots.length ?? 1;
  const first = sortedSlots[0];
  const last = sortedSlots[sortedSlots.length - 1];
  const range =
    first && last
      ? `${formatInUserTimezone(`${first.date}T00:00:00`, {
          day: 'numeric',
          month: 'short',
        })} - ${formatInUserTimezone(`${last.date}T00:00:00`, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}`
      : null;

  return {
    pattern:
      invite.recurrenceWeeks && invite.recurrenceWeeks > 1
        ? `Weekly for ${invite.recurrenceWeeks} weeks`
        : 'Recurring session invite',
    range,
    totalSessions,
  };
}

export const InviteListCard = function InviteListCard({
  invite,
  index,
  mode,
  colors,
  childLabel,
  onPress,
  onQuickDecline,
  onCancel,
  onDismiss,
}: InviteListCardProps) {
  const handleCancel = () => {
    const recipientName = getSessionInviteAthleteNames(invite).join(', ') || 'recipient';
    uiFeedback.alert(
      'Cancel Invite',
      `Cancel the pending invite to ${recipientName}?`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: () => onCancel?.(),
        },
      ],
    );
  };

  const handleDismiss = () => {
    uiFeedback.alert(
      'Remove Invite',
      'Remove this invite from your list?',
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => onDismiss?.(),
        },
      ],
    );
  };

  const expired = new Date(invite.expiresAt) < new Date();
  const isPending = invite.status === 'PENDING';
  const status = expired && isPending ? 'EXPIRED' : isPending ? 'PENDING' : invite.status;
  const sc = statusCfg(status, colors);
  const coachName = getSessionInviteCoachName(invite);
  const athleteNames = getSessionInviteAthleteNames(invite);
  const initials =
    mode === 'sent'
      ? athleteNames[0]?.charAt(0) || 'A'
      : coachName
          .split(' ')
          .map((n) => n[0])
          .join('');
  const name = mode === 'sent' ? athleteNames.join(', ') : coachName;
  const first = coachName.split(' ')[0];
  const ath = athleteNames.length === 1 ? athleteNames[0] : `${athleteNames.length} athletes`;
  const msg =
    mode === 'received'
      ? invite.clubName
        ? `Coach ${first} has invited ${ath} to ${invite.clubName}`
        : `Coach ${first} has invited ${ath} to a ${invite.sessionType.toLowerCase()}`
      : invite.clubName
        ? `Invite to ${invite.clubName}`
        : `${invite.sessionType} invite`;
  const slot = invite.proposedSlots[0];
  const dateStr = slot
    ? formatInUserTimezone(`${slot.date}T${slot.startTime || '00:00'}`, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : '';
  const exp = expiryText(invite);
  const tc = typeCfg(invite.inviteType || 'OPEN', colors);
  const recurringSummary = getRecurringSummary(invite);
  const isRecurring = recurringSummary !== null;

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <SurfaceCard style={st.card} onPress={onPress}>
        <Row
          gap="sm"
          align="center"
          style={[st.msgBanner, { backgroundColor: withAlpha(colors.tint, 0.03) }]}
        >
          <Ionicons name="mail-outline" size={16} color={colors.tint} />
          <ThemedText style={[st.msgText, { color: colors.text }]} numberOfLines={2}>
            {msg}
          </ThemedText>
        </Row>
        <Row>
          <Row gap="xs" align="center">
            <Row gap="xxs" align="center" style={[st.typeBadge, { backgroundColor: tc.bg }]}>
              <Ionicons
                name={tc.icon as keyof typeof Ionicons.glyphMap}
                size={12}
                color={tc.text}
              />
              <ThemedText style={[st.typeText, { color: tc.text }]}>{tc.label}</ThemedText>
            </Row>
            {isRecurring && (
              <Row
                gap="xxs"
                align="center"
                style={[st.typeBadge, { backgroundColor: withAlpha(colors.info, 0.09) }]}
              >
                <Ionicons name="repeat-outline" size={12} color={colors.info} />
                <ThemedText style={[st.typeText, { color: colors.info }]}>Recurring</ThemedText>
              </Row>
            )}
          </Row>
        </Row>
        <Row gap="md" align="center">
          <View style={[st.avatar, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
            <ThemedText style={[st.avatarText, { color: colors.tint }]}>{initials}</ThemedText>
          </View>
          <Column gap="micro" style={st.flex}>
            <ThemedText type="defaultSemiBold">
              {mode === 'received' ? `Coach ${name}` : name}
            </ThemedText>
            {invite.clubName && (
              <ThemedText style={[st.club, { color: colors.tint }]}>{invite.clubName}</ThemedText>
            )}
            <ThemedText style={{ color: colors.muted, ...Typography.small }}>
              {invite.sessionType} - {invite.focus}
            </ThemedText>
            {childLabel != null && childLabel.length > 0 && (
              <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
                For {childLabel}
              </ThemedText>
            )}
          </Column>
          <Row gap="xxs" align="center" style={[st.statusBadge, { backgroundColor: sc.bg }]}>
            <Ionicons name={sc.icon as keyof typeof Ionicons.glyphMap} size={12} color={sc.text} />
            <ThemedText style={[st.statusText, { color: sc.text }]}>{status}</ThemedText>
          </Row>
        </Row>
        <View style={[st.divider, { backgroundColor: colors.border }]} />
        <Column gap="xxs">
          <Row gap="xs" align="center">
            <Ionicons name="calendar-outline" size={16} color={colors.muted} />
            <ThemedText style={{ color: colors.text, ...Typography.small }}>
              {dateStr} at {slot?.startTime}
              {invite.proposedSlots.length > 1 && ` (+${invite.proposedSlots.length - 1} options)`}
            </ThemedText>
          </Row>
          {slot?.location && (
            <Row gap="xs" align="center">
              <Ionicons name="location-outline" size={16} color={colors.muted} />
              <ThemedText style={{ color: colors.text, ...Typography.small }}>
                {slot.location}
              </ThemedText>
            </Row>
          )}
          {recurringSummary && (
            <>
              <Row gap="xs" align="center">
                <Ionicons name="repeat-outline" size={16} color={colors.muted} />
                <ThemedText style={{ color: colors.text, ...Typography.small }}>
                  {recurringSummary.pattern}
                </ThemedText>
              </Row>
              <Row gap="xs" align="center">
                <Ionicons name="layers-outline" size={16} color={colors.muted} />
                <ThemedText style={{ color: colors.text, ...Typography.small }}>
                  {recurringSummary.totalSessions} session
                  {recurringSummary.totalSessions === 1 ? '' : 's'}
                  {recurringSummary.range ? ` • ${recurringSummary.range}` : ''}
                </ThemedText>
              </Row>
            </>
          )}
          {invite.price != null && invite.price > 0 && (
            <Row gap="xs" align="center">
              <Ionicons name="pricetag-outline" size={16} color={colors.muted} />
              <ThemedText style={{ color: colors.text, ...Typography.small }}>
                {'\u00A3'}
                {invite.price}
                {recurringSummary ? ` per session` : ''}
              </ThemedText>
            </Row>
          )}
        </Column>
        {invite.notes && (
          <ThemedText
            style={{ color: colors.muted, ...Typography.small, fontStyle: 'italic' }}
            numberOfLines={2}
          >
            &quot;{invite.notes}&quot;
          </ThemedText>
        )}
        {exp && (
          <Row gap="xxs" align="center" style={st.expiry}>
            <Ionicons name="time-outline" size={14} color={colors.warning} />
            <ThemedText style={{ color: colors.warning, ...Typography.caption }}>{exp}</ThemedText>
          </Row>
        )}
        {mode === 'received' && status === 'PENDING' && (
          <Row gap="sm" style={st.actions}>
            <Clickable
              style={[st.actBtn, st.outline, { borderColor: colors.border }]}
              onPress={onQuickDecline}
              accessibilityLabel="Decline invite"
            >
              <Row gap="xxs" align="center" justify="center">
                <Ionicons name="close-outline" size={16} color={colors.text} />
                <ThemedText style={{ color: colors.text, ...Typography.bodySmallSemiBold }}>
                  Decline
                </ThemedText>
              </Row>
            </Clickable>
            <Clickable
              style={[st.actBtn, { backgroundColor: colors.tint }]}
              onPress={onPress}
              accessibilityLabel="View and accept invite"
            >
              <Row gap="xxs" align="center" justify="center">
                <Ionicons name="checkmark-outline" size={16} color={colors.onPrimary} />
                <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySmallSemiBold }}>
                  View & Accept
                </ThemedText>
              </Row>
            </Clickable>
          </Row>
        )}
        {mode === 'sent' && status === 'PENDING' && onCancel && (
          <Row gap="sm" style={st.actions}>
            <Clickable
              style={[st.actBtn, st.outline, { borderColor: colors.border }]}
              onPress={handleCancel}
              accessibilityLabel="Cancel invite"
            >
              <Row gap="xxs" align="center" justify="center">
                <Ionicons name="close-circle-outline" size={16} color={colors.error} />
                <ThemedText style={{ color: colors.error, ...Typography.bodySmallSemiBold }}>
                  Cancel Invite
                </ThemedText>
              </Row>
            </Clickable>
          </Row>
        )}
        {mode === 'received' && status !== 'PENDING' && onDismiss && (
          <Row gap="sm" style={st.actions}>
            <Clickable
              style={[st.actBtn, st.outline, { borderColor: colors.border }]}
              onPress={handleDismiss}
              accessibilityLabel="Remove invite from list"
            >
              <Row gap="xxs" align="center" justify="center">
                <Ionicons name="trash-outline" size={16} color={colors.muted} />
                <ThemedText style={{ color: colors.muted, ...Typography.bodySmallSemiBold }}>
                  Remove
                </ThemedText>
              </Row>
            </Clickable>
          </Row>
        )}
      </SurfaceCard>
    </Animated.View>
  );
};

const st = StyleSheet.create({
  card: { padding: Spacing.md, gap: Spacing.sm },
  msgBanner: { padding: Spacing.sm, borderRadius: Radii.sm },
  msgText: { ...Typography.bodySmallSemiBold, flex: 1, lineHeight: Typography.caption.lineHeight },
  typeBadge: { paddingHorizontal: 10, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  typeText: { ...Typography.caption },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.subheading },
  flex: { flex: 1 },
  club: { ...Typography.smallSemiBold },
  statusBadge: { paddingHorizontal: 10, paddingVertical: Spacing.xxs, borderRadius: Radii.sm },
  statusText: { ...Typography.caption, textTransform: 'uppercase' },
  divider: { height: 1 },
  expiry: { marginTop: Spacing.xs },
  actions: { marginTop: Spacing.xs },
  actBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radii.md,
    minHeight: 44,
  },
  outline: { borderWidth: 1 },
});
