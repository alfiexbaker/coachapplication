import type { MonthSummary } from '@/types/progress-types';
import type { SessionFeedback, SkillLevel } from '@/services/progress-service';
import { err, ok, type Result, type ServiceError } from '@/types/result';
import { createLogger } from '@/utils/logger';
const logger = createLogger('MonthlySummaryService');
void logger;
export interface MonthlySummaryCopy {
  monthTitle: string;
  narrative: string;
  valueLine: string;
}
const POSITIVE_FEEDBACK_PATTERN =
  /excellent|great|strong|impressed|outstanding|brilliant|confident|sharp|composed/i;

/** Maps 1-10 stored skill level to canonical label (matches RATING_LABELS). */
function getSkillLevelLabel(level: number): string {
  const dots = Math.max(1, Math.min(5, Math.ceil(level / 2)));
  if (dots === 1) return 'Developing';
  if (dots === 2) return 'Good';
  if (dots === 3) return 'Very Good';
  if (dots === 4) return 'Excellent';
  return 'Exceptional';
}
function buildMonthTitle(now: Date): string {
  const month = now.toLocaleDateString('en-GB', {
    month: 'long',
  });
  return `${month} Summary`;
}
function sanitizeSnippet(summary: string): string {
  const compact = summary.replace(/\s+/g, ' ').trim();
  if (compact.length <= 80) {
    return compact;
  }
  return `${compact.slice(0, 80).trimEnd()}...`;
}
function buildNarrative(
  athleteName: string,
  summary: MonthSummary,
  skills: SkillLevel[],
  feedback: SessionFeedback[],
): string {
  const parts: string[] = [];
  if (summary.skillsImproved >= 2) {
    parts.push(`${athleteName} had a strong month.`);
  } else if (summary.sessionsAttended >= 4) {
    parts.push(`${athleteName} showed great consistency this month.`);
  } else if (summary.badgesEarned > 0) {
    parts.push(`${athleteName} earned recognition this month.`);
  } else {
    parts.push(`Here's ${athleteName}'s month in review.`);
  }
  const improvedSkills = skills
    .filter((skill) => skill.trend === 'improving')
    .sort((left, right) => {
      const leftDelta = left.level - (left.previousLevel ?? left.level);
      const rightDelta = right.level - (right.previousLevel ?? right.level);
      return rightDelta - leftDelta;
    });
  const topImproved = improvedSkills[0];
  if (topImproved) {
    const currentLevelLabel = getSkillLevelLabel(topImproved.level);
    const previousLevelLabel = getSkillLevelLabel(topImproved.previousLevel ?? topImproved.level);
    if (currentLevelLabel !== previousLevelLabel) {
      parts.push(`${topImproved.skill} moved from ${previousLevelLabel} to ${currentLevelLabel}.`);
    }
  }
  const sortedFeedback = Array.from(feedback).toSorted(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );
  const latestCoachFirstName = sortedFeedback[0]?.coachName.split(' ')[0];
  const highlighted = sortedFeedback.find((entry) =>
    POSITIVE_FEEDBACK_PATTERN.test(entry.publicSummary),
  );
  if (latestCoachFirstName && highlighted?.publicSummary) {
    parts.push(
      `Coach ${latestCoachFirstName} noted: "${sanitizeSnippet(highlighted.publicSummary)}"`,
    );
  }
  return parts.join(' ');
}
function buildValueLine(summary: MonthSummary): string {
  const estimatedHours = Math.round((summary.sessionsAttended * 90) / 60);
  const hoursLabel = estimatedHours === 1 ? 'hour' : 'hours';
  return `Your £20 this month: ${estimatedHours} ${hoursLabel} of qualified coaching, ${summary.feedbackCount} pieces of personalised feedback, and measurable skill improvement.`;
}
function buildMonthlySummary(
  athleteName: string,
  summary: MonthSummary,
  skills: SkillLevel[],
  feedback: SessionFeedback[],
): Result<MonthlySummaryCopy, ServiceError> {
  try {
    const now = new Date();
    return ok({
      monthTitle: buildMonthTitle(now),
      narrative: buildNarrative(athleteName, summary, skills, feedback),
      valueLine: buildValueLine(summary),
    });
  } catch (error) {
    return err({
      code: 'UNKNOWN',
      message: 'Failed to generate monthly summary copy',
      details: error,
    });
  }
}
interface MonthlyStoryPage {
  id: string;
  type: 'intro' | 'stat' | 'coach_quote' | 'badges' | 'next_focus';
  title: string;
  body: string;
  accent?: string;
  stat?: {
    value: string;
    label: string;
  };
  photo?: string;
}
interface MediaItem {
  photos: {
    uri: string;
    thumbnailUri: string;
  }[];
  video: {
    uri: string;
  } | null;
}
function buildMonthlyStory(
  athleteName: string,
  summary: MonthSummary,
  skills: SkillLevel[],
  feedback: SessionFeedback[],
  media?: MediaItem[],
): Result<MonthlyStoryPage[], ServiceError> {
  try {
    const pages: MonthlyStoryPage[] = [];
    const now = new Date();
    const monthName = now.toLocaleDateString('en-GB', {
      month: 'long',
    });

    // Page 1: Intro
    pages.push({
      id: 'intro',
      type: 'intro',
      title: `${monthName} in Review`,
      body: `Here's what ${athleteName} achieved this month.`,
      accent: '#6366F1',
    });

    // Page 2: Key stat
    pages.push({
      id: 'sessions-stat',
      type: 'stat',
      title: 'Training Sessions',
      body:
        summary.sessionsAttended === 1
          ? `${athleteName} attended 1 session this month.`
          : `${athleteName} attended ${summary.sessionsAttended} sessions this month.`,
      stat: {
        value: `${summary.sessionsAttended}`,
        label: 'Sessions attended',
      },
      accent: '#3B82F6',
    });

    // Page 3: Coach quote (if available)
    const sortedFeedback = Array.from(feedback).toSorted(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const highlighted = sortedFeedback.find((entry) =>
      POSITIVE_FEEDBACK_PATTERN.test(entry.publicSummary),
    );
    if (highlighted) {
      pages.push({
        id: 'coach-quote',
        type: 'coach_quote',
        title: 'Coach Said',
        body: sanitizeSnippet(highlighted.publicSummary),
        accent: '#10B981',
      });
    }

    // Page 4: Badges
    if (summary.badgesEarned > 0) {
      pages.push({
        id: 'badges',
        type: 'stat',
        title: 'Badges Earned',
        body: `${athleteName} earned ${summary.badgesEarned} badge${summary.badgesEarned === 1 ? '' : 's'} this month.`,
        stat: {
          value: `${summary.badgesEarned}`,
          label: 'New badges',
        },
        accent: '#F59E0B',
      });
    }

    // Page 5: Skills improved
    if (summary.skillsImproved > 0) {
      const topSkill = skills.find((s) => s.trend === 'improving');
      pages.push({
        id: 'skills',
        type: 'stat',
        title: 'Skills Growing',
        body: topSkill
          ? `${topSkill.skill} moved to ${getSkillLevelLabel(topSkill.level)} level.`
          : `${summary.skillsImproved} skill${summary.skillsImproved === 1 ? '' : 's'} improved this month.`,
        stat: {
          value: `${summary.skillsImproved}`,
          label: 'Skills improved',
        },
        accent: '#10B981',
      });
    }

    // Page 6: Next focus
    const decliningSkills = skills.filter((s) => s.trend === 'declining');
    const steadySkills = skills.filter((s) => s.trend === 'steady' || s.trend === 'consistent');
    const focusSkill = decliningSkills[0] ?? steadySkills[0];
    pages.push({
      id: 'next-focus',
      type: 'next_focus',
      title: 'Next Month',
      body: focusSkill
        ? `Focus area: ${focusSkill.skill}. Keep pushing, ${athleteName}!`
        : `Keep up the great work, ${athleteName}!`,
      accent: '#8B5CF6',
    });

    // Inject photos into pages where available
    const photos = (media ?? []).flatMap((m) => m.photos.flatMap((p) => (p?.uri ? [p.uri] : [])));
    if (photos.length > 0) {
      let photoIdx = 0;
      for (const page of pages) {
        if (photoIdx >= photos.length) break;
        // Add photos to stat and intro pages for visual impact
        if (page.type === 'intro' || page.type === 'stat') {
          page.photo = photos[photoIdx];
          photoIdx++;
        }
      }
    }
    return ok(pages);
  } catch (error) {
    return err({
      code: 'UNKNOWN',
      message: 'Failed to build monthly story pages',
      details: error,
    });
  }
}
function extractBestCoachQuote(feedback: SessionFeedback[]): string | undefined {
  const sorted = Array.from(feedback).toSorted(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const highlighted = sorted.find((entry) => POSITIVE_FEEDBACK_PATTERN.test(entry.publicSummary));
  if (!highlighted) return undefined;
  return sanitizeSnippet(highlighted.publicSummary);
}
export const monthlySummaryService = {
  buildMonthlySummary,
  buildMonthlyStory,
  extractBestCoachQuote,
};
