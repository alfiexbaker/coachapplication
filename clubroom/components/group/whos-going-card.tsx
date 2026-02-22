/**
 * WhosGoingCard — Multi-child RSVP in one card.
 *
 * Shows all registered children with per-child RSVP toggle buttons.
 * Replaces separate FamilyRegistrationCard per child for a cleaner UX.
 *
 * "Who's Going?" → Tommy [Going ✓] [Maybe] [Can't]
 *                → Emma  [Going]   [Maybe] [Can't ✓]
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { DeadlineBadge } from '@/components/group/deadline-badge';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FamilyRegistration } from '@/hooks/use-group-session';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RsvpStatus = 'going' | 'maybe' | 'cant_go';

interface WhosGoingCardProps {
  registrations: FamilyRegistration[];
  deadline?: string | null;
  responding: boolean;
  onRsvpRespond: (reg: FamilyRegistration, status: RsvpStatus) => void;
  onUnregister: (reg: FamilyRegistration) => void;
  toButtonStatus: (s: string) => RsvpStatus | null;
}

// ---------------------------------------------------------------------------
// Button config
// ---------------------------------------------------------------------------

const RSVP_OPTIONS: { status: RsvpStatus; label: string; icon: string; activeColor: 'success' | 'warning' | 'error' }[] = [
  { status: 'going', label: 'Going', icon: 'checkmark-circle', activeColor: 'success' },
  { status: 'maybe', label: 'Maybe', icon: 'help-circle', activeColor: 'warning' },
  { status: 'cant_go', label: "Can't", icon: 'close-circle', activeColor: 'error' },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single RSVP toggle pill */
const RsvpPill = memo(function RsvpPill({
  label,
  icon,
  isActive,
  activeColor,
  onPress,
  disabled,
}: {
  label: string;
  icon: string;
  isActive: boolean;
  activeColor: string;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useTheme();

  return (
    <Clickable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.pill,
        isActive
          ? { backgroundColor: withAlpha(activeColor, 0.15), borderColor: activeColor }
          : { backgroundColor: withAlpha(colors.muted, 0.06), borderColor: colors.border },
      ]}
      accessibilityLabel={`${label}${isActive ? ' selected' : ''}`}
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={icon as keyof typeof Ionicons.glyphMap}
        size={14}
        color={isActive ? activeColor : colors.muted}
      />
      <ThemedText
        style={[
          Typography.caption,
          { color: isActive ? activeColor : colors.muted },
        ]}
      >
        {label}
      </ThemedText>
    </Clickable>
  );
});

/** One child row: avatar + name + 3 RSVP pills */
const ChildRow = memo(function ChildRow({
  familyReg,
  currentStatus,
  responding,
  onRespond,
  onUnregister,
}: {
  familyReg: FamilyRegistration;
  currentStatus: RsvpStatus | null;
  responding: boolean;
  onRespond: (status: RsvpStatus) => void;
  onUnregister: () => void;
}) {
  const { colors } = useTheme();
  const isWaitlisted = familyReg.registration.status === 'WAITLISTED';
  const initials = familyReg.childName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.childRow}>
      <Row align="center" gap="sm" style={{ marginBottom: Spacing.xs }}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[Typography.micro, { color: colors.tint, fontSize: 10 }]}>
            {initials}
          </ThemedText>
        </View>

        {/* Name + status */}
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold" style={Typography.bodySmallSemiBold}>
            {familyReg.childName}
          </ThemedText>
          {isWaitlisted && (
            <ThemedText style={[Typography.micro, { color: colors.warning }]}>
              WAITLISTED
            </ThemedText>
          )}
        </View>

        {/* Cancel registration */}
        <Clickable
          onPress={onUnregister}
          hitSlop={8}
          accessibilityLabel={`Remove ${familyReg.childName}`}
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </Clickable>
      </Row>

      {/* RSVP pills — only for registered (not waitlisted) */}
      {!isWaitlisted && (
        <Row gap="xs">
          {RSVP_OPTIONS.map((opt) => (
            <RsvpPill
              key={opt.status}
              label={opt.label}
              icon={opt.icon}
              isActive={currentStatus === opt.status}
              activeColor={colors[opt.activeColor]}
              onPress={() => onRespond(opt.status)}
              disabled={responding}
            />
          ))}
        </Row>
      )}
    </View>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function WhosGoingCardComponent({
  registrations,
  deadline,
  responding,
  onRsvpRespond,
  onUnregister,
  toButtonStatus,
}: WhosGoingCardProps) {
  const { colors } = useTheme();

  if (registrations.length === 0) return null;

  return (
    <SurfaceCard style={styles.card}>
      {/* Header */}
      <Row align="center" justify="between" style={{ marginBottom: Spacing.sm }}>
        <Row align="center" gap="xs">
          <Ionicons name="hand-left" size={18} color={colors.tint} />
          <ThemedText type="defaultSemiBold" style={Typography.subheading}>
            {"Who's Going?"}
          </ThemedText>
        </Row>
        {deadline && <DeadlineBadge deadline={deadline} compact />}
      </Row>

      {/* Child rows */}
      <Column gap="sm">
        {registrations.map((fr) => {
          const currentStatus = fr.rsvp ? toButtonStatus(fr.rsvp.status) : null;
          return (
            <ChildRow
              key={fr.registration.id}
              familyReg={fr}
              currentStatus={currentStatus}
              responding={responding}
              onRespond={(status) => onRsvpRespond(fr, status)}
              onUnregister={() => onUnregister(fr)}
            />
          );
        })}
      </Column>
    </SurfaceCard>
  );
}

export const WhosGoingCard = memo(WhosGoingCardComponent);

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
  childRow: {
    paddingBottom: Spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.pill,
    borderWidth: 1,
    minHeight: 44,
  },
});
