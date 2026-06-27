import type { UserRole } from '@/constants/user-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('PreApiLiveModeService');

interface LiveModeUserContext {
  userId: string;
  role: UserRole;
  displayName: string;
}

class PreApiLiveModeService {
  async start(context: LiveModeUserContext): Promise<void> {
    logger.debug('pre_api_live_mode_disabled', {
      userId: context.userId,
      role: context.role,
    });
  }

  stop(): void {}
}

export const preApiLiveModeService = new PreApiLiveModeService();
