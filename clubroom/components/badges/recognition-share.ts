/**
 * Recognition share helper — generates share text and opens native share dialog.
 */
import { Share, Platform } from 'react-native';
import { createLogger } from '@/utils/logger';
import type { BadgeAward } from '@/constants/types';

const logger = createLogger('RecognitionShare');

interface ShareRecognitionInput {
  award: BadgeAward;
  athleteName: string;
  coachName?: string;
}

export async function shareRecognition({ award, athleteName, coachName }: ShareRecognitionInput): Promise<boolean> {
  const categoryLabel = award.badgeCategory
    ? award.badgeCategory.charAt(0).toUpperCase() + award.badgeCategory.slice(1)
    : 'Development';

  const lines = [
    `${athleteName} received a ${categoryLabel} recognition!`,
    '',
    `"${award.reason}"`,
  ];

  if (coachName) {
    lines.push('', `— Coach ${coachName}`);
  }

  lines.push('', 'Sent via Clubroom');

  const message = lines.join('\n');

  try {
    const result = await Share.share(
      Platform.select({
        ios: { message },
        default: { message },
      }),
      { dialogTitle: `Share ${athleteName}'s recognition` },
    );

    const shared = result.action === Share.sharedAction;
    logger.info('recognition_shared', {
      awardId: award.id,
      athleteId: award.athleteId,
      shared,
    });
    return shared;
  } catch (error) {
    logger.error('recognition_share_failed', { awardId: award.id, error: String(error) });
    return false;
  }
}
