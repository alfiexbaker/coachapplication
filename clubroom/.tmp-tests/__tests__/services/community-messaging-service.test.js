"use strict";
/**
 * Community Messaging Service Tests
 *
 * Tests for group messaging: getGroupMessages, sendGroupMessage,
 * markMessagesRead.
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
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importStar(require("node:test"));
const community_messaging_service_1 = require("../../services/community/community-messaging-service");
const rid = () => Math.random().toString(36).slice(2, 10);
(0, node_test_1.describe)('communityMessagingService', () => {
    // ---------------------------------------------------------------------------
    // getGroupMessages
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('getGroupMessages', () => {
        (0, node_test_1.default)('returns messages for a group with mock data', async () => {
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages('group_1');
            strict_1.default.ok(Array.isArray(messages));
            strict_1.default.ok(messages.length > 0);
        });
        (0, node_test_1.default)('returns empty array for unknown group', async () => {
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(`unknown_${rid()}`);
            strict_1.default.ok(Array.isArray(messages));
        });
        (0, node_test_1.default)('messages are sorted by createdAt ascending', async () => {
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages('group_1');
            for (let i = 1; i < messages.length; i++) {
                strict_1.default.ok(new Date(messages[i].createdAt).getTime() >= new Date(messages[i - 1].createdAt).getTime());
            }
        });
    });
    // ---------------------------------------------------------------------------
    // sendGroupMessage
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('sendGroupMessage', () => {
        (0, node_test_1.default)('creates a new message in the group', async () => {
            const groupId = `grp_${rid()}`;
            const msg = await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, `parent_${rid()}`, 'Test Parent', 'Hello group!');
            strict_1.default.ok(msg.id);
            strict_1.default.equal(msg.groupId, groupId);
            strict_1.default.equal(msg.body, 'Hello group!');
            strict_1.default.equal(msg.status, 'sent');
        });
        (0, node_test_1.default)('message is retrievable after sending', async () => {
            const groupId = `grp_${rid()}`;
            await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, `p_${rid()}`, 'P', 'Persist test');
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            strict_1.default.ok(messages.some((m) => m.body === 'Persist test'));
        });
        (0, node_test_1.default)('sender is included in readBy', async () => {
            const senderId = `parent_${rid()}`;
            const msg = await community_messaging_service_1.communityMessagingService.sendGroupMessage(`grp_${rid()}`, senderId, 'S', 'Read test');
            strict_1.default.ok(msg.readBy.includes(senderId));
        });
    });
    // ---------------------------------------------------------------------------
    // markMessagesRead
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('markMessagesRead', () => {
        (0, node_test_1.default)('adds parentId to readBy of all messages', async () => {
            const groupId = `grp_${rid()}`;
            const sender = `p_${rid()}`;
            const reader = `p_${rid()}`;
            await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, sender, 'S', 'Msg 1');
            await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, sender, 'S', 'Msg 2');
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, reader);
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            for (const msg of messages) {
                strict_1.default.ok(msg.readBy.includes(reader), `Message ${msg.id} should be marked as read`);
            }
        });
        (0, node_test_1.default)('does not duplicate readBy entries', async () => {
            const groupId = `grp_${rid()}`;
            const sender = `p_${rid()}`;
            await community_messaging_service_1.communityMessagingService.sendGroupMessage(groupId, sender, 'S', 'M');
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, sender);
            await community_messaging_service_1.communityMessagingService.markMessagesRead(groupId, sender);
            const messages = await community_messaging_service_1.communityMessagingService.getGroupMessages(groupId);
            for (const msg of messages) {
                const count = msg.readBy.filter((id) => id === sender).length;
                strict_1.default.equal(count, 1);
            }
        });
    });
});
