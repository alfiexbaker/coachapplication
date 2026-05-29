import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FamilyRegistration } from '@/hooks/use-group-session';
import type { RsvpStatus } from './whos-going-card-types';
import { RsvpPill } from './whos-going-rsvp-pill';

const RSVP_OPTIONS: {
  status: RsvpStatus;
  label: string;
  icon: string;
  activeColor: 'success' | 'warning' | 'error';
}[] = [
  { status: 'going', label: 'Going', icon: 'checkmark-circle', activeColor: 'success' },
  { status: 'maybe', label: 'Maybe', icon: 'help-circle', activeColor: 'warning' },
  { status: 'cant_go', label: "Can't", icon: 'close-circle', activeColor: 'error' },
];

interface ChildRowProps {
  familyReg: FamilyRegistration;
  currentStatus: RsvpStatus | null;
  responding: boolean;
  onRespond: (status: RsvpStatus) => void;
  onUnregister: () => void;
}

export function ChildRow({
  familyReg,
  currentStatus,
  responding,
  onRespond,
  onUnregister,
}: ChildRowProps) {
  const { colors } = useTheme();
  const isWaitlisted = familyReg.registration.status === 'WAITLISTED';
  const initials = familyReg.childName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.childRow}>
      <Row align="center" gap="sm" style={{ marginBottom: Spacing.xs }}>
        <View style={[styles.avatar, { backgroundColor: withAlpha(colors.tint, 0.12) }]}>
          <ThemedText style={[Typography.micro, { color: colors.tint }]}>{initials}</ThemedText>
        </View>

        <Column flex>
          <ThemedText type="defaultSemiBold" style={Typography.bodySmallSemiBold}>
            {familyReg.childName}
          </ThemedText>
          {isWaitlisted && (
            <ThemedText style={[Typography.micro, { color: colors.warning }]}>
              WAITLISTED
            </ThemedText>
          )}
        </Column>

        <Clickable
          onPress={onUnregister}
          hitSlop={8}
          accessibilityLabel={`Remove ${familyReg.childName}`}
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </Clickable>
      </Row>

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
}

const styles = StyleSheet.create({
  childRow: {
    paddingBottom: Spacing.xs,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
