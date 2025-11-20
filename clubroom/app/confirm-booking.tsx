import { useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { formatGBP } from '@/constants/mock-data';

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

  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

    // Simulate payment processing
    setTimeout(async () => {
      try {
        // Create booking object
        const newBooking = {
          id: `booking-${Date.now()}`,
          coachId,
          coachName,
          athleteId: currentUser?.id,
          athleteName: currentUser?.name || 'User',
          scheduledAt: slotStart,
          status: 'CONFIRMED',
          duration: slotDuration,
          location: 'Training Ground',
          service: slotTitle,
          focus: slotFocus,
          price,
          paymentMethod: `Card ending in ${cardNumber.slice(-4)}`,
          createdAt: new Date().toISOString(),
        };

        // Store in AsyncStorage for this session
        const existingBookings = await AsyncStorage.getItem('session_bookings');
        const bookings = existingBookings ? JSON.parse(existingBookings) : [];
        bookings.push(newBooking);
        await AsyncStorage.setItem('session_bookings', JSON.stringify(bookings));

        setIsProcessing(false);

        // Show success and navigate
        Alert.alert(
          'Booking Confirmed! 🎉',
          `Your session with ${coachName} has been booked for ${formattedDate} at ${formattedTime}`,
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
    }, 2000); // Simulate 2 second processing time
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

          <View style={[styles.divider, { backgroundColor: palette.border }]} />

          <View style={styles.summaryRow}>
            <ThemedText type="defaultSemiBold">Total</ThemedText>
            <ThemedText type="subtitle" style={[styles.totalPrice, { color: palette.tint }]}>
              {formatGBP(price)}
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
              Confirm & Pay {formatGBP(price)}
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
