"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletService = void 0;
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('WalletService');
/**
 * Wallet Service - Re-export Facade
 *
 * This file has been refactored into focused modules under services/wallet/.
 * It re-exports everything for full backward compatibility.
 *
 * See:
 * - services/wallet/wallet-crud-service.ts (wallet CRUD, balance checks)
 * - services/wallet/wallet-transaction-service.ts (transaction CRUD, filtering)
 * - services/wallet/wallet-payment-service.ts (top-ups, payments, refunds, promo credits)
 * - services/wallet/wallet-utils-service.ts (summaries, formatting, demo data)
 * - services/wallet/index.ts (unified facade)
 */
var index_1 = require("./wallet/index");
Object.defineProperty(exports, "walletService", { enumerable: true, get: function () { return index_1.walletService; } });
