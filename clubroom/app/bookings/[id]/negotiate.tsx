/**
 * Negotiate Screen
 *
 * Displays negotiation history for a booking and handles accept/reject/counter-propose.
 * All state/logic in useNegotiate hook. Reject modal extracted to component.
 */

import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { CounterOfferCard } from '@/components/negotiate/CounterOfferCard';
import { NegotiationTimeline } from '@/components/negotiate/NegotiationTimeline';
import { RejectModal } from '@/components/negotiate/reject-modal';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useNegotiate } from '@/hooks/use-negotiate';

const HeaderBack = () => {
  const { colors: palette } = useTheme();
  return (
    <Clickable onPress={() => router.back()} style={styles.headerButton}>
      <Ionicons name="arrow-back" size={24} color={palette.text} />
    </Clickable>
  );
};

export default function NegotiateScreen() {
  const { colors: palette } = useTheme();
  const n = useNegotiate();

  if (n.isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Negotiation',
            headerLeft: () => <HeaderBack />,
          }}
        />
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (n.error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{ headerShown: true, headerTitle: 'Error', headerLeft: () => <HeaderBack /> }}
        />
        <ErrorState title="Unable to load negotiation" message={n.error} onRetry={n.loadData} />
      </SafeAreaView>
    );
  }

  if (!n.negotiation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Negotiation',
            headerLeft: () => <HeaderBack />,
          }}
        />
        <EmptyState
          icon="swap-horizontal-outline"
          title="No negotiation yet"
          message="Need to change the booking time? Start by proposing a new time."
          actionLabel="Propose new time"
          onPressAction={n.handleNewProposal}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Negotiation',
          headerLeft: () => <HeaderBack />,
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={n.isRefreshing}
            onRefresh={n.handleRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {/* Booking summary */}
        <View style={[styles.summary, { backgroundColor: palette.surface }]}>
          <Row style={styles.summaryRow}>
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <View style={styles.summaryInfo}>
              <ThemedText type="defaultSemiBold">Session with {n.negotiation.coachId}</ThemedText>
              <ThemedText style={{ color: palette.muted }}>
                For {n.negotiation.athleteId}
              </ThemedText>
            </View>
          </Row>
        </View>

        {n.pendingOffer && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Action Required
            </ThemedText>
            <CounterOfferCard
              offer={n.pendingOffer}
              isActionable
              onAccept={n.handleAccept}
              onReject={n.handleRejectPress}
              onCounterPropose={n.handleNewProposal}
              isLoading={n.isProcessing}
            />
          </View>
        )}

        <View style={[styles.section, { marginTop: Spacing.sm }]}>
          <NegotiationTimeline negotiation={n.negotiation} currentUserId={n.currentUserId} />
        </View>

        {n.canPropose && !n.pendingOffer && (
          <View style={{ marginTop: Spacing.md }}>
            <Button onPress={n.handleNewProposal}>
              <Row style={styles.proposalRow}>
                <Ionicons name="swap-horizontal" size={18} color={palette.onPrimary} />
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '600' }}>
                  Propose Different Time
                </ThemedText>
              </Row>
            </Button>
          </View>
        )}
      </ScrollView>

      <RejectModal
        visible={n.showRejectModal}
        reason={n.rejectReason}
        onReasonChange={n.setRejectReason}
        onConfirm={n.handleRejectConfirm}
        onCancel={n.handleRejectCancel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  headerButton: { padding: Spacing.xs },
  summary: { padding: Spacing.md, borderRadius: Radii.md },
  summaryRow: { alignItems: 'center', gap: Spacing.sm },
  summaryInfo: { flex: 1, gap: Spacing.micro },
  section: { gap: Spacing.sm },
  sectionTitle: { marginBottom: Spacing.xs },
  proposalButton: { marginTop: Spacing.md },
  proposalRow: { alignItems: 'center', gap: 8 },
});
