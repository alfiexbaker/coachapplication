"use strict";
/**
 * API Contracts Tests
 *
 * Tests for API_CONFIG constants and SERVICE_MIGRATION_STATUS
 * to ensure contract definitions remain consistent.
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
const api_contracts_1 = require("../../services/api-contracts");
(0, node_test_1.describe)('API Contracts', () => {
    // ---------------------------------------------------------------------------
    // API_CONFIG
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('API_CONFIG', () => {
        (0, node_test_1.default)('has baseUrl, version, and timeout', () => {
            strict_1.default.ok(api_contracts_1.API_CONFIG.baseUrl, 'baseUrl should be defined');
            strict_1.default.equal(typeof api_contracts_1.API_CONFIG.baseUrl, 'string');
            strict_1.default.equal(api_contracts_1.API_CONFIG.version, 'v1');
            strict_1.default.equal(api_contracts_1.API_CONFIG.timeout, 30000);
        });
        (0, node_test_1.default)('baseUrl is a valid URL format', () => {
            strict_1.default.ok(api_contracts_1.API_CONFIG.baseUrl.startsWith('http'), `baseUrl should start with http, got: ${api_contracts_1.API_CONFIG.baseUrl}`);
        });
    });
    // ---------------------------------------------------------------------------
    // SERVICE_MIGRATION_STATUS
    // ---------------------------------------------------------------------------
    (0, node_test_1.describe)('SERVICE_MIGRATION_STATUS', () => {
        (0, node_test_1.default)('has entries for core services', () => {
            strict_1.default.ok(api_contracts_1.SERVICE_MIGRATION_STATUS['availability-service']);
            strict_1.default.ok(api_contracts_1.SERVICE_MIGRATION_STATUS['booking-service']);
            strict_1.default.ok(api_contracts_1.SERVICE_MIGRATION_STATUS['invite-service']);
            strict_1.default.ok(api_contracts_1.SERVICE_MIGRATION_STATUS['family-service']);
            strict_1.default.ok(api_contracts_1.SERVICE_MIGRATION_STATUS['wallet-service']);
            strict_1.default.ok(api_contracts_1.SERVICE_MIGRATION_STATUS['earnings-service']);
        });
        (0, node_test_1.default)('high priority services are READY', () => {
            const highPriority = [
                'availability-service',
                'booking-service',
                'invite-service',
                'family-service',
                'wallet-service',
                'earnings-service',
            ];
            for (const svc of highPriority) {
                strict_1.default.equal(api_contracts_1.SERVICE_MIGRATION_STATUS[svc].status, 'READY', `${svc} should be READY`);
            }
        });
        (0, node_test_1.default)('every entry has status and endpoints count', () => {
            const entries = Object.entries(api_contracts_1.SERVICE_MIGRATION_STATUS);
            strict_1.default.ok(entries.length >= 10, `Expected at least 10 services, got ${entries.length}`);
            for (const [name, info] of entries) {
                strict_1.default.ok(info.status === 'READY' || info.status === 'PARTIAL', `${name} should have status READY or PARTIAL, got: ${info.status}`);
                strict_1.default.equal(typeof info.endpoints, 'number', `${name} should have numeric endpoints`);
                strict_1.default.ok(info.endpoints > 0, `${name} should have at least 1 endpoint`);
            }
        });
        (0, node_test_1.default)('total endpoint count is reasonable', () => {
            const totalEndpoints = Object.values(api_contracts_1.SERVICE_MIGRATION_STATUS).reduce((sum, svc) => sum + svc.endpoints, 0);
            strict_1.default.ok(totalEndpoints >= 40, `Expected at least 40 total endpoints, got ${totalEndpoints}`);
        });
    });
});
