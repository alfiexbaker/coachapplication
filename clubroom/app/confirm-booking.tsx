import { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { formatGBP, getChildrenForParent } from '@/constants/mock-data';
import { bookingService } from '@/services/booking-service';
import { notificationService } from '@/services/notification-service';
import { hasChildren } from '@/utils/user-helpers';

export default function ConfirmBookingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const params = useLocalSearchParams();

  const coachId = params.coachId as string;
  const coachName = params.coachName as string;
  const slotId = params.slotId as string;
  const slotTitle = params.slotTitle as string;
  const slotFocus = params.slotFocus as string;
  const slotStart = params.slotStart as string;
  const slotDuration = parseInt(params.slotDuration as string);
  const price = parseFloat(params.price as string);
  const serviceType = params.serviceType as string;
  const objectivesParam = params.objectives as string;
  const objectives = objectivesParam ? JSON.parse(objectivesParam) : [];
  const athleteIdsParam = params.athleteIds as string;
  const athleteIds = athleteIdsParam ? JSON.parse(athleteIdsParam) : [];

  // Mock group participants for group sessions
  const isGroupSession = serviceType === 'Small Group';
  const groupParticipants = isGroupSession
    ? [
        { id: '1', name: 'Emma W.' },
        { id: '2', name: 'Jack T.' },
        { id: '3', name: 'Sarah M.' },
        { id: '4', name: 'Liam P.' },
        { id: '5', name: 'Olivia K.' },
      ]
    : [];

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Get athlete info from athleteIds
  const [athletesInfo, setAthletesInfo] = useState<Array<{ id: string; name: string; avatar?: string }>>([]);

  const slotDate = new Date(slotStart);
  const formattedDate = slotDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = slotDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  // Fetch athlete info based on athleteIds
  useEffect(() => {
    if (!currentUser || athleteIds.length === 0) return;

    if (hasChildren(currentUser)) {
      const userChildren = getChildrenForParent(currentUser.id);
      const selectedChildren = userChildren.filter((child) => athleteIds.includes(child.id));
      setAthletesInfo(selectedChildren.map((child) => ({
        id: child.id,
        name: child.name,
        avatar: child.avatar,
      })));
    } else {
      // User: they ARE the athlete
      setAthletesInfo([{
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      }]);
    }
  }, [currentUser, athleteIds]);

  const handleCardNumberChange = (value: string) => {
    // Remove non-digits
    const cleaned = value.replace(/\D/g, '');
    // Add spaces every 4 digits
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted.substring(0, 19)); // Max 16 digits + 3 spaces
  };

  const handleExpiryChange = (value: string) => {
    // Remove non-digits
    const cleaned = value.replace(/\D/g, '');
    // Add slash after 2 digits
    if (cleaned.length >= 2) {
      setExpiryDate(`${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`);
    } else {
      setExpiryDate(cleaned);
    }
  };

  const handleCvvChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setCvv(cleaned.substring(0, 3));
  };

  const handleConfirmBooking = async () => {
    if (athletesInfo.length === 0) {
      Alert.alert('Error', 'Unable to determine athlete information. Please try again.');
      return;
    }

    if (!cardNumber || !expiryDate || !cvv) {
      Alert.alert('Error', 'Please fill in all payment details');
      return;
    }

    if (cardNumber.replace(/\s/g, '').length !== 16) {
      Alert.alert('Error', 'Please enter a valid card number');
      return;
    }

    if (!expiryDate.match(/^\d{2}\/\d{2}$/)) {
      Alert.alert('Error', 'Please enter a valid expiry date (MM/YY)');
      return;
    }

    if (cvv.length !== 3) {
      Alert.alert('Error', 'Please enter a valid CVV');
      return;
    }

    setIsProcessing(true);

    try {
      // Create bookings for each athlete using the booking service
      const results = await Promise.all(
        athletesInfo.map((athleteInfo) =>
          bookingService.createBooking({
            coachId,
            coachName,
            athleteId: athleteInfo.id,
            athleteName: athleteInfo.name,
            bookedById: currentUser?.id || 'unknown',
            bookedByName: currentUser?.name || currentUser?.fullName || 'Parent',
            scheduledAt: slotStart,
            duration: slotDuration,
            location: 'Training Ground',
            service: slotTitle,
            serviceType,
            objectives,
            price,
          })
        )
      );

      // Check if any bookings failed
      const failedBookings = results.filter((r) => !r.success);
      if (failedBookings.length > 0) {
        setIsProcessing(false);
        Alert.alert(
          'Booking Issue',
          failedBookings[0].error || 'Some bookings could not be completed. Please try again.'
        );
        return;
      }

      // Create notifications for coach and parent
      for (const athleteInfo of athletesInfo) {
        // Notify coach of new booking
        await notificationService.notifyCoachNewBooking({
          coachId,
          parentName: currentUser?.name || currentUser?.fullName || 'Parent',
          childName: athleteInfo.name,
          date: formattedDate,
          bookingId: results[0]?.booking?.id || 'new',
        });

        // Notify parent of confirmed booking
        await notificationService.notifyParentBookingConfirmed({
          parentId: currentUser?.id || 'parent',
          coachName,
          date: `${formattedDate} at ${formattedTime}`,
          bookingId: results[0]?.booking?.id || 'new',
        });
      }

      setIsProcessing(false);

      const athleteNames = athletesInfo.map((a) => a.name).join(', ');
      const message = athletesInfo.length === 1
        ? `Your session with ${coachName} has been booked for ${formattedDate} at ${formattedTime}`
        : `${athletesInfo.length} sessions booked for ${athleteNames} with ${coachName} on ${formattedDate} at ${formattedTime}`;

      Alert.alert(
        'Booking Confirmed',
        message,
        [
          {
            text: 'View Bookings',
            onPress: () => {
              router.replace('/(tabs)/bookings');
            },
          },
          {
            text: 'Find More Coaches',
            onPress: () => {
              router.replace('/(tabs)');
            },
          },
        ]
      );
    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Error', 'Failed to process booking. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} disabled={isProcessing}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Pressable>
          <ThemedText type="subtitle">Confirm Booking</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        {/* Booking Summary */}
        <SurfaceCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="calendar" size={24} color={palette.tint} />
            <ThemedText type="defaultSemiBold" style={styles.summaryTitle}>
              Booking Summary
            </ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Coach</ThemedText>
            <ThemedText type="defaultSemiBold">{coachName}</ThemedText>
          </View>

          {athletesInfo.length > 0 && (
            <View style={styles.summaryRow}>
              <ThemedText style={{ color: palette.muted }}>
                {athletesInfo.length === 1 ? 'Athlete' : 'Athletes'}
              </ThemedText>
              <ThemedText type="defaultSemiBold">
                {athletesInfo.map((a) => a.name).join(', ')}
              </ThemedText>
            </View>
          )}

          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Session</ThemedText>
            <ThemedText type="defaultSemiBold">{slotTitle}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Focus</ThemedText>
            <ThemedText type="defaultSemiBold">{slotFocus}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Date</ThemedText>
            <ThemedText type="defaultSemiBold">{formattedDate}</ThemedText>
          </View>

          <View style={styles.summaryRow}>
            <ThemedText style={{ color: palette.muted }}>Time</ThemedText>
            <ThemedText type="defaultSemiBold">
              {formattedTime} ({slotDuration} min)
            </ThemedText>
          </View>

          {objectives.length > 0 && (
            <View style={styles.objectivesSection}>
              <ThemedText style={{ color: palette.muted }}>Focus Areas</ThemedText>
              <View style={styles.objectivesChips}>
                {objectives.map((objective: string, index: number) => (
                  <View
                    key={index}
                    style={[styles.objectiveChip, { backgroundColor: palette.tint + '15', borderColor: palette.tint }]}
                  >
                    <Ionicons name="football" size={14} color={palette.tint} />
                    <ThemedText style={[styles.objectiveText, { color: palette.tint }]}>
                      {objective}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {isGroupSession && (
            <View style={styles.participantsSection}>
              <View style={styles.participantsHeader}>
                <Ionicons name="people" size={16} color={palette.muted} />
                <ThemedText style={{ color: palette.muted }}>
                  Group Session: {groupParticipants.length + 1}/8 spots filled
                </ThemedText>
              </View>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.summaryRow}>
            <ThemedText type="defaultSemiBold">
              {athletesInfo.length > 1 ? `Total (${athletesInfo.length} × ${formatGBP(price)})` : 'Total'}
            </ThemedText>
            <ThemedText type="subtitle" style={[styles.totalPrice, { color: palette.tint }]}>
              {formatGBP(price * athletesInfo.length)}
            </ThemedText>
          </View>
        </SurfaceCard>

        {/* Payment Form */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Payment Details
          </ThemedText>

          <SurfaceCard style={styles.paymentCard}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Card Number</ThemedText>
              <View style={[styles.inputContainer, { backgroundColor: palette.background, borderColor: palette.border }]}>
                <Ionicons name="card-outline" size={20} color={palette.icon} />
                <TextInput
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={palette.muted}
                  keyboardType="number-pad"
                  editable={!isProcessing}
                  style={[styles.input, { color: palette.text }]}
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>Expiry Date</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <TextInput
                    value={expiryDate}
                    onChangeText={handleExpiryChange}
                    placeholder="MM/YY"
                    placeholderTextColor={palette.muted}
                    keyboardType="number-pad"
                    editable={!isProcessing}
                    style={[styles.input, { color: palette.text }]}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText style={styles.inputLabel}>CVV</ThemedText>
                <View style={[styles.inputContainer, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <TextInput
                    value={cvv}
                    onChangeText={handleCvvChange}
                    placeholder="123"
                    placeholderTextColor={palette.muted}
                    keyboardType="number-pad"
                    secureTextEntry
                    editable={!isProcessing}
                    style={[styles.input, { color: palette.text }]}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.securityNote, { backgroundColor: palette.tint + '10' }]}>
              <Ionicons name="lock-closed" size={16} color={palette.tint} />
              <ThemedText style={[styles.securityText, { color: palette.tint }]}>
                Your payment information is secure and encrypted
              </ThemedText>
            </View>
          </SurfaceCard>

          <View style={styles.testNotice}>
            <Ionicons name="information-circle-outline" size={20} color={palette.muted} />
            <ThemedText style={[styles.testNoticeText, { color: palette.muted }]}>
              This is a demo. No actual payment will be processed. Booking will be stored in session cache.
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          onPress={handleConfirmBooking}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.confirmButton,
            {
              backgroundColor: isProcessing ? palette.border : palette.tint,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator color="#fff" />
              <ThemedText style={styles.confirmButtonText}>Processing...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.confirmButtonText}>
              Confirm & Pay {formatGBP(price * athletesInfo.length)}
            </ThemedText>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  summaryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  childSelectorCard: {
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  summaryTitle: {
    fontSize: 18,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
  objectivesSection: {
    gap: Spacing.sm,
  },
  objectivesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  objectiveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  objectiveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  participantsSection: {
    gap: Spacing.sm,
  },
  participantsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  participantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  participantBubble: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  participantName: {
    fontSize: 12,
    fontWeight: '600',
  },
  totalPrice: {
    fontSize: 22,
  },
  section: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  paymentCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 2,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    paddingVertical: 0,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.sm,
    marginTop: Spacing.xs,
  },
  securityText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  testNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  testNoticeText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
  },
  confirmButton: {
    paddingVertical: Spacing.md + 4,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
