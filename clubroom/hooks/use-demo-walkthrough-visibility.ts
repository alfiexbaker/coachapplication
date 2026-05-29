import { useEffect, useState, startTransition } from 'react';

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
  const walkthroughId = walkthrough?.id;

  useEffect(() => {
    let isActive = true;

    if (!userId || !walkthroughId) {
      startTransition(() => {
        setVisible(false);
      });
      return () => {
        isActive = false;
      };
    }

    const entityId = buildWalkthroughEntityId(userId, walkthroughId);

    void (async () => {
      const seenResult = await seenService.getSeenStatus(DEMO_WALKTHROUGH_ENTITY, entityId);
      if (!isActive) {
        return;
      }

      if (!seenResult.success) {
        logger.warn('Failed to resolve walkthrough visibility', {
          userId,
          walkthroughId,
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
  }, [userId, walkthroughId]);

  const dismissWalkthrough = () => {
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
  };

  return {
    walkthrough: visible ? walkthrough : null,
    dismissWalkthrough,
  };
}
