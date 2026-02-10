"use strict";
/**
 * Group Session Service (Facade) Tests
 *
 * Verifies re-exports from the group session service module.
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
const group_session_service_1 = require("../../services/group-session-service");
(0, node_test_1.describe)('groupSessionService (facade)', () => {
    (0, node_test_1.default)('exports groupSessionService object', () => {
        strict_1.default.equal(typeof group_session_service_1.groupSessionService, 'object');
        strict_1.default.ok(group_session_service_1.groupSessionService !== null);
    });
    (0, node_test_1.default)('has createSession method from crud service', () => {
        strict_1.default.equal(typeof group_session_service_1.groupSessionService.createSession, 'function');
    });
    (0, node_test_1.default)('has register method from registration service', () => {
        strict_1.default.equal(typeof group_session_service_1.groupSessionService.register, 'function');
    });
    (0, node_test_1.default)('has formatPrice method from display service', () => {
        strict_1.default.equal(typeof group_session_service_1.groupSessionService.formatPrice, 'function');
    });
    (0, node_test_1.default)('has getClubTrainingSessions method from scheduling service', () => {
        strict_1.default.equal(typeof group_session_service_1.groupSessionService.getClubTrainingSessions, 'function');
    });
});
