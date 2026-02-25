/**
 * FamilyRegistrationCard — Per-child registration card with RSVP buttons.
 *
 * Shows registration status (registered/waitlisted), child name,
 * cancel button, and one-tap RSVP buttons for active sessions.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { RsvpButtonGroup } from '@/components/invite/rsvp-button-group';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FamilyRegistration } from '@/hooks/use-group-session';

interface FamilyRegistrationCardProps {
  familyReg: FamilyRegistration;
  isActive: boolean;
  showChildName: boolean;
  responding: boolean;
  onRsvpRespond: (status: 'going' | 'maybe' | 'cant_go') => void;
  onUnregister: () => void;
  toButtonStatus: (s: string) => 'going' | 'maybe' | 'cant_go' | null;
}

function FamilyRegistrationCardComponent({
  familyReg,
  isActive,
  showChildName,
  responding,
  onRsvpRespond,
  onUnregister,
  toButtonStatus,
}: FamilyRegistrationCardProps) {
  const { colors } = useTheme();

  const isWaitlisted = familyReg.registration.status === 'WAITLISTED';
  const currentRsvp = familyReg.rsvp ? toButtonStatus(familyReg.rsvp.status) : null;
  const statusColor = isWaitlisted ? colors.warning : colors.success;
  const statusIcon = isWaitlisted ? 'time' : 'checkmark-circle';
  const statusLabel = isWaitlisted ? 'Waitlisted' : 'Registered';

  return (
    <SurfaceCard style={styles.card}>
      {/* Header: status + child name + cancel */}
      <Row align="center" gap="sm">
        <View style={[styles.icon, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
          <Ionicons name={statusIcon} size={20} color={statusColor} />
        </View>
        <Column flex>
          <ThemedText type="defaultSemiBold">
            {showChildName ? familyReg.childName : statusLabel}
          </ThemedText>
          <ThemedText style={[Typography.small, { color: colors.muted }]}>
            {isWaitlisted
              ? "We'll notify you when a spot opens"
              : showChildName
                ? statusLabel
                : `Since ${new Date(familyReg.registration.registeredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
          </ThemedText>
        </Column>
        {isActive && (
          <Clickable
            onPress={onUnregister}
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            accessibilityLabel="Cancel registration"
          >
            <Ionicons name="close" size={16} color={colors.error} />
          </Clickable>
        )}
      </Row>

      {/* RSVP buttons — only for registered (not waitlisted) on active sessions */}
      {isActive && !isWaitlisted && (
        <View style={{ marginTop: Spacing.sm }}>
          <ThemedText style={[Typography.caption, { color: colors.muted, marginBottom: Spacing.xs }]}>
            {showChildName ? `Is ${familyReg.childName} coming?` : 'Are you coming?'}
          </ThemedText>
          <RsvpButtonGroup
            currentStatus={currentRsvp}
            onRespond={onRsvpRespond}
            disabled={responding}
            compact
          />
        </View>
      )}
    </SurfaceCard>
  );
}

export const FamilyRegistrationCard = memo(FamilyRegistrationCardComponent);

const styles = StyleSheet.create({
  card: { padding: Spacing.md },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    width: 32,
    height: 32,
    borderRadius: Radii.xl,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
