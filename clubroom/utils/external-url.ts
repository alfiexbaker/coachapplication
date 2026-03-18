import { Linking } from 'react-native';

import { uiFeedback } from '@/services/ui-feedback';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ExternalUrl');

interface MailtoOptions {
  subject?: string;
  body?: string;
}

export function buildMailtoUrl(to: string, options: MailtoOptions = {}) {
  const params = new URLSearchParams();

  if (options.subject) {
    params.set('subject', options.subject);
  }

  if (options.body) {
    params.set('body', options.body);
  }

  const query = params.toString();
  return query.length > 0 ? `mailto:${to}?${query}` : `mailto:${to}`;
}

export async function openExternalUrl(
  url: string,
  fallbackMessage = 'Could not open that link right now.',
) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      uiFeedback.showToast(fallbackMessage, 'error');
      return false;
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    logger.error('Failed to open external URL', { url, error });
    uiFeedback.showToast(fallbackMessage, 'error');
    return false;
  }
}
