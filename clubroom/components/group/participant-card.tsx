import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { GroupRegistration, SessionRsvp } from '@/constants/types';
import { Row } from '@/components/primitives';
import {
  getGroupRegistrationAthleteName,
  getGroupRegistrationParentName,
} from '@/utils/group-display';

const RSVP_CONFIG: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; colorKey: 'success' | 'warning' | 'error' | 'muted' }> = {
  going: { label: 'Going', icon: 'checkmark-circle', colorKey: 'success' },
  maybe: { label: 'Maybe', icon: 'help-circle', colorKey: 'warning' },
  not_going: { label: "Can't Go", icon: 'close-circle', colorKey: 'error' },
  pending: { label: 'Pending', icon: 'time', colorKey: 'muted' },
};

interface ParticipantCardProps {
  registration: GroupRegistration;
  rsvp?: SessionRsvp | null;
  onMarkAttendance?: (attended: boolean) => void;
  onCancel?: () => void;
  onMessage?: () => void;
  onRecognise?: () => void;
}

export function ParticipantCard({
  registration,
  rsvp,
  onMarkAttendance,
  onCancel,
  onMessage,
  onRecognise,
}: ParticipantCardProps) {
  const { colors: palette } = useTheme();
  const athleteName = getGroupRegistrationAthleteName(registration);
  const parentName = getGroupRegistrationParentName(registration);

  const statusColors: Record<GroupRegistration['status'], { bg: string; text: string }> = {
    REGISTERED: { bg: withAlpha(palette.success, 0.09), text: palette.success },
    WAITLISTED: { bg: withAlpha(palette.warning, 0.09), text: palette.warning },
    CANCELLED: { bg: withAlpha(palette.error, 0.09), text: palette.error },
    ATTENDED: { bg: withAlpha(palette.tint, 0.09), text: palette.tint },
    NO_SHOW: { bg: withAlpha(palette.muted, 0.09), text: palette.muted },
  };

  const statusLabels: Record<GroupRegistration['status'], string> = {
    REGISTERED: 'Registered',
    WAITLISTED: 'Waitlisted',
    CANCELLED: 'Cancelled',
    ATTENDED: 'Attended',
    NO_SHOW: 'No Show',
  };

  const colors = statusColors[registration.status] || statusColors.REGISTERED;
  const isAttended = registration.status === 'ATTENDED';
  const isWaitlisted = registration.status === 'WAITLISTED';

  return (
    <SurfaceCard style={styles.card}>
      <Row style={styles.main}>
        <View style={[styles.avatar, { backgroundColor: palette.border }]}>
          <ThemedText style={styles.avatarText}>{athleteName.slice(0, 2).toUpperCase()}</ThemedText>
        </View>

        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">{athleteName}</ThemedText>
          <ThemedText style={[styles.parentName, { color: palette.muted }]}>
            Parent: {parentName}
          </ThemedText>
          <Row gap="xs" style={{ marginTop: Spacing.xxs }}>
            <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
              <ThemedText style={[styles.statusText, { color: colors.text }]}>
                {statusLabels[registration.status]}
              </ThemedText>
            </View>
            {rsvp && RSVP_CONFIG[rsvp.status] && (
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: withAlpha(palette[RSVP_CONFIG[rsvp.status].colorKey], 0.09) },
                ]}
              >
                <Row align="center" gap="micro">
                  <Ionicons
                    name={RSVP_CONFIG[rsvp.status].icon}
                    size={10}
                    color={palette[RSVP_CONFIG[rsvp.status].colorKey]}
                  />
                  <ThemedText
                    style={[
                      styles.statusText,
                      { color: palette[RSVP_CONFIG[rsvp.status].colorKey] },
                    ]}
                  >
                    {RSVP_CONFIG[rsvp.status].label}
                  </ThemedText>
                </Row>
              </View>
            )}
          </Row>
        </View>
      </Row>

      <Row style={styles.actions}>
        {!isWaitlisted && onMarkAttendance && (
          <Clickable
            onPress={() => onMarkAttendance(!isAttended)}
            style={[
              styles.actionButton,
              {
                backgroundColor: isAttended ? palette.success : palette.surface,
                borderColor: isAttended ? palette.success : palette.border,
              },
            ]}
          >
            <Ionicons
              name={isAttended ? 'checkmark-circle' : 'checkmark-circle-outline'}
              size={18}
              color={isAttended ? palette.onPrimary : palette.success}
            />
          </Clickable>
        )}

        {onMessage && (
          <Clickable
            onPress={onMessage}
            style={[
              styles.actionButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
            accessibilityLabel="Message"
          >
            <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
          </Clickable>
        )}

        {onRecognise && (
          <Clickable
            onPress={onRecognise}
            style={[
              styles.actionButton,
              { backgroundColor: withAlpha(palette.warning, 0.09), borderColor: withAlpha(palette.warning, 0.2) },
            ]}
            accessibilityLabel={`Recognise ${athleteName}`}
          >
            <Ionicons name="sparkles" size={16} color={palette.warning} />
          </Clickable>
        )}

        {onCancel && (
          <Clickable
            accessibilityLabel="Close"
            onPress={onCancel}
            style={[
              styles.actionButton,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            <Ionicons name="close" size={18} color={palette.error} />
          </Clickable>
        )}
      </Row>

      {registration.notes && (
        <Row style={[styles.notesSection, { borderTopColor: palette.border }]}>
          <Ionicons name="document-text-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.notesText, { color: palette.muted }]}>
            {registration.notes}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  main: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.subheading },
  info: {
    flex: 1,
  },
  parentName: { ...Typography.caption, marginTop: Spacing.micro },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  statusText: { ...Typography.micro, textTransform: 'uppercase', letterSpacing: 0.5 },
  actions: {
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesSection: {
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  notesText: { ...Typography.caption, flex: 1, lineHeight: 16 },
});
