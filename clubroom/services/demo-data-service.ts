import { createLogger } from '@/utils/logger';

const logger = createLogger('DemoDataService');

export interface DemoEntity {
  id: string;
  isDemo: true;
}

export interface DemoCoachProfile extends DemoEntity {
  name: string;
  sport: string;
  rating: number;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

class DemoDataService {
  private coachCache = new Map<string, DemoCoachProfile>();

  getDemoCoach(id: string): DemoCoachProfile {
    const cached = this.coachCache.get(id);
    if (cached) return cached;

    const seed = hashString(id);
    const names = ['Emma', 'Jack', 'Sophie', 'Tom', 'Olivia', 'Aiden', 'Noah'];
    const sports = ['Football', 'Rugby', 'Hockey'];

    const coach: DemoCoachProfile = {
      id,
      isDemo: true,
      name: `${names[seed % names.length]} Demo`,
      sport: sports[seed % sports.length],
      rating: 4 + (seed % 11) / 10,
    };

    this.coachCache.set(id, coach);
    logger.debug('Generated demo coach profile', { id });
    return coach;
  }
}

export const demoDataService = new DemoDataService();
