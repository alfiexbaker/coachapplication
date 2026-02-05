/**
 * Group Session Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/group-session/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/group-session/session-crud-service.ts (CRUD operations, publish, cancel, discovery)
 * - services/group-session/session-registration-service.ts (registration, waitlist, roster, attendance)
 * - services/group-session/session-scheduling-service.ts (club/squad/child training queries, recurring)
 * - services/group-session/session-display-service.ts (formatting and display utilities)
 * - services/group-session/index.ts (unified facade)
 */

export { groupSessionService } from './group-session/index';
export type { CreateGroupSessionInput } from './group-session/index';
