import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';
import { buildMailtoUrl, openExternalUrl } from '@/utils/external-url';
import { formatSupportRef } from '@/utils/support-ref';

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
      'Parents and athletes can open Bookings, choose Discover, then select a coach or open session.',
  },
  {
    question: 'How do I cancel a booking?',
    answer:
      'Open Bookings, select the session, then choose Cancel Booking. The booking shows any cancellation terms that apply.',
  },
  {
    question: 'How do I become a coach?',
    answer:
      'Create a coach account, then complete the identity and coaching verification checks before accepting bookings.',
  },
  {
    question: 'How do payments work?',
    answer:
      'Clubroom does not take payments. The coach or club sends payment instructions and records whether payment is due or paid.',
  },
  {
    question: 'How do I update my availability?',
    answer:
      'Coach accounts can open Settings, then Availability, to set recurring slots or block specific dates.',
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
      `Support ref: ${formatSupportRef(currentUser?.id)}`,
    ].join('\n');
    void openExternalUrl(
      buildMailtoUrl(SUPPORT_EMAIL, {
        subject: 'Clubroom support request',
        body,
      }),
      'Could not open your email app right now.',
    );
  };

  const handleSendFeedback = () => {
    logger.press('SendFeedback');
    void (async () => {
      const selected = await uiFeedback.choose({
        title: 'Send feedback',
        message: 'Choose what you want to send.',
        options: [
          { id: 'feature', label: 'Suggest a feature' },
          { id: 'general', label: 'General feedback' },
        ],
        cancelText: 'Cancel',
      });

      if (selected === 'feature') {
        await openExternalUrl(
          buildMailtoUrl(FEEDBACK_EMAIL, {
            subject: 'Clubroom feature request',
            body: `Support ref: ${formatSupportRef(currentUser?.id)}\n\nWhat would you like Clubroom to do?`,
          }),
          'Could not open your email app right now.',
        );
        return;
      }
      if (selected === 'general') {
        await openExternalUrl(
          buildMailtoUrl(FEEDBACK_EMAIL, {
            subject: 'Clubroom feedback',
            body: `Support ref: ${formatSupportRef(currentUser?.id)}\n\nTell us what is working and what is not.`,
          }),
          'Could not open your email app right now.',
        );
      }
    })();
  };

  return {
    expandedFAQ,
    toggleFAQ,
    handleContactSupport,
    handleSendFeedback,
  };
}
