"use strict";
/**
 * Session Display Service Tests
 *
 * Pure synchronous formatting helpers for group sessions.
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
const session_display_service_1 = require("../../services/group-session/session-display-service");
(0, node_test_1.describe)('sessionDisplayService', () => {
    (0, node_test_1.describe)('formatPrice', () => {
        (0, node_test_1.default)('returns Free for zero amount', () => {
            strict_1.default.equal(session_display_service_1.sessionDisplayService.formatPrice(0), 'Free');
        });
        (0, node_test_1.default)('formats non-zero price in GBP by default', () => {
            const result = session_display_service_1.sessionDisplayService.formatPrice(15);
            strict_1.default.ok(result.includes('15'));
        });
        (0, node_test_1.default)('formats with custom currency', () => {
            const result = session_display_service_1.sessionDisplayService.formatPrice(20, 'USD');
            strict_1.default.ok(result.includes('20'));
        });
    });
    (0, node_test_1.describe)('formatSessionType', () => {
        (0, node_test_1.default)('formats TRAINING type', () => {
            strict_1.default.equal(session_display_service_1.sessionDisplayService.formatSessionType('TRAINING'), 'Training');
        });
        (0, node_test_1.default)('formats CAMP type', () => {
            strict_1.default.equal(session_display_service_1.sessionDisplayService.formatSessionType('CAMP'), 'Camp');
        });
        (0, node_test_1.default)('formats CLINIC type', () => {
            strict_1.default.equal(session_display_service_1.sessionDisplayService.formatSessionType('CLINIC'), 'Clinic');
        });
        (0, node_test_1.default)('formats OPEN_SESSION type', () => {
            strict_1.default.equal(session_display_service_1.sessionDisplayService.formatSessionType('OPEN_SESSION'), 'Open Session');
        });
    });
});
