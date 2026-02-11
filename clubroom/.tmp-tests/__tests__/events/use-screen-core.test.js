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
const use_screen_core_1 = require("@/hooks/use-screen-core");
(0, node_test_1.describe)('use-screen-core focus refetch', () => {
    (0, node_test_1.default)('shouldRunFocusRefetch only enables when configured and initial load has completed', () => {
        strict_1.default.equal((0, use_screen_core_1.shouldRunFocusRefetch)(false, false), false);
        strict_1.default.equal((0, use_screen_core_1.shouldRunFocusRefetch)(false, true), false);
        strict_1.default.equal((0, use_screen_core_1.shouldRunFocusRefetch)(true, false), false);
        strict_1.default.equal((0, use_screen_core_1.shouldRunFocusRefetch)(true, true), true);
    });
    (0, node_test_1.default)('runFocusRefetch triggers silent fetch when enabled', () => {
        const calls = [];
        (0, use_screen_core_1.runFocusRefetch)({
            refetchOnFocus: true,
            hasLoadedOnce: true,
            fetchData: async (mode) => {
                calls.push(mode);
            },
        });
        strict_1.default.deepEqual(calls, ['silent']);
    });
    (0, node_test_1.default)('runFocusRefetch does nothing when disabled', () => {
        const calls = [];
        (0, use_screen_core_1.runFocusRefetch)({
            refetchOnFocus: false,
            hasLoadedOnce: true,
            fetchData: async (mode) => {
                calls.push(mode);
            },
        });
        strict_1.default.deepEqual(calls, []);
    });
});
(0, node_test_1.describe)('use-screen-core status/error helpers', () => {
    (0, node_test_1.default)('deriveScreenStatus uses default empty detection', () => {
        strict_1.default.equal((0, use_screen_core_1.deriveScreenStatus)([]), 'empty');
        strict_1.default.equal((0, use_screen_core_1.deriveScreenStatus)(['value']), 'success');
    });
    (0, node_test_1.default)('normalizeUnknownError maps Error instances to UNKNOWN service error', () => {
        const error = (0, use_screen_core_1.normalizeUnknownError)(new Error('boom'));
        strict_1.default.equal(error.code, 'UNKNOWN');
        strict_1.default.equal(error.message, 'boom');
    });
});
