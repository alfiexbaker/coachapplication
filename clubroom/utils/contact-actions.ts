/**
 * Contact Actions — shared helpers for call, email, and message actions.
 * Wraps Linking with haptic feedback and error handling.
 */

import { Alert, Linking, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ContactActions');

/**
 * Open the phone dialer with a given number.
 * Provides haptic feedback and confirmation before dialing.
 */
export async function callPhone(
  phoneNumber: string,
  contactName?: string
): Promise<void> {
  const cleaned = phoneNumber.replace(/\s+/g, '');
  const url = `tel:${cleaned}`;

  Alert.alert(
    `Call ${contactName || 'Contact'}`,
    `Call ${phoneNumber}?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: async () => {
          if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
              await Linking.openURL(url);
            } else {
              Alert.alert('Cannot Call', 'Phone calls are not supported on this device.');
            }
          } catch (error) {
            logger.error('Failed to open phone dialer', error);
            Alert.alert('Error', 'Could not open phone dialer.');
          }
        },
      },
    ]
  );
}

/**
 * Open the default email client with a pre-filled recipient.
 */
export async function sendEmail(
  email: string,
  subject?: string
): Promise<void> {
  if (Platform.OS !== 'web') {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  const params = subject ? `?subject=${encodeURIComponent(subject)}` : '';
  const url = `mailto:${email}${params}`;

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot Email', 'Email is not supported on this device.');
    }
  } catch (error) {
    logger.error('Failed to open email client', error);
    Alert.alert('Error', 'Could not open email client.');
  }
}

/**
 * Navigate to in-app messaging thread with an athlete/parent.
 */
export function openMessage(athleteId: string): void {
  if (Platform.OS !== 'web') {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  router.push(Routes.messagesWith({ athleteId }));
}
