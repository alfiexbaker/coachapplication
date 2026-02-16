"use strict";
/**
 * useSessionRegistrationBadges
 *
 * Maps sessions + children + registrations → badge data per session.
 * Used by the group sessions list to show per-child registration badges.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSessionRegistrationBadges = useSessionRegistrationBadges;
const react_1 = require("react");
function normalizeStatus(status) {
    const upper = status.toUpperCase();
    if (upper === 'REGISTERED')
        return 'registered';
    if (upper === 'WAITLISTED')
        return 'waitlisted';
    return null;
}
function useSessionRegistrationBadges(sessions, children, registrations) {
    return (0, react_1.useMemo)(() => {
        const map = new Map();
        if (children.length === 0 || registrations.length === 0)
            return map;
        // Build childId set + lookup
        const childById = new Map();
        for (const c of children) {
            childById.set(c.id, c);
            childById.set(c.referenceId, c);
        }
        // Group registrations by sessionId
        const regsBySession = new Map();
        for (const reg of registrations) {
            const normalized = normalizeStatus(reg.status);
            if (!normalized)
                continue;
            if (!childById.has(reg.athleteId))
                continue;
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
            if (!sessionRegs || sessionRegs.length === 0)
                continue;
            const seen = new Set();
            const childStatuses = [];
            for (const reg of sessionRegs) {
                if (seen.has(reg.athleteId))
                    continue;
                seen.add(reg.athleteId);
                const child = childById.get(reg.athleteId);
                if (!child)
                    continue;
                const status = normalizeStatus(reg.status);
                if (!status)
                    continue;
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
    }, [sessions, children, registrations]);
}
