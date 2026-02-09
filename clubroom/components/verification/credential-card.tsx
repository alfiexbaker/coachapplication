import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/primitives/badge';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { VerificationItem } from '@/constants/types';

interface CredentialCardProps {
  credential: VerificationItem;
  index: number;
  colors: ThemeColors;
}

export const CredentialCard = memo(function CredentialCard({ credential, index, colors }: CredentialCardProps) {
  const getStatusTone = () => {
    switch (credential.status) {
      case 'VERIFIED': return 'success';
      case 'PENDING': return 'warning';
      default: return 'neutral';
    }
  };

  const getStatusLabel = () => {
    switch (credential.status) {
      case 'VERIFIED': return 'Verified';
      case 'PENDING': return 'Under Review';
      case 'EXPIRED': return 'Expired';
      case 'FAILED': return 'Rejected';
      default: return 'Unknown';
    }
  };

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="sm" align="center">
        <View style={[styles.icon, { backgroundColor: withAlpha(colors.tint, 0.06) }]}>
          <Ionicons name="ribbon" size={20} color={colors.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">{credential.notes || `Credential ${index + 1}`}</ThemedText>
          {credential.verifiedAt && (
            <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
              Verified: {new Date(credential.verifiedAt).toLocaleDateString()}
            </ThemedText>
          )}
        </View>
        <Badge label={getStatusLabel()} tone={getStatusTone()} />
      </Row>
      {credential.expiresAt && (
        <Row gap="xs" align="center" style={styles.expiryRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.muted} />
          <ThemedText style={{ color: colors.muted, ...Typography.caption }}>
            Expires: {new Date(credential.expiresAt).toLocaleDateString()}
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expiryRow: {
    marginLeft: 52,
  },
});
