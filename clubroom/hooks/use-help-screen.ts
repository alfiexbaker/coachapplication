import { useState, useCallback } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('useHelpScreen');

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

export function useHelpScreen() {
  const { currentUser } = useAuth();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const toggleFAQ = useCallback((index: number) => {
    setExpandedFAQ((prev) => (prev === index ? null : index));
  }, []);

  const handleContactSupport = useCallback(() => {
    logger.press('ContactSupport');
    void (async () => {
      const selected = await uiFeedback.choose({
        title: 'Contact Support',
        message: 'How would you like to reach us?',
        options: [
          { id: 'email', label: 'Email' },
          { id: 'chat', label: 'Live Chat' },
        ],
        cancelText: 'Cancel',
      });

      if (selected === 'email') {
        await Linking.openURL('mailto:support@clubroom.app');
        return;
      }
      if (selected === 'chat') {
        uiFeedback.showToast('Live chat support coming soon!');
      }
    })();
  }, []);

  const handleReportProblem = useCallback(() => {
    logger.press('ReportProblem');
    router.push(Routes.BOOKINGS_REPORT_PROBLEM);
  }, []);

  const handleSendFeedback = useCallback(() => {
    logger.press('SendFeedback');
    void (async () => {
      const selected = await uiFeedback.choose({
        title: 'Send Feedback',
        message: 'Your feedback helps us improve Clubroom. What would you like to share?',
        options: [
          { id: 'feature', label: 'Feature Request' },
          { id: 'general', label: 'General Feedback' },
        ],
        cancelText: 'Cancel',
      });

      if (selected === 'feature') {
        await Linking.openURL('mailto:feedback@clubroom.app?subject=Feature%20Request');
        return;
      }
      if (selected === 'general') {
        await Linking.openURL('mailto:feedback@clubroom.app?subject=General%20Feedback');
      }
    })();
  }, []);

  const handleRateApp = useCallback(() => {
    logger.press('RateApp');
    uiFeedback.showToast('Thanks for rating Clubroom!');
  }, []);

  const handleHelpCenter = useCallback(() => {
    logger.press('HelpCenter');
    Linking.openURL('https://help.clubroom.app');
  }, []);

  const handleVideoTutorials = useCallback(() => {
    logger.press('VideoTutorials');
    uiFeedback.showToast('Video tutorials coming soon!');
  }, []);

  const handleCommunityForum = useCallback(() => {
    logger.press('CommunityForum');
    uiFeedback.showToast('Community forum coming soon!');
  }, []);

  const handleShareApp = useCallback(() => {
    logger.press('ShareApp');
    uiFeedback.showToast('Share functionality coming soon!');
  }, []);

  return {
    currentUser,
    expandedFAQ,
    toggleFAQ,
    handleContactSupport,
    handleReportProblem,
    handleSendFeedback,
    handleRateApp,
    handleHelpCenter,
    handleVideoTutorials,
    handleCommunityForum,
    handleShareApp,
  };
}
