import { badgeAwards as mockBadgeAwards, badgeCatalog } from '@/constants/mock-data';
import { BadgeAward, BadgeDefinition, BadgeVisibility } from '@/constants/types';
import { storageService } from './storage-service';
import { createLogger } from '@/utils/logger';

const STORAGE_KEY = 'clubroom.badge_awards';

type AwardBadgeInput = {
  badgeId: string;
  athleteId: string;
  athleteName?: string;
  coachId: string;
  coachName?: string;
  sessionId?: string;
  reason: string;
  note?: string;
  visibility?: BadgeVisibility;
  presetId?: string;
  overrideCooldown?: boolean;
  overrideNote?: string;
  context?: 'session' | 'athlete_profile';
};

class BadgeService {
  private logger = createLogger('BadgeService');

  private async getStoredAwards(): Promise<BadgeAward[]> {
    return storageService.getItem<BadgeAward[]>(STORAGE_KEY, []);
  }

  private mergeAwards(stored: BadgeAward[]): BadgeAward[] {
    const merged = new Map<string, BadgeAward>();
    mockBadgeAwards.forEach((award) => {
      merged.set(award.id, award);
    });
    stored.forEach((award) => {
      merged.set(award.id, award);
    });

    return Array.from(merged.values()).sort(
      (a, b) => new Date(b.awardedAt).getTime() - new Date(a.awardedAt).getTime(),
    );
  }

  async listDefinitions(): Promise<BadgeDefinition[]> {
    return badgeCatalog;
  }

  async listAwards(): Promise<BadgeAward[]> {
    const stored = await this.getStoredAwards();
    return this.mergeAwards(stored);
  }

  async listAwardsForAthlete(athleteId: string): Promise<BadgeAward[]> {
    const awards = await this.listAwards();
    return awards.filter((award) => award.athleteId === athleteId);
  }

  async listAwardsForSession(sessionId: string): Promise<BadgeAward[]> {
    const awards = await this.listAwards();
    return awards.filter((award) => award.sessionId === sessionId);
  }

  async awardBadge(input: AwardBadgeInput): Promise<BadgeAward> {
    const stored = await this.getStoredAwards();
    const definition = badgeCatalog.find((badge) => badge.id === input.badgeId);
    const allAwards = this.mergeAwards(stored);
    const mostRecentAward = allAwards.find((award) => award.athleteId === input.athleteId);
    const cooldownWindowDays = 7;

    if (mostRecentAward) {
      const lastAwardDate = new Date(mostRecentAward.awardedAt).getTime();
      const now = Date.now();
      const diffDays = (now - lastAwardDate) / (1000 * 60 * 60 * 24);

      if (diffDays < cooldownWindowDays && !input.overrideCooldown) {
        throw new Error(
          `Cooldown in effect. Last badge was ${Math.ceil(diffDays)} day(s) ago. Toggle exception with a note to proceed.`,
        );
      }

      if (diffDays < cooldownWindowDays && input.overrideCooldown && !input.overrideNote?.trim()) {
        throw new Error('Exception note is required to bypass the cooldown.');
      }
    }

    const award: BadgeAward = {
      id: `award_${Date.now()}`,
      badgeId: input.badgeId,
      badgeLabel: definition?.label || input.reason,
      badgeTone: definition?.tone,
      athleteId: input.athleteId,
      athleteName: input.athleteName,
      coachId: input.coachId,
      coachName: input.coachName,
      sessionId: input.sessionId,
      reason: input.reason,
      note: input.note,
      presetId: input.presetId,
      cooldownBypassed: Boolean(input.overrideCooldown),
      cooldownWindowDays,
      context: input.context ?? (input.sessionId ? 'session' : 'athlete_profile'),
      overrideNote: input.overrideNote,
      awardedBy: input.coachId,
      awardedByName: input.coachName,
      awardedAt: new Date().toISOString(),
      visibility: input.visibility || 'athlete',
    };

    const updated = [award, ...stored];
    await storageService.setItem(STORAGE_KEY, updated);
    this.logger.info('badge_awarded', {
      badgeId: input.badgeId,
      athleteId: input.athleteId,
      coachId: input.coachId,
      sessionId: input.sessionId,
      presetId: input.presetId,
      cooldownBypassed: Boolean(input.overrideCooldown),
      context: award.context,
      visibility: award.visibility,
    });

    return award;
  }

  async markShared(awardId: string): Promise<BadgeAward | undefined> {
    const stored = await this.getStoredAwards();
    const merged = this.mergeAwards(stored);
    const target = merged.find((award) => award.id === awardId);
    if (!target) return undefined;

    const updatedAward = { ...target, shared: true };
    const nextStored = [updatedAward, ...stored.filter((award) => award.id !== awardId)];
    await storageService.setItem(STORAGE_KEY, nextStored);
    this.logger.info('badge_shared', {
      badgeId: target.badgeId,
      athleteId: target.athleteId,
      awardId,
    });
    return updatedAward;
  }
}

export const badgeService = new BadgeService();
