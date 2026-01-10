import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { GroupRegistration } from '@/constants/types';

interface ParticipantCardProps {
  registration: GroupRegistration;
  onMarkAttendance?: (attended: boolean) => void;
  onCancel?: () => void;
  onMessage?: () => void;
}

export function ParticipantCard({
  registration,
  onMarkAttendance,
  onCancel,
  onMessage,
}: ParticipantCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const statusColors: Record<GroupRegistration['status'], { bg: string; text: string }> = {
    REGISTERED: { bg: `${palette.success}15`, text: palette.success },
    WAITLISTED: { bg: `${palette.warning}15`, text: palette.warning },
    CANCELLED: { bg: `${palette.error}15`, text: palette.error },
    ATTENDED: { bg: `${palette.tint}15`, text: palette.tint },
    NO_SHOW: { bg: `${palette.muted}15`, text: palette.muted },
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
      <View style={styles.main}>
        <View style={[styles.avatar, { backgroundColor: palette.border }]}>
          <ThemedText style={styles.avatarText}>
            {registration.athleteName.slice(0, 2).toUpperCase()}
          </ThemedText>
        </View>

        <View style={styles.info}>
          <ThemedText type="defaultSemiBold">{registration.athleteName}</ThemedText>
          <ThemedText style={[styles.parentName, { color: palette.muted }]}>
            Parent: {registration.parentName}
          </ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <ThemedText style={[styles.statusText, { color: colors.text }]}>
              {statusLabels[registration.status]}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
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
              color={isAttended ? '#fff' : palette.success}
            />
          </Clickable>
        )}

        {onMessage && (
          <Clickable
            onPress={onMessage}
            style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
          </Clickable>
        )}

        {onCancel && (
          <Clickable
            onPress={onCancel}
            style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
          >
            <Ionicons name="close" size={18} color={palette.error} />
          </Clickable>
        )}
      </View>

      {registration.notes && (
        <View style={[styles.notesSection, { borderTopColor: palette.border }]}>
          <Ionicons name="document-text-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.notesText, { color: palette.muted }]}>
            {registration.notes}
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  parentName: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
