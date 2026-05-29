import { useState } from 'react';
import { Share } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { buildMailtoUrl, openExternalUrl } from '@/utils/external-url';

const logger = createLogger('useHelpScreen');
const SUPPORT_EMAIL = 'support@clubroom.app';
const FEEDBACK_EMAIL = 'feedback@clubroom.app';

export interface FAQItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I book a session?',
    answer:
      'Open Bookings, switch to Discover if needed, then choose a coach or session and follow the booking steps.',
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
      'Clubroom does not process payments in-app. Once a booking is confirmed, the coach or organization responsible for billing shares payment instructions, and payment status can then be tracked in the reconciler.',
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

  const toggleFAQ = (index: number) => {
    setExpandedFAQ((prev) => (prev === index ? null : index));
  };

  const handleContactSupport = () => {
    logger.press('ContactSupport');
    const body = [
      'Describe the issue you need help with.',
      '',
      `Account: ${currentUser?.id ?? 'unknown'}`,
    ].join('\n');
    void openExternalUrl(
      buildMailtoUrl(SUPPORT_EMAIL, {
        subject: 'Clubroom support request',
        body,
      }),
      'Could not open your email app right now.',
    );
  };

  const handleReportProblem = () => {
    logger.press('ReportProblem');
    router.push(Routes.BOOKINGS_REPORT_PROBLEM);
  };

  const handleSendFeedback = () => {
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
        await openExternalUrl(
          buildMailtoUrl(FEEDBACK_EMAIL, {
            subject: 'Clubroom feature request',
            body: `Account: ${currentUser?.id ?? 'unknown'}\n\nWhat would you like Clubroom to do?`,
          }),
          'Could not open your email app right now.',
        );
        return;
      }
      if (selected === 'general') {
        await openExternalUrl(
          buildMailtoUrl(FEEDBACK_EMAIL, {
            subject: 'Clubroom feedback',
            body: `Account: ${currentUser?.id ?? 'unknown'}\n\nTell us what is working and what is not.`,
          }),
          'Could not open your email app right now.',
        );
      }
    })();
  };

  const handleShareApp = () => {
    logger.press('ShareApp');
    void Share.share({
      message:
        'Clubroom helps coaches, parents, athletes, and clubs stay coordinated around football sessions.',
    }).catch((error) => {
      logger.error('Failed to share app', error);
      uiFeedback.showToast('Could not open the share sheet right now.', 'error');
    });
  };

  return {
    currentUser,
    expandedFAQ,
    toggleFAQ,
    handleContactSupport,
    handleReportProblem,
    handleSendFeedback,
    handleShareApp,
  };
}
