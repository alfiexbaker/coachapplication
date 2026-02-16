"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionInviteCoachName = getSessionInviteCoachName;
exports.getSessionInviteAthleteNames = getSessionInviteAthleteNames;
exports.getSessionInviteParentName = getSessionInviteParentName;
exports.resolveInviteChildLabel = resolveInviteChildLabel;
function getSessionInviteCoachName(invite) {
    return invite.coachId || 'Coach';
}
function getSessionInviteAthleteNames(invite) {
    if (invite.athleteIds.length === 0) {
        return ['Athlete'];
    }
    return invite.athleteIds;
}
function getSessionInviteParentName(invite) {
    return invite.parentId || 'Parent';
}
/**
 * Resolve invite athleteIds → display label for child identity.
 * Returns undefined when single-child parent (seamless UX) or no match.
 */
function resolveInviteChildLabel(athleteIds, getChildById, isMultiChild) {
    if (!isMultiChild)
        return undefined;
    if (athleteIds.length === 0)
        return undefined;
    const resolved = [];
    for (const id of athleteIds) {
        const child = getChildById(id);
        if (child)
            resolved.push(child.name);
    }
    if (resolved.length === 0)
        return undefined;
    if (resolved.length === 1)
        return resolved[0];
    return resolved.join(' + ');
}
