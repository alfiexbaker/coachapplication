import type { GroupRegistration } from '@/constants/types';
import type { ChildInfo } from '@/types/child-context';
import type { SessionBadgeData, SessionChildStatus, ChildRegistrationStatus } from '@/types/session-child-status';

function normalizeStatus(status: string): ChildRegistrationStatus | null {
  const upper = status.toUpperCase();
  if (upper === 'REGISTERED') return 'registered';
  if (upper === 'WAITLISTED') return 'waitlisted';
  return null;
}

export function useSessionRegistrationBadges(
  sessions: { id: string }[],
  children: ChildInfo[],
  registrations: GroupRegistration[],
): Map<string, SessionBadgeData> {
  return (() => {
    const map = new Map<string, SessionBadgeData>();
    if (children.length === 0 || registrations.length === 0) return map;

    // Build childId set + lookup
    const childById = new Map<string, ChildInfo>();
    for (const c of children) {
      childById.set(c.id, c);
      childById.set(c.referenceId, c);
    }

    // Group registrations by sessionId
    const regsBySession = new Map<string, GroupRegistration[]>();
    for (const reg of registrations) {
      const normalized = normalizeStatus(reg.status);
      if (!normalized) continue;
      if (!childById.has(reg.athleteId)) continue;

      let list = regsBySession.get(reg.sessionId);
      if (!list) {
        list = [];
        regsBySession.set(reg.sessionId, list);
      }
      list.push(reg);
    }

    // Build badge data for each session
    for (const session of sessions) {
      const sessionRegs = regsBySession.get(session.id);
      if (!sessionRegs || sessionRegs.length === 0) continue;

      const seen = new Set<string>();
      const childStatuses: SessionChildStatus[] = [];

      for (const reg of sessionRegs) {
        if (seen.has(reg.athleteId)) continue;
        seen.add(reg.athleteId);

        const child = childById.get(reg.athleteId);
        if (!child) continue;

        const status = normalizeStatus(reg.status);
        if (!status) continue;

        childStatuses.push({
          childId: child.id,
          name: child.name,
          status,
          colorCode: child.colorCode,
        });
      }

      if (childStatuses.length > 0) {
        map.set(session.id, { childStatuses });
      }
    }

    return map;
  })();
}
