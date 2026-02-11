/**
 * SessionDetailModal — Composition root for session detail modal.
 * Sub-components: SessionInfoSection, SessionRegistrations, SessionInstanceManager, SessionBookingOptions
 * Hook: useSessionDetailModal
 */
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { Radii, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { SessionOffering } from '@/constants/types';
import { useSessionDetailModal } from '@/hooks/use-session-detail-modal';
import { SessionInfoSection } from './session-info-section';
import { SessionRegistrations } from './session-registrations';
import { SessionInstanceManager } from './session-instance-manager';
import { SessionBookingOptions } from './session-booking-options';

interface SessionDetailModalProps {
  visible: boolean;
  offering: SessionOffering | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function SessionDetailModal({
  visible,
  offering,
  onClose,
  onUpdate,
}: SessionDetailModalProps) {
  const { colors: palette, scheme } = useTheme();
  const {
    isCoach,
    isMyOffering,
    registeredCount,
    isFull,
    isRegistered,
    children,
    hasMultipleKids,
    selectedChildId,
    setSelectedChildId,
    weeksToBook,
    setWeeksToBook,
    sessionAwards,
    showInstanceManagement,
    setShowInstanceManagement,
    upcomingInstances,
    handleCancelInstance,
    handleCancelBooking,
    handleEndSeries,
    handleBook,
    formatSchedule,
  } = useSessionDetailModal(visible, offering, onClose, onUpdate);

  if (!offering) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <Row
          align="center"
          justify="between"
          style={[styles.header, { borderBottomColor: palette.border }]}
        >
          <Clickable accessibilityLabel="Close" onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Session Details
          </ThemedText>
          <View style={{ width: 28 }} />
        </Row>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SessionInfoSection
            offering={offering}
            isMyOffering={isMyOffering}
            registeredCount={registeredCount}
            sessionAwards={sessionAwards}
            formatSchedule={formatSchedule}
          />

          {isMyOffering && (
            <SessionRegistrations offering={offering} registeredCount={registeredCount} />
          )}

          {isMyOffering && offering.isRecurring && (
            <SessionInstanceManager
              showInstanceManagement={showInstanceManagement}
              onToggle={() => setShowInstanceManagement(!showInstanceManagement)}
              upcomingInstances={upcomingInstances}
              onCancelInstance={handleCancelInstance}
              onEndSeries={handleEndSeries}
            />
          )}

          {!isCoach && (
            <SessionBookingOptions
              isRegistered={isRegistered}
              isRecurring={offering.isRecurring ?? false}
              hasMultipleKids={hasMultipleKids}
              childOptions={children}
              selectedChildId={selectedChildId}
              onSelectChild={setSelectedChildId}
              weeksToBook={weeksToBook}
              onSetWeeks={setWeeksToBook}
              onCancelBooking={handleCancelBooking}
            />
          )}
        </ScrollView>

        {/* Book Now footer */}
        {!isCoach && !isRegistered && (
          <View
            style={[styles.footer, { borderTopColor: palette.border, ...Shadows[scheme].card }]}
          >
            <Clickable
              onPress={handleBook}
              disabled={isFull}
              style={[
                styles.bookButton,
                { backgroundColor: isFull ? palette.muted : palette.tint, ...Shadows[scheme].card },
              ]}
            >
              <ThemedText style={[styles.bookButtonText, { color: palette.onPrimary }]}>
                {isFull ? 'Session Full' : 'Book Now'}
              </ThemedText>
            </Clickable>
          </View>
        )}

        {/* Coach Complete Session footer */}
        {isMyOffering && registeredCount > 0 && (
          <View
            style={[styles.footer, { borderTopColor: palette.border, ...Shadows[scheme].card }]}
          >
            <Clickable
              onPress={() => {
                onClose();
                router.push(Routes.sessionComplete(offering.id));
              }}
              style={[
                styles.completeButton,
                { backgroundColor: palette.success, ...Shadows[scheme].card },
              ]}
            >
              <Row align="center" justify="center" gap={10}>
                <Ionicons name="checkmark-circle" size={22} color={palette.onSuccess} />
                <ThemedText style={[styles.completeButtonText, { color: palette.onSuccess }]}>
                  Complete Session
                </ThemedText>
              </Row>
            </Clickable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 0 },
  closeButton: { padding: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: { flex: 1, padding: 20 },
  footer: { padding: 20, borderTopWidth: 0 },
  bookButton: { paddingVertical: 18, borderRadius: Radii.md, alignItems: 'center' },
  bookButtonText: { fontSize: scaleFont(18), fontWeight: '700', letterSpacing: -0.4 },
  completeButton: { paddingVertical: 18, borderRadius: Radii.md },
  completeButtonText: { fontSize: scaleFont(18), fontWeight: '700', letterSpacing: -0.4 },
});
