import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { UpcomingSession } from '@/hooks/use-invite-session-flow';
import { formatDateTime } from '@/hooks/use-invite-session-flow';
import type { Athlete } from '@/hooks/use-invite-athletes';
import { styles } from './invite-session-step-styles';

export interface ConfirmStepProps {
  session: UpcomingSession;
  athletes: Athlete[];
  onConfirm: () => void;
  onChangeAthletes: () => void;
}

export function ConfirmStep({ session, athletes, onConfirm, onChangeAthletes }: ConfirmStepProps) {
  const { colors: palette } = useTheme();
  const { date, time } = formatDateTime(session.scheduledAt);
  return (
    <View style={styles.confirmContainer}>
      <SurfaceCard style={styles.confirmCard}>
        <View style={styles.confirmHeader}>
          <Ionicons name="checkmark-circle" size={48} color={palette.success} />
          <ThemedText type="subtitle" style={{ marginTop: Spacing.sm }}>
            Ready to Invite
          </ThemedText>
        </View>
        <Divider spacing={Spacing.sm} />
        <View style={styles.confirmDetail}>
          <ThemedText style={[styles.confirmLabel, { color: palette.muted }]}>Session</ThemedText>
          <ThemedText type="defaultSemiBold">{session.title || 'Coaching Session'}</ThemedText>
          <ThemedText style={{ ...Typography.small, color: palette.muted }}>
            {date} at {time}
          </ThemedText>
        </View>
        <View style={styles.confirmDetail}>
          <ThemedText style={[styles.confirmLabel, { color: palette.muted }]}>Athletes</ThemedText>
          <ThemedText type="defaultSemiBold">
            {athletes.length} athlete{athletes.length !== 1 ? 's' : ''}
          </ThemedText>
          <ThemedText style={{ ...Typography.small, color: palette.muted }} numberOfLines={2}>
            {athletes.map((a) => a.name).join(', ')}
          </ThemedText>
        </View>
      </SurfaceCard>
      <Clickable
        style={[styles.confirmButton, { backgroundColor: palette.success }]}
        onPress={onConfirm}
      >
        <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
        <ThemedText style={[styles.confirmButtonText, { color: palette.onPrimary }]}>
          Send Invitations
        </ThemedText>
      </Clickable>
      <Clickable
        style={[styles.changeButton, { borderColor: palette.border }]}
        onPress={onChangeAthletes}
      >
        <ThemedText style={{ color: palette.tint }}>Change Athletes</ThemedText>
      </Clickable>
    </View>
  );
}
