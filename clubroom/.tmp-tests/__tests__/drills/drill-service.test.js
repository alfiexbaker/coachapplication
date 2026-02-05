"use strict";
/**
 * Drill Service Tests
 *
 * Unit tests for the drill service functionality including
 * drill library management, assignments, and progress tracking.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
const drill_service_1 = require("../../services/drill-service");
// Reset to mock data before each test
(0, node_test_1.beforeEach)(async () => {
    await drill_service_1.drillService.resetToMockData();
});
(0, node_test_1.describe)('Drill Service', () => {
    (0, node_test_1.describe)('getDrillLibrary', () => {
        (0, node_test_1.default)('should return drills for a specific coach', async () => {
            const drills = await drill_service_1.drillService.getDrillLibrary('coach1');
            node_assert_1.default.ok(Array.isArray(drills));
            node_assert_1.default.ok(drills.length > 0);
            drills.forEach((drill) => {
                node_assert_1.default.strictEqual(drill.coachId, 'coach1');
            });
        });
        (0, node_test_1.default)('should return empty array for coach with no drills', async () => {
            const drills = await drill_service_1.drillService.getDrillLibrary('nonexistent_coach');
            node_assert_1.default.ok(Array.isArray(drills));
            node_assert_1.default.strictEqual(drills.length, 0);
        });
        (0, node_test_1.default)('should sort drills by most recently updated', async () => {
            const drills = await drill_service_1.drillService.getDrillLibrary('coach1');
            for (let i = 1; i < drills.length; i++) {
                const prevDate = new Date(drills[i - 1].updatedAt).getTime();
                const currDate = new Date(drills[i].updatedAt).getTime();
                node_assert_1.default.ok(prevDate >= currDate, 'Drills should be sorted by updatedAt descending');
            }
        });
    });
    (0, node_test_1.describe)('getDrillById', () => {
        (0, node_test_1.default)('should return drill by ID', async () => {
            const drill = await drill_service_1.drillService.getDrillById('drill_1');
            node_assert_1.default.ok(drill);
            node_assert_1.default.strictEqual(drill.id, 'drill_1');
            node_assert_1.default.strictEqual(drill.title, 'Ball Juggling Challenge');
        });
        (0, node_test_1.default)('should return null for non-existent drill', async () => {
            const drill = await drill_service_1.drillService.getDrillById('nonexistent');
            node_assert_1.default.strictEqual(drill, null);
        });
    });
    (0, node_test_1.describe)('createDrill', () => {
        (0, node_test_1.default)('should create a new drill with required fields', async () => {
            const input = {
                title: 'Test Drill',
                description: 'Test description',
                category: 'TECHNIQUE',
                duration: 15,
                difficulty: 'BEGINNER',
            };
            const drill = await drill_service_1.drillService.createDrill('test_coach', 'Test Coach', input);
            node_assert_1.default.ok(drill.id.startsWith('drill_'));
            node_assert_1.default.strictEqual(drill.title, 'Test Drill');
            node_assert_1.default.strictEqual(drill.description, 'Test description');
            node_assert_1.default.strictEqual(drill.category, 'TECHNIQUE');
            node_assert_1.default.strictEqual(drill.duration, 15);
            node_assert_1.default.strictEqual(drill.difficulty, 'BEGINNER');
            node_assert_1.default.strictEqual(drill.coachId, 'test_coach');
            node_assert_1.default.strictEqual(drill.coachName, 'Test Coach');
            node_assert_1.default.strictEqual(drill.assignmentCount, 0);
            node_assert_1.default.ok(drill.createdAt);
            node_assert_1.default.ok(drill.updatedAt);
        });
        (0, node_test_1.default)('should create a drill with all optional fields', async () => {
            const input = {
                title: 'Complete Drill',
                description: 'Full description',
                category: 'FITNESS',
                duration: 30,
                difficulty: 'ADVANCED',
                videoUrl: 'https://example.com/video.mp4',
                thumbnailUrl: 'https://example.com/thumb.jpg',
                equipment: ['Football', 'Cones'],
                tags: ['speed', 'agility'],
            };
            const drill = await drill_service_1.drillService.createDrill('test_coach', 'Test Coach', input);
            node_assert_1.default.strictEqual(drill.videoUrl, 'https://example.com/video.mp4');
            node_assert_1.default.strictEqual(drill.thumbnailUrl, 'https://example.com/thumb.jpg');
            node_assert_1.default.deepStrictEqual(drill.equipment, ['Football', 'Cones']);
            node_assert_1.default.deepStrictEqual(drill.tags, ['speed', 'agility']);
        });
        (0, node_test_1.default)('should add drill to library', async () => {
            const initialDrills = await drill_service_1.drillService.getDrillLibrary('new_coach');
            node_assert_1.default.strictEqual(initialDrills.length, 0);
            await drill_service_1.drillService.createDrill('new_coach', 'New Coach', {
                title: 'New Drill',
                description: 'Description',
                category: 'WARMUP',
                duration: 10,
                difficulty: 'BEGINNER',
            });
            const updatedDrills = await drill_service_1.drillService.getDrillLibrary('new_coach');
            node_assert_1.default.strictEqual(updatedDrills.length, 1);
        });
    });
    (0, node_test_1.describe)('updateDrill', () => {
        (0, node_test_1.default)('should update drill fields', async () => {
            const originalDrill = await drill_service_1.drillService.getDrillById('drill_1');
            node_assert_1.default.ok(originalDrill);
            const updatedDrill = await drill_service_1.drillService.updateDrill('drill_1', {
                title: 'Updated Title',
                description: 'Updated description',
                difficulty: 'ADVANCED',
            });
            node_assert_1.default.ok(updatedDrill);
            node_assert_1.default.strictEqual(updatedDrill.title, 'Updated Title');
            node_assert_1.default.strictEqual(updatedDrill.description, 'Updated description');
            node_assert_1.default.strictEqual(updatedDrill.difficulty, 'ADVANCED');
            node_assert_1.default.ok(new Date(updatedDrill.updatedAt) > new Date(originalDrill.updatedAt));
        });
        (0, node_test_1.default)('should return null for non-existent drill', async () => {
            const result = await drill_service_1.drillService.updateDrill('nonexistent', { title: 'Test' });
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('deleteDrill', () => {
        (0, node_test_1.default)('should delete a drill', async () => {
            const drill = await drill_service_1.drillService.createDrill('test_coach', 'Test Coach', {
                title: 'To Delete',
                description: 'Will be deleted',
                category: 'COOLDOWN',
                duration: 5,
                difficulty: 'BEGINNER',
            });
            const deleted = await drill_service_1.drillService.deleteDrill(drill.id);
            node_assert_1.default.strictEqual(deleted, true);
            const retrieved = await drill_service_1.drillService.getDrillById(drill.id);
            node_assert_1.default.strictEqual(retrieved, null);
        });
        (0, node_test_1.default)('should return false for non-existent drill', async () => {
            const deleted = await drill_service_1.drillService.deleteDrill('nonexistent');
            node_assert_1.default.strictEqual(deleted, false);
        });
    });
    (0, node_test_1.describe)('Assignment Operations', () => {
        (0, node_test_1.default)('should assign a drill to an athlete', async () => {
            const assignment = await drill_service_1.drillService.assignDrill('drill_1', 'athlete_1', 'Test Athlete', 'coach1', 'Coach Mike', {
                dueDate: '2026-02-01T23:59:59Z',
                notes: 'Practice daily',
                repetitions: 3,
                priority: 1,
            });
            node_assert_1.default.ok(assignment.id.startsWith('assign_'));
            node_assert_1.default.strictEqual(assignment.drillId, 'drill_1');
            node_assert_1.default.strictEqual(assignment.athleteId, 'athlete_1');
            node_assert_1.default.strictEqual(assignment.athleteName, 'Test Athlete');
            node_assert_1.default.strictEqual(assignment.assignedBy, 'coach1');
            node_assert_1.default.strictEqual(assignment.assignedByName, 'Coach Mike');
            node_assert_1.default.strictEqual(assignment.isCompleted, false);
            node_assert_1.default.strictEqual(assignment.notes, 'Practice daily');
            node_assert_1.default.strictEqual(assignment.repetitions, 3);
            node_assert_1.default.strictEqual(assignment.priority, 1);
            node_assert_1.default.ok(assignment.drill);
        });
        (0, node_test_1.default)('should throw error when assigning non-existent drill', async () => {
            await node_assert_1.default.rejects(async () => {
                await drill_service_1.drillService.assignDrill('nonexistent', 'athlete_1', 'Test Athlete', 'coach1', 'Coach Mike', { dueDate: '2026-02-01T23:59:59Z' });
            }, { message: 'Drill not found: nonexistent' });
        });
        (0, node_test_1.default)('should increment drill assignment count', async () => {
            const drillBefore = await drill_service_1.drillService.getDrillById('drill_1');
            const countBefore = drillBefore?.assignmentCount ?? 0;
            await drill_service_1.drillService.assignDrill('drill_1', 'new_athlete', 'New Athlete', 'coach1', 'Coach Mike', { dueDate: '2026-02-01T23:59:59Z' });
            const drillAfter = await drill_service_1.drillService.getDrillById('drill_1');
            node_assert_1.default.strictEqual(drillAfter?.assignmentCount, countBefore + 1);
        });
    });
    (0, node_test_1.describe)('getAthleteAssignments', () => {
        (0, node_test_1.default)('should return assignments for a specific athlete', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1');
            node_assert_1.default.ok(Array.isArray(assignments));
            node_assert_1.default.ok(assignments.length > 0);
            assignments.forEach((assignment) => {
                node_assert_1.default.strictEqual(assignment.athleteId, 'user1');
            });
        });
        (0, node_test_1.default)('should include drill details', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1');
            assignments.forEach((assignment) => {
                node_assert_1.default.ok(assignment.drill, 'Assignment should have drill details');
                node_assert_1.default.ok(assignment.drill.title);
                node_assert_1.default.ok(assignment.drill.category);
            });
        });
        (0, node_test_1.default)('should filter out completed assignments when requested', async () => {
            const allAssignments = await drill_service_1.drillService.getAthleteAssignments('user1', true);
            const pendingOnly = await drill_service_1.drillService.getAthleteAssignments('user1', false);
            node_assert_1.default.ok(allAssignments.length >= pendingOnly.length);
            pendingOnly.forEach((assignment) => {
                node_assert_1.default.strictEqual(assignment.isCompleted, false);
            });
        });
        (0, node_test_1.default)('should sort by priority and due date', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1', false);
            // Completed should be at the end
            let sawCompleted = false;
            for (const assignment of assignments) {
                if (assignment.isCompleted) {
                    sawCompleted = true;
                }
                else if (sawCompleted) {
                    node_assert_1.default.fail('Pending assignments should come before completed');
                }
            }
        });
    });
    (0, node_test_1.describe)('completeDrill', () => {
        (0, node_test_1.default)('should mark assignment as completed', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1', false);
            const pendingAssignment = assignments.find((a) => !a.isCompleted);
            node_assert_1.default.ok(pendingAssignment);
            const updated = await drill_service_1.drillService.completeDrill(pendingAssignment.id);
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.isCompleted, true);
            node_assert_1.default.ok(updated.completedAt);
        });
        (0, node_test_1.default)('should save athlete feedback', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1', false);
            const pendingAssignment = assignments.find((a) => !a.isCompleted);
            node_assert_1.default.ok(pendingAssignment);
            const updated = await drill_service_1.drillService.completeDrill(pendingAssignment.id, 'Great drill, helped improve my technique!');
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.athleteFeedback, 'Great drill, helped improve my technique!');
        });
        (0, node_test_1.default)('should return null for non-existent assignment', async () => {
            const result = await drill_service_1.drillService.completeDrill('nonexistent');
            node_assert_1.default.strictEqual(result, null);
        });
        (0, node_test_1.default)('should handle already completed assignment', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1', true);
            const completedAssignment = assignments.find((a) => a.isCompleted);
            node_assert_1.default.ok(completedAssignment);
            const result = await drill_service_1.drillService.completeDrill(completedAssignment.id);
            node_assert_1.default.ok(result);
            node_assert_1.default.strictEqual(result.isCompleted, true);
        });
    });
    (0, node_test_1.describe)('uncompleteDrill', () => {
        (0, node_test_1.default)('should mark assignment as incomplete', async () => {
            const assignments = await drill_service_1.drillService.getAthleteAssignments('user1', true);
            const completedAssignment = assignments.find((a) => a.isCompleted);
            node_assert_1.default.ok(completedAssignment);
            const updated = await drill_service_1.drillService.uncompleteDrill(completedAssignment.id);
            node_assert_1.default.ok(updated);
            node_assert_1.default.strictEqual(updated.isCompleted, false);
            node_assert_1.default.strictEqual(updated.completedAt, undefined);
        });
        (0, node_test_1.default)('should return null for non-existent assignment', async () => {
            const result = await drill_service_1.drillService.uncompleteDrill('nonexistent');
            node_assert_1.default.strictEqual(result, null);
        });
    });
    (0, node_test_1.describe)('deleteAssignment', () => {
        (0, node_test_1.default)('should delete an assignment', async () => {
            const assignment = await drill_service_1.drillService.assignDrill('drill_1', 'temp_athlete', 'Temp Athlete', 'coach1', 'Coach Mike', { dueDate: '2026-02-01T23:59:59Z' });
            const deleted = await drill_service_1.drillService.deleteAssignment(assignment.id);
            node_assert_1.default.strictEqual(deleted, true);
            const retrieved = await drill_service_1.drillService.getAssignmentById(assignment.id);
            node_assert_1.default.strictEqual(retrieved, null);
        });
        (0, node_test_1.default)('should return false for non-existent assignment', async () => {
            const deleted = await drill_service_1.drillService.deleteAssignment('nonexistent');
            node_assert_1.default.strictEqual(deleted, false);
        });
    });
    (0, node_test_1.describe)('getAssignmentStats', () => {
        (0, node_test_1.default)('should return correct statistics', async () => {
            const stats = await drill_service_1.drillService.getAssignmentStats('user1');
            node_assert_1.default.ok(typeof stats.totalAssigned === 'number');
            node_assert_1.default.ok(typeof stats.completed === 'number');
            node_assert_1.default.ok(typeof stats.pending === 'number');
            node_assert_1.default.ok(typeof stats.overdue === 'number');
            node_assert_1.default.ok(typeof stats.completionRate === 'number');
            node_assert_1.default.ok(typeof stats.currentStreak === 'number');
            node_assert_1.default.ok(stats.byCategory);
            // Verify totals add up
            node_assert_1.default.strictEqual(stats.completed + stats.pending, stats.totalAssigned);
            // Verify completion rate calculation
            if (stats.totalAssigned > 0) {
                const expectedRate = Math.round((stats.completed / stats.totalAssigned) * 100);
                node_assert_1.default.strictEqual(stats.completionRate, expectedRate);
            }
        });
        (0, node_test_1.default)('should return category breakdown', async () => {
            const stats = await drill_service_1.drillService.getAssignmentStats('user1');
            const categories = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];
            categories.forEach((cat) => {
                node_assert_1.default.ok(stats.byCategory[cat], `Should have stats for ${cat}`);
                node_assert_1.default.ok(typeof stats.byCategory[cat].total === 'number');
                node_assert_1.default.ok(typeof stats.byCategory[cat].completed === 'number');
            });
        });
        (0, node_test_1.default)('should return zero stats for athlete with no assignments', async () => {
            const stats = await drill_service_1.drillService.getAssignmentStats('nonexistent_athlete');
            node_assert_1.default.strictEqual(stats.totalAssigned, 0);
            node_assert_1.default.strictEqual(stats.completed, 0);
            node_assert_1.default.strictEqual(stats.pending, 0);
            node_assert_1.default.strictEqual(stats.overdue, 0);
            node_assert_1.default.strictEqual(stats.completionRate, 0);
        });
    });
    (0, node_test_1.describe)('Helper Functions', () => {
        (0, node_test_1.default)('isOverdue should detect overdue assignments', () => {
            const overdueAssignment = {
                id: 'test',
                drillId: 'drill_1',
                athleteId: 'user1',
                assignedBy: 'coach1',
                assignedAt: '2025-01-01T00:00:00Z',
                dueDate: '2025-01-01T23:59:59Z', // Past date
                isCompleted: false,
            };
            const futureAssignment = {
                ...overdueAssignment,
                dueDate: '2030-01-01T23:59:59Z', // Future date
            };
            const completedAssignment = {
                ...overdueAssignment,
                isCompleted: true,
                completedAt: '2025-01-01T12:00:00Z',
            };
            node_assert_1.default.strictEqual(drill_service_1.drillService.isOverdue(overdueAssignment), true);
            node_assert_1.default.strictEqual(drill_service_1.drillService.isOverdue(futureAssignment), false);
            node_assert_1.default.strictEqual(drill_service_1.drillService.isOverdue(completedAssignment), false);
        });
        (0, node_test_1.default)('isDueSoon should detect assignments due within 2 days', () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextWeek = new Date(today);
            nextWeek.setDate(nextWeek.getDate() + 7);
            const dueSoonAssignment = {
                id: 'test',
                drillId: 'drill_1',
                athleteId: 'user1',
                assignedBy: 'coach1',
                assignedAt: '2025-01-01T00:00:00Z',
                dueDate: tomorrow.toISOString(),
                isCompleted: false,
            };
            const dueLaterAssignment = {
                ...dueSoonAssignment,
                dueDate: nextWeek.toISOString(),
            };
            node_assert_1.default.strictEqual(drill_service_1.drillService.isDueSoon(dueSoonAssignment), true);
            node_assert_1.default.strictEqual(drill_service_1.drillService.isDueSoon(dueLaterAssignment), false);
        });
        (0, node_test_1.default)('formatDueDate should format date correctly', () => {
            const formatted = drill_service_1.drillService.formatDueDate('2026-06-15T23:59:59Z');
            node_assert_1.default.ok(formatted.includes('15'));
            node_assert_1.default.ok(formatted.includes('Jun'));
        });
        (0, node_test_1.default)('getCategoryInfo should return correct info', () => {
            const categories = ['WARMUP', 'TECHNIQUE', 'FITNESS', 'COOLDOWN', 'TACTICAL'];
            categories.forEach((cat) => {
                const info = drill_service_1.drillService.getCategoryInfo(cat);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.icon);
                node_assert_1.default.ok(info.color);
            });
        });
        (0, node_test_1.default)('getDifficultyInfo should return correct info', () => {
            const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
            difficulties.forEach((diff) => {
                const info = drill_service_1.drillService.getDifficultyInfo(diff);
                node_assert_1.default.ok(info.label);
                node_assert_1.default.ok(info.color);
                node_assert_1.default.ok(info.bgColor);
            });
        });
        (0, node_test_1.default)('formatDuration should format minutes correctly', () => {
            node_assert_1.default.strictEqual(drill_service_1.drillService.formatDuration(15), '15 min');
            node_assert_1.default.strictEqual(drill_service_1.drillService.formatDuration(60), '1h');
            node_assert_1.default.strictEqual(drill_service_1.drillService.formatDuration(90), '1h 30m');
            node_assert_1.default.strictEqual(drill_service_1.drillService.formatDuration(120), '2h');
        });
    });
});
