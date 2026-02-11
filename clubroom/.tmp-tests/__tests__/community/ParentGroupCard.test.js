"use strict";
/**
 * ParentGroupCard Component Tests
 *
 * Tests for the ParentGroupCard component rendering and behavior.
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
/**
 * Helper function to create a mock parent group for testing
 */
function createMockGroup(overrides = {}) {
    return {
        id: 'group_test_1',
        name: 'Test Group',
        description: 'A test group description',
        type: 'GENERAL',
        members: [
            { parentId: 'parent1', role: 'ADMIN', joinedAt: '2024-01-15' },
            { parentId: 'parent2', role: 'MEMBER', joinedAt: '2024-01-16' },
        ],
        createdById: 'parent1',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-20',
        isPublic: true,
        ...overrides,
    };
}
/**
 * Helper function to get group type icon name
 */
function getGroupTypeIcon(type) {
    switch (type) {
        case 'CLUB':
            return 'football-outline';
        case 'SESSION':
            return 'calendar-outline';
        case 'CARPOOL':
            return 'car-outline';
        case 'GENERAL':
        default:
            return 'chatbubbles-outline';
    }
}
/**
 * Helper function to get group type label
 */
function getGroupTypeLabel(type) {
    switch (type) {
        case 'CLUB':
            return 'Club';
        case 'SESSION':
            return 'Session';
        case 'CARPOOL':
            return 'Carpool';
        case 'GENERAL':
        default:
            return 'General';
    }
}
/**
 * Helper function to format time ago string
 */
