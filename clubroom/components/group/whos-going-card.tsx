import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { DeadlineBadge } from '@/components/group/deadline-badge';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FamilyRegistration } from '@/hooks/use-group-session';
import { ChildRow } from './whos-going-child-row';
import type { RsvpStatus } from './whos-going-card-types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WhosGoingCardProps {
  registrations: FamilyRegistration[];
  deadline?: string | null;
  responding: boolean;
  onRsvpRespond: (reg: FamilyRegistration, status: RsvpStatus) => void;
  onUnregister: (reg: FamilyRegistration) => void;
  toButtonStatus: (s: string) => RsvpStatus | null;
}

export function WhosGoingCard({
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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
  },
});
