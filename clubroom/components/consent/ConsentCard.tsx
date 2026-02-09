import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { ConsentGrid } from './ConsentGrid';
import { Spacing, Radii, Typography, Components , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { AthleteConsent } from '@/constants/types';
import { consentService } from '@/services/consent-service';

interface ConsentCardProps {
  athleteConsent: AthleteConsent;
  onPress?: () => void;
  showDetails?: boolean;
}

export function ConsentCard({
  athleteConsent,
  onPress,
  showDetails = false,
}: ConsentCardProps) {
  const { colors: palette } = useTheme();

  const { granted, total } = consentService.getConsentCount(athleteConsent);
  const percentage = consentService.getConsentPercentage(athleteConsent);
  const hasContentPosting = consentService.hasContentPostingConsent(athleteConsent);

  const getStatusColor = () => {
    if (percentage === 100) return palette.success;
    if (percentage >= 50) return palette.warning;
    return palette.error;
  };

  const getStatusLabel = () => {
    if (percentage === 100) return 'All consents granted';
    if (percentage >= 50) return 'Partial consent';
    if (percentage > 0) return 'Limited consent';
    return 'No consents';
  };

  return (
    <SurfaceCard style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        {/* Avatar */}
        {athleteConsent.athletePhotoUrl ? (
          <Image
            source={{ uri: athleteConsent.athletePhotoUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: palette.border }]}>
            <ThemedText style={styles.avatarText}>
              {athleteConsent.athleteName.slice(0, 2).toUpperCase()}
            </ThemedText>
          </View>
        )}

        {/* Info */}
        <View style={styles.info}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {athleteConsent.athleteName}
          </ThemedText>
          <ThemedText style={[styles.parentName, { color: palette.muted }]}>
            {athleteConsent.parentName}
          </ThemedText>
        </View>

        {/* Consent Count */}
        <View style={styles.countContainer}>
          <View
            style={[
              styles.countBadge,
              { backgroundColor: withAlpha(getStatusColor(), 0.09) },
            ]}
          >
            <ThemedText
              style={[styles.countText, { color: getStatusColor() }]}
            >
              {granted}/{total}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Consent Grid */}
      <View style={[styles.gridSection, { borderTopColor: palette.border }]}>
        <ConsentGrid consents={athleteConsent.consents} compact showLabels />
      </View>

      {/* Status Bar */}
      <View style={[styles.statusBar, { borderTopColor: palette.border }]}>
        <View style={styles.statusItem}>
          <Ionicons
            name={percentage === 100 ? 'checkmark-circle' : 'alert-circle'}
            size={14}
            color={getStatusColor()}
          />
          <ThemedText style={[styles.statusText, { color: palette.muted }]}>
            {getStatusLabel()}
          </ThemedText>
        </View>

        {hasContentPosting && (
          <View style={[styles.contentBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
            <Ionicons name="share-social" size={12} color={palette.success} />
            <ThemedText style={[styles.contentBadgeText, { color: palette.success }]}>
              Content OK
            </ThemedText>
          </View>
        )}
      </View>

      {/* Details Section */}
      {showDetails && (
        <View style={[styles.detailsSection, { borderTopColor: palette.border }]}>
          {athleteConsent.consents.map((consent) => (
            <View key={consent.type} style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons
                  name={consentService.getConsentIcon(consent.type) as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={consent.granted ? palette.success : palette.muted}
                />
                <ThemedText style={styles.detailLabel}>
                  {consentService.getConsentLabel(consent.type)}
                </ThemedText>
              </View>
              <View style={styles.detailRight}>
                {consent.granted ? (
                  <>
                    <ThemedText style={[styles.detailValue, { color: palette.success }]}>
                      Granted
                    </ThemedText>
                    {consent.grantedBy && (
                      <ThemedText style={[styles.detailMeta, { color: palette.muted }]}>
                        by {consent.grantedBy}
                      </ThemedText>
                    )}
                  </>
                ) : (
                  <ThemedText style={[styles.detailValue, { color: palette.muted }]}>
                    Not granted
                  </ThemedText>
                )}
              </View>
            </View>
          ))}
        </View>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Components.card.padding,
    gap: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...Typography.bodySmallSemiBold },
  info: {
    flex: 1,
  },
  parentName: { ...Typography.caption, marginTop: Spacing.micro },
  countContainer: {
    alignItems: 'flex-end',
  },
  countBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  countText: { ...Typography.smallSemiBold },
  gridSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statusText: { ...Typography.caption },
  contentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    paddingHorizontal: 8,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
  },
  contentBadgeText: { ...Typography.caption },
  detailsSection: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailLabel: { ...Typography.small },
  detailRight: {
    alignItems: 'flex-end',
  },
  detailValue: { ...Typography.caption },
  detailMeta: { ...Typography.micro },
});
