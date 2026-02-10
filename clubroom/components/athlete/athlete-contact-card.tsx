/**
 * AthleteContactCard — Parent/guardian contact with call/message/email actions.
 */

import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { callPhone, sendEmail, openMessage } from '@/utils/contact-actions';
import type { RosterEntry } from '@/constants/types';
import { Row } from '@/components/primitives';

interface AthleteContactCardProps {
  athlete: RosterEntry;
}

function AthleteContactCardInner({ athlete }: AthleteContactCardProps) {
  const { colors } = useTheme();

  const handleCall = useCallback(() => {
    if (athlete.parentPhone) {
      void callPhone(athlete.parentPhone, athlete.parentName);
    }
  }, [athlete.parentPhone, athlete.parentName]);

  const handleEmail = useCallback(() => {
    if (athlete.parentEmail) void sendEmail(athlete.parentEmail);
  }, [athlete.parentEmail]);

  const handleMessage = useCallback(() => {
    openMessage(athlete.athleteId);
  }, [athlete.athleteId]);

  return (
    <SurfaceCard style={styles.card}>
      <ThemedText type="defaultSemiBold">Parent / Guardian</ThemedText>

      <Row style={styles.contactRow}>
        <View style={styles.contactInfo}>
          <ThemedText type="defaultSemiBold">{athlete.parentName}</ThemedText>
          <ThemedText style={[styles.detail, { color: colors.muted }]}>
            {athlete.parentEmail}
          </ThemedText>
          {athlete.parentPhone && (
            <ThemedText style={[styles.detail, { color: colors.muted }]}>
              {athlete.parentPhone}
            </ThemedText>
          )}
        </View>

        <Row gap="xs">
          <Clickable
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={handleMessage}
            accessibilityLabel="Message parent"
          >
            <Ionicons name="chatbubble-outline" size={18} color={colors.tint} />
          </Clickable>
          {athlete.parentPhone && (
            <Clickable
              style={[styles.iconButton, { borderColor: colors.border }]}
              onPress={handleCall}
              accessibilityLabel="Call parent"
            >
              <Ionicons name="call-outline" size={18} color={colors.tint} />
            </Clickable>
          )}
          <Clickable
            style={[styles.iconButton, { borderColor: colors.border }]}
            onPress={handleEmail}
            accessibilityLabel="Email parent"
          >
            <Ionicons name="mail-outline" size={18} color={colors.tint} />
          </Clickable>
        </Row>
      </Row>
    </SurfaceCard>
  );
}

export const AthleteContactCard = React.memo(AthleteContactCardInner);

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  contactRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactInfo: {
    flex: 1,
    gap: Spacing.micro,
  },
  detail: {
    ...Typography.bodySmall,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
