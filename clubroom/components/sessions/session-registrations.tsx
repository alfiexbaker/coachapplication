/**
 * SessionRegistrations — Coach view: list of registered athletes.
 */
import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { SessionOffering } from '@/constants/types';
import { getSessionRegistrationUserName } from '@/utils/session-display';

interface SessionRegistrationsProps {
  offering: SessionOffering;
  registeredCount: number;
}

function SessionRegistrationsInner({ offering, registeredCount }: SessionRegistrationsProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="subtitle">Registered Athletes ({registeredCount})</ThemedText>
      {offering.registrations.length === 0 ? (
        <ThemedText style={styles.emptyText}>No registrations yet</ThemedText>
      ) : (
        offering.registrations
          .filter((r) => r.status === 'confirmed')
          .map((reg) => (
            <Row
              key={reg.id}
              align="center"
              gap={12}
              style={[styles.registration, { borderBottomColor: palette.border }]}
            >
              <Ionicons name="person" size={20} color={palette.icon} />
              <ThemedText style={styles.regName}>{getSessionRegistrationUserName(reg)}</ThemedText>
              <ThemedText style={styles.regDate}>
                {new Date(reg.bookedAt).toLocaleDateString()}
              </ThemedText>
            </Row>
          ))
      )}
    </SurfaceCard>
  );
}

export const SessionRegistrations = memo(SessionRegistrationsInner);

const styles = StyleSheet.create({
  card: { marginBottom: 16, padding: 20, gap: 14 },
  emptyText: {
    fontSize: scaleFont(15),
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: scaleFont(21),
  },
  registration: { paddingVertical: Spacing.xs + Spacing.xxs, borderBottomWidth: 1 },
  regName: { flex: 1, fontWeight: '600', fontSize: scaleFont(15), lineHeight: scaleFont(21) },
  regDate: { fontSize: scaleFont(13), opacity: 0.5 },
});
