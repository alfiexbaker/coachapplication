/**
 * Emergency Quick Access Screen
 *
 * Displays athlete emergency info: medical alerts, contacts, doctor, consent.
 * All state/logic in useEmergencyAccess hook. Detail sections extracted to component.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { ReactNode } from 'react';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { PageHeader } from '@/components/primitives/page-header';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { EmergencyQuickCard } from '@/components/safety/EmergencyQuickCard';
import { EmergencyDetails } from '@/components/safety/emergency-details';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useEmergencyAccess } from '@/hooks/use-emergency-access';

export default function EmergencyQuickAccessScreen() {
  const { colors: palette } = useTheme();
  const e = useEmergencyAccess();
  const renderState = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader title="Emergency Info" showBack centerTitle />
      {content}
    </SafeAreaView>
  );

  if (e.status === 'loading') {
    return renderState(<LoadingState variant="detail" />);
  }

  if (e.status === 'error') {
    return renderState(
      <ErrorState
        message={e.error?.message || 'Could not load emergency information for this athlete.'}
        onRetry={e.retry}
      />,
    );
  }

  if (e.status === 'empty' || !e.emergencyData) {
    return renderState(
      <EmptyState
        icon="shield-outline"
        title="No emergency profile"
        message="Emergency details have not been set for this athlete yet."
        actionLabel="Refresh"
        onPressAction={e.handleRefresh}
      />,
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Emergency Info"
        showBack
        centerTitle
        right={
          <Clickable onPress={e.handleRefresh} hitSlop={8} disabled={e.refreshing}>
            <Ionicons name="refresh" size={22} color={e.refreshing ? palette.muted : palette.tint} />
          </Clickable>
        }
      />

      {e.emergencyData.isCached && (
        <View style={styles.cachedWrap}>
          <Row
            align="center"
            gap="xxs"
            style={[styles.cachedBadge, { backgroundColor: withAlpha(palette.warning, 0.09) }]}
          >
            <Ionicons name="cloud-offline" size={12} color={palette.warning} />
            <ThemedText style={[styles.cachedText, { color: palette.warning }]}>Cached</ThemedText>
          </Row>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={e.refreshing}
            onRefresh={e.handleRefresh}
            tintColor={palette.tint}
          />
        }
      >
        <Animated.View entering={FadeInDown.springify()}>
          <EmergencyQuickCard
            athleteName={e.emergencyData.athleteName}
            alertLevel={e.emergencyData.alertLevel}
            allergies={e.emergencyData.allergies}
            conditions={e.emergencyData.conditions}
            medications={e.emergencyData.medications}
            primaryContact={e.emergencyData.primaryContact}
            onCallPrimary={
              e.emergencyData.primaryContact
                ? () =>
                    e.handleCallContact(
                      e.emergencyData!.primaryContact!.phone,
                      e.emergencyData!.primaryContact!.name,
                    )
                : undefined
            }
          />
        </Animated.View>

        <EmergencyDetails
          data={e.emergencyData}
          onCallContact={e.handleCallContact}
          onCallDoctor={e.handleCallDoctor}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cachedWrap: {
    alignItems: 'center',
    paddingBottom: Spacing.sm,
  },
  cachedBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  cachedText: { ...Typography.micro },
  content: { padding: Spacing.lg, gap: Spacing.md },
  bottomSpacer: { height: 40 },
});
