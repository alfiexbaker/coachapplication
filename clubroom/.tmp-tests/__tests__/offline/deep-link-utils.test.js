"use strict";
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
const deep_link_1 = require("@/utils/deep-link");
(0, node_test_1.describe)('deep-link utils', () => {
    (0, node_test_1.default)('rewrites legacy booking deep links to bookings routes', () => {
        strict_1.default.equal((0, deep_link_1.resolveDeepLink)('/booking/bk_1'), '/bookings/bk_1');
    });
    (0, node_test_1.default)('normalizes custom scheme links', () => {
        strict_1.default.equal((0, deep_link_1.resolveDeepLink)('clubroom://session-invites/invite_1'), '/session-invites/invite_1');
        strict_1.default.equal((0, deep_link_1.resolveDeepLink)('clubroom:session-invites/invite_2'), '/session-invites/invite_2');
    });
    (0, node_test_1.default)('returns null for malformed urls instead of throwing', () => {
        strict_1.default.equal((0, deep_link_1.resolveDeepLink)('https://%'), null);
    });
    (0, node_test_1.default)('blocks dangerous deep links', () => {
        strict_1.default.equal((0, deep_link_1.resolveDeepLink)('javascript:alert(1)'), null);
        strict_1.default.equal((0, deep_link_1.resolveDeepLink)('/foo/%2e%2e/bar'), null);
    });
    (0, node_test_1.default)('navigateToDeepLink pushes only valid routes', () => {
        const pushed = [];
        const routerLike = {
            push: (href) => {
                pushed.push(href);
            },
        };
        strict_1.default.equal((0, deep_link_1.navigateToDeepLink)(routerLike, '/booking/abc_1'), true);
        strict_1.default.deepEqual(pushed, ['/bookings/abc_1']);
        strict_1.default.equal((0, deep_link_1.navigateToDeepLink)(routerLike, 'javascript:alert(1)'), false);
        strict_1.default.deepEqual(pushed, ['/bookings/abc_1']);
    });
});
