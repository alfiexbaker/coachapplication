import { useCallback, useEffect, useState } from 'react';

import { seenService } from '@/services/seen-service';
import { createLogger } from '@/utils/logger';
import type { DemoWalkthrough } from '@/utils/demo-walkthrough';

const logger = createLogger('useDemoWalkthroughVisibility');
const DEMO_WALKTHROUGH_ENTITY = 'demo_walkthrough';

function buildWalkthroughEntityId(userId: string, walkthroughId: string): string {
  return `${userId}:${walkthroughId}`;
}

export function useDemoWalkthroughVisibility(
  userId: string | undefined,
  walkthrough: DemoWalkthrough | null,
) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let isActive = true;

    if (!userId || !walkthrough) {
      setVisible(false);
      return () => {
        isActive = false;
      };
    }

    const entityId = buildWalkthroughEntityId(userId, walkthrough.id);

    void (async () => {
      const seenResult = await seenService.getSeenStatus(DEMO_WALKTHROUGH_ENTITY, entityId);
      if (!isActive) {
        return;
      }

      if (!seenResult.success) {
        logger.warn('Failed to resolve walkthrough visibility', {
          userId,
          walkthroughId: walkthrough.id,
          error: seenResult.error,
        });
        setVisible(true);
        return;
      }

      if (seenResult.data) {
        setVisible(false);
        return;
      }

      setVisible(true);
      void seenService.markSeen(DEMO_WALKTHROUGH_ENTITY, entityId, userId);
    })();

    return () => {
      isActive = false;
    };
  }, [userId, walkthrough?.id]);

  const dismissWalkthrough = useCallback(() => {
    if (!userId || !walkthrough) {
      setVisible(false);
      return;
    }

    setVisible(false);
    void seenService.markSeen(
      DEMO_WALKTHROUGH_ENTITY,
      buildWalkthroughEntityId(userId, walkthrough.id),
      userId,
    );
  }, [userId, walkthrough]);

  return {
    walkthrough: visible ? walkthrough : null,
    dismissWalkthrough,
  };
}
