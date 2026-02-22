import { type RefObject } from 'react';
import { type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { createLogger } from '@/utils/logger';

const logger = createLogger('BadgeShare');

export async function shareBadgeCard(
  viewRef: RefObject<View | null>,
  options?: { dialogTitle?: string },
): Promise<boolean> {
  if (!viewRef.current) {
    return false;
  }

  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return false;
    }

    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    await Sharing.shareAsync(uri, {
      mimeType: 'image/png',
      dialogTitle: options?.dialogTitle ?? 'Share badge',
    });

    return true;
  } catch (error) {
    logger.error('Failed to share badge card', error);
    return false;
  }
}