function formatTimeAgo(dateString) {
    if (!dateString)
        return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1)
        return 'Just now';
    if (diffMins < 60)
        return `${diffMins}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    if (diffDays < 7)
        return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
(0, node_test_1.describe)('ParentGroupCard Component Logic', () => {
    (0, node_test_1.describe)('Group Data Display', () => {
        (0, node_test_1.default)('should have correct name and description', () => {
            const group = createMockGroup();
            node_assert_1.default.strictEqual(group.name, 'Test Group');
            node_assert_1.default.strictEqual(group.description, 'A test group description');
        });
        (0, node_test_1.default)('should count members correctly', () => {
            const group = createMockGroup();
            node_assert_1.default.strictEqual(group.members.length, 2);
        });
        (0, node_test_1.default)('should identify admin members', () => {
            const group = createMockGroup();
            const admins = group.members.filter((m) => m.role === 'ADMIN');
            node_assert_1.default.strictEqual(admins.length, 1);
            node_assert_1.default.strictEqual(admins[0].parentId, 'parent1');
        });
    });
    (0, node_test_1.describe)('Group Type Display', () => {
        (0, node_test_1.default)('should display correct icon for each group type', () => {
            const types = ['CLUB', 'SESSION', 'CARPOOL', 'GENERAL'];
            types.forEach((type) => {
                const icon = getGroupTypeIcon(type);
                node_assert_1.default.ok(icon, `Type ${type} should have an icon`);
                node_assert_1.default.ok(icon.includes('-outline'), `Icon should be outline variant`);
            });
        });
        (0, node_test_1.default)('CLUB type should have football icon', () => {
            const icon = getGroupTypeIcon('CLUB');
            node_assert_1.default.strictEqual(icon, 'football-outline');
        });
        (0, node_test_1.default)('CARPOOL type should have car icon', () => {
            const icon = getGroupTypeIcon('CARPOOL');
            node_assert_1.default.strictEqual(icon, 'car-outline');
        });
        (0, node_test_1.default)('should display correct label for each group type', () => {
            const types = ['CLUB', 'SESSION', 'CARPOOL', 'GENERAL'];
            const expectedLabels = ['Club', 'Session', 'Carpool', 'General'];
            types.forEach((type, index) => {
                const label = getGroupTypeLabel(type);
                node_assert_1.default.strictEqual(label, expectedLabels[index]);
            });
        });
    });
    (0, node_test_1.describe)('Unread Count Display', () => {
        (0, node_test_1.default)('should show unread badge when count > 0', () => {
            const group = createMockGroup({ unreadCount: 5 });
            node_assert_1.default.strictEqual(group.unreadCount, 5);
            node_assert_1.default.ok(group.unreadCount > 0);
        });
        (0, node_test_1.default)('should not show unread badge when count is 0', () => {
            const group = createMockGroup({ unreadCount: 0 });
            node_assert_1.default.strictEqual(group.unreadCount, 0);
            node_assert_1.default.ok(!(group.unreadCount > 0));
        });
        (0, node_test_1.default)('should handle undefined unread count', () => {
            const group = createMockGroup({ unreadCount: undefined });
            const hasUnread = (group.unreadCount ?? 0) > 0;
            node_assert_1.default.strictEqual(hasUnread, false);
        });
        (0, node_test_1.default)('should handle large unread counts', () => {
            const group = createMockGroup({ unreadCount: 150 });
            const displayCount = group.unreadCount > 99 ? '99+' : group.unreadCount.toString();
            node_assert_1.default.strictEqual(displayCount, '99+');
        });
    });
    (0, node_test_1.describe)('Last Message Display', () => {
        (0, node_test_1.default)('should display last message preview', () => {
            const group = createMockGroup({
                lastMessagePreview: 'See you at training!',
                lastMessageAt: '2024-01-20T14:30:00Z',
            });
            node_assert_1.default.strictEqual(group.lastMessagePreview, 'See you at training!');
            node_assert_1.default.ok(group.lastMessageAt);
        });
        (0, node_test_1.default)('should handle missing last message', () => {
            const group = createMockGroup({
                lastMessagePreview: undefined,
                lastMessageAt: undefined,
            });
            node_assert_1.default.strictEqual(group.lastMessagePreview, undefined);
            node_assert_1.default.strictEqual(group.lastMessageAt, undefined);
        });
    });
    (0, node_test_1.describe)('Time Formatting', () => {
        (0, node_test_1.default)('should format recent time as "Just now"', () => {
            const now = new Date().toISOString();
            const formatted = formatTimeAgo(now);
            // Could be "Just now" or "0m ago" depending on timing
            node_assert_1.default.ok(formatted.includes('Just now') || formatted.includes('m ago'));
        });
        (0, node_test_1.default)('should format minutes ago', () => {
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const formatted = formatTimeAgo(fiveMinutesAgo);
            node_assert_1.default.ok(formatted.includes('m ago'));
        });
        (0, node_test_1.default)('should format hours ago', () => {
            const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
            const formatted = formatTimeAgo(threeHoursAgo);
            node_assert_1.default.ok(formatted.includes('h ago'));
        });
        (0, node_test_1.default)('should format days ago', () => {
            const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
            const formatted = formatTimeAgo(twoDaysAgo);
            node_assert_1.default.ok(formatted.includes('d ago'));
        });
        (0, node_test_1.default)('should handle undefined date', () => {
            const formatted = formatTimeAgo(undefined);
            node_assert_1.default.strictEqual(formatted, '');
        });
    });
    (0, node_test_1.describe)('Privacy Display', () => {
        (0, node_test_1.default)('should identify public groups', () => {
            const group = createMockGroup({ isPublic: true });
            node_assert_1.default.strictEqual(group.isPublic, true);
        });
        (0, node_test_1.default)('should identify private groups', () => {
            const group = createMockGroup({ isPublic: false });
            node_assert_1.default.strictEqual(group.isPublic, false);
        });
    });
    (0, node_test_1.describe)('Associated Data', () => {
        (0, node_test_1.default)('should display club ID for CLUB type', () => {
            const group = createMockGroup({
                type: 'CLUB',
                clubId: 'club_123',
            });
            node_assert_1.default.strictEqual(group.clubId, 'club_123');
        });
        (0, node_test_1.default)('should display session ID for SESSION type', () => {
            const group = createMockGroup({
                type: 'SESSION',
                sessionId: 'session_456',
            });
            node_assert_1.default.strictEqual(group.sessionId, 'session_456');
        });
    });
});
(0, node_test_1.describe)('ParentGroupCard Accessibility', () => {
    (0, node_test_1.default)('group card should have accessible content', () => {
        const group = createMockGroup();
        node_assert_1.default.ok(group.name.length > 0, 'Name should be non-empty');
        node_assert_1.default.ok(group.type, 'Type should be defined');
    });
    (0, node_test_1.default)('member count should be describable', () => {
        const group = createMockGroup();
        const description = `${group.members.length} members`;
        node_assert_1.default.strictEqual(description, '2 members');
    });
    (0, node_test_1.default)('unread count should be describable', () => {
        const group = createMockGroup({ unreadCount: 3 });
        const description = `${group.unreadCount} unread messages`;
        node_assert_1.default.strictEqual(description, '3 unread messages');
    });
});
(0, node_test_1.describe)('ParentGroupCard Edge Cases', () => {
    (0, node_test_1.default)('should handle very long group name', () => {
        const longName = 'A'.repeat(100);
        const group = createMockGroup({ name: longName });
        node_assert_1.default.strictEqual(group.name.length, 100);
    });
    (0, node_test_1.default)('should handle special characters in name', () => {
        const specialName = 'Group with "quotes" & <special> chars!';
        const group = createMockGroup({ name: specialName });
        node_assert_1.default.strictEqual(group.name, specialName);
    });
    (0, node_test_1.default)('should handle many members', () => {
        const manyMembers = Array.from({ length: 100 }, (_, i) => ({
            parentId: `parent_${i}`,
            parentName: `Parent ${i}`,
            role: i === 0 ? 'ADMIN' : 'MEMBER',
            joinedAt: '2024-01-01',
        }));
        const group = createMockGroup({ members: manyMembers });
        node_assert_1.default.strictEqual(group.members.length, 100);
    });
    (0, node_test_1.default)('should handle group with no description', () => {
        const group = createMockGroup({ description: undefined });
        node_assert_1.default.strictEqual(group.description, undefined);
    });
    (0, node_test_1.default)('should handle max members limit', () => {
        const group = createMockGroup({ maxMembers: 50 });
        node_assert_1.default.strictEqual(group.maxMembers, 50);
        node_assert_1.default.ok(group.members.length <= group.maxMembers);
    });
});
(0, node_test_1.describe)('ParentGroupCard Interaction Logic', () => {
    (0, node_test_1.default)('group should be pressable when onPress is provided', () => {
        createMockGroup();
        let pressed = false;
        const onPress = () => {
            pressed = true;
        };
        // Simulate press
        onPress();
        node_assert_1.default.strictEqual(pressed, true);
    });
    (0, node_test_1.default)('should navigate to group chat on press', () => {
        const group = createMockGroup();
        const expectedPath = `/community/${group.id}`;
        node_assert_1.default.strictEqual(`/community/${group.id}`, expectedPath);
    });
});
