import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useHelpSettings');

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I book a session?',
    answer:
      'Navigate to the Discover tab, find a coach you like, and tap "Book Session". Follow the steps to select a date, time, and session type.',
  },
  {
    question: 'How do I cancel a booking?',
    answer:
      'Go to your Bookings tab, find the session you want to cancel, and tap on it. Then select "Cancel Booking". Note that cancellation policies may apply.',
  },
  {
    question: 'How do I become a coach?',
    answer:
      'To become a coach, sign up with a coach account and complete the verification process. This includes providing credentials and background check information.',
  },
  {
    question: 'How do payments work?',
    answer:
      'Payments are processed securely through our platform. Parents pay when booking, and coaches receive payouts weekly to their connected bank account.',
  },
  {
    question: 'How do I update my availability?',
    answer:
      'Coaches can update their availability by going to Settings > Availability. Set your weekly schedule and any one-off time blocks.',
  },
];

export function useHelpSettings() {
  const { currentUser } = useAuth();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = useCallback((index: number) => {
    setExpandedFAQ((prev) => (prev === index ? null : index));
  }, []);

  const handleContactSupport = useCallback(() => {
    logger.press('ContactSupport');
    Alert.alert('Contact Support', 'How would you like to reach us?', [
      { text: 'Email', onPress: () => Linking.openURL('mailto:support@clubroom.app') },
      {
        text: 'Live Chat',
        onPress: () => Alert.alert('Coming Soon', 'Live chat support coming soon!'),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  const handleReportProblem = useCallback(() => {
    logger.press('ReportProblem');
    router.push(Routes.BOOKINGS_REPORT_PROBLEM);
  }, []);

  const handleSendFeedback = useCallback(() => {
    logger.press('SendFeedback');
    Alert.alert(
      'Send Feedback',
      'Your feedback helps us improve Clubroom. What would you like to share?',
      [
        {
          text: 'Feature Request',
          onPress: () => Linking.openURL('mailto:feedback@clubroom.app?subject=Feature%20Request'),
        },
        {
          text: 'General Feedback',
          onPress: () => Linking.openURL('mailto:feedback@clubroom.app?subject=General%20Feedback'),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, []);

  const handleRateApp = useCallback(() => {
    logger.press('RateApp');
    Alert.alert('Rate Clubroom', "Enjoying the app? We'd love your rating on the App Store!", [
      { text: 'Not Now', style: 'cancel' },
      { text: 'Rate Now', onPress: () => Alert.alert('Thank You!', 'Thanks for rating Clubroom!') },
    ]);
  }, []);

  return {
    currentUser,
    expandedFAQ,
    toggleFAQ,
    handleContactSupport,
    handleReportProblem,
    handleSendFeedback,
    handleRateApp,
  };
}
