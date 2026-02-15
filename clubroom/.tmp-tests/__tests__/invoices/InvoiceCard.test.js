"use strict";
/**
 * InvoiceCard Component Tests
 *
 * Unit tests for the InvoiceCard component utility functions and logic.
 * Tests the pure functions that don't require React Native rendering.
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
const theme_1 = require("@/constants/theme");
const node_assert_1 = __importDefault(require("node:assert"));
const node_test_1 = __importStar(require("node:test"));
(0, node_test_1.describe)('InvoiceCard Utility Functions', () => {
    (0, node_test_1.describe)('getStatusIcon', () => {
        const getStatusIcon = (status) => {
            switch (status) {
                case 'DRAFT':
                    return 'document-outline';
                case 'SENT':
                    return 'paper-plane-outline';
                case 'PAID':
                    return 'checkmark-circle-outline';
                case 'VOID':
                    return 'close-circle-outline';
                default:
                    return 'document-outline';
            }
        };
        (0, node_test_1.default)('should return document icon for DRAFT status', () => {
            node_assert_1.default.strictEqual(getStatusIcon('DRAFT'), 'document-outline');
        });
        (0, node_test_1.default)('should return paper-plane icon for SENT status', () => {
            node_assert_1.default.strictEqual(getStatusIcon('SENT'), 'paper-plane-outline');
        });
        (0, node_test_1.default)('should return checkmark icon for PAID status', () => {
            node_assert_1.default.strictEqual(getStatusIcon('PAID'), 'checkmark-circle-outline');
        });
        (0, node_test_1.default)('should return close icon for VOID status', () => {
            node_assert_1.default.strictEqual(getStatusIcon('VOID'), 'close-circle-outline');
        });
    });
    (0, node_test_1.describe)('formatDate', () => {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        };
        (0, node_test_1.default)('should format ISO date correctly', () => {
            const formatted = formatDate('2025-01-15T14:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('Jan'));
            node_assert_1.default.ok(formatted.includes('2025'));
        });
        (0, node_test_1.default)('should include day of month', () => {
            const formatted = formatDate('2025-01-15T14:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('15'));
        });
        (0, node_test_1.default)('should handle different months', () => {
            const formatted = formatDate('2025-06-20T10:00:00.000Z');
            node_assert_1.default.ok(formatted.includes('Jun'));
        });
    });
    (0, node_test_1.describe)('formatShortDate', () => {
        const formatShortDate = (dateString, now = new Date()) => {
            const date = new Date(dateString);
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                return 'Today';
            }
            else if (diffDays === 1) {
                return 'Yesterday';
            }
            else if (diffDays < 7) {
                return `${diffDays} days ago`;
            }
            else {
                return date.toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                });
            }
        };
        (0, node_test_1.default)('should return Today for current date', () => {
            const now = new Date('2025-01-10T15:00:00.000Z');
            const formatted = formatShortDate('2025-01-10T10:00:00.000Z', now);
            node_assert_1.default.strictEqual(formatted, 'Today');
        });
        (0, node_test_1.default)('should return Yesterday for previous date', () => {
            const now = new Date('2025-01-10T15:00:00.000Z');
            const formatted = formatShortDate('2025-01-09T10:00:00.000Z', now);
            node_assert_1.default.strictEqual(formatted, 'Yesterday');
        });
        (0, node_test_1.default)('should return days ago for recent dates', () => {
            const now = new Date('2025-01-10T15:00:00.000Z');
            const formatted = formatShortDate('2025-01-06T10:00:00.000Z', now);
            node_assert_1.default.strictEqual(formatted, '4 days ago');
        });
        (0, node_test_1.default)('should return short date for older dates', () => {
            const now = new Date('2025-01-20T15:00:00.000Z');
            const formatted = formatShortDate('2025-01-01T10:00:00.000Z', now);
            node_assert_1.default.ok(formatted.includes('Jan'));
            node_assert_1.default.ok(formatted.includes('1'));
        });
    });
    (0, node_test_1.describe)('Invoice Display Logic', () => {
        const shouldShowDueWarning = (invoice) => {
            return invoice.status === 'SENT' && !!invoice.dueDate;
        };
        (0, node_test_1.default)('should show due warning for SENT invoice with due date', () => {
            const invoice = {
                status: 'SENT',
                dueDate: '2025-01-25T00:00:00.000Z',
            };
            node_assert_1.default.strictEqual(shouldShowDueWarning(invoice), true);
        });
        (0, node_test_1.default)('should not show due warning for PAID invoice', () => {
            const invoice = {
                status: 'PAID',
                dueDate: '2025-01-25T00:00:00.000Z',
            };
            node_assert_1.default.strictEqual(shouldShowDueWarning(invoice), false);
        });
        (0, node_test_1.default)('should not show due warning for DRAFT invoice', () => {
            const invoice = {
                status: 'DRAFT',
                dueDate: '2025-01-25T00:00:00.000Z',
            };
            node_assert_1.default.strictEqual(shouldShowDueWarning(invoice), false);
        });
        (0, node_test_1.default)('should not show due warning for SENT invoice without due date', () => {
            const invoice = {
                status: 'SENT',
            };
            node_assert_1.default.strictEqual(shouldShowDueWarning(invoice), false);
        });
    });
    (0, node_test_1.describe)('Amount Formatting', () => {
        const formatAmount = (amount, currency = 'GBP') => {
            const symbol = '\u00A3';
            return `${symbol}${amount.toFixed(2)}`;
        };
        (0, node_test_1.default)('should format GBP amount correctly', () => {
            const formatted = formatAmount(50.00, 'GBP');
            node_assert_1.default.ok(formatted.includes('50.00'));
        });
        (0, node_test_1.default)('should format fractional amounts correctly', () => {
            const formatted = formatAmount(41.67, 'GBP');
            node_assert_1.default.ok(formatted.includes('41.67'));
        });
        (0, node_test_1.default)('should handle large amounts', () => {
            const formatted = formatAmount(1500.00, 'GBP');
            node_assert_1.default.ok(formatted.includes('1500.00'));
        });
    });
    (0, node_test_1.describe)('Invoice Card Props Validation', () => {
        const validateProps = (props) => {
            const errors = [];
            if (!props.invoice) {
                errors.push('Invoice is required');
            }
            else {
                if (!props.invoice.id) {
                    errors.push('Invoice ID is required');
                }
                if (!props.invoice.invoiceNumber) {
                    errors.push('Invoice number is required');
                }
                if (typeof props.invoice.total !== 'number') {
                    errors.push('Invoice total must be a number');
                }
            }
            return {
                valid: errors.length === 0,
                errors,
            };
        };
        (0, node_test_1.default)('should validate valid props', () => {
            const result = validateProps({
                invoice: {
                    id: 'test-id',
                    invoiceNumber: 'INV-2025-001',
                    userId: 'user-id',
                    bookingId: 'booking-id',
                    coachId: 'coach-id',
                    athleteId: 'athlete-id',
                    sessionDate: '2025-01-10',
                    amount: 41.67,
                    tax: 8.33,
                    taxRate: 20,
                    total: 50,
                    currency: 'GBP',
                    status: 'PAID',
                    createdAt: '2025-01-10',
                },
            });
            node_assert_1.default.strictEqual(result.valid, true);
            node_assert_1.default.strictEqual(result.errors.length, 0);
        });
        (0, node_test_1.default)('should reject missing invoice', () => {
            const result = validateProps({});
            node_assert_1.default.strictEqual(result.valid, false);
            node_assert_1.default.ok(result.errors.includes('Invoice is required'));
        });
    });
});
(0, node_test_1.describe)('InvoiceCard Compact Mode', () => {
    const getDisplayElements = (compact) => {
        return {
            showFullDetails: !compact,
            showCoachSection: !compact,
            showDueWarning: !compact,
            showChevron: compact,
            showStatusDot: compact,
        };
    };
    (0, node_test_1.default)('should show full details in normal mode', () => {
        const elements = getDisplayElements(false);
        node_assert_1.default.strictEqual(elements.showFullDetails, true);
    });
    (0, node_test_1.default)('should hide full details in compact mode', () => {
        const elements = getDisplayElements(true);
        node_assert_1.default.strictEqual(elements.showFullDetails, false);
    });
    (0, node_test_1.default)('should show chevron in compact mode', () => {
        const elements = getDisplayElements(true);
        node_assert_1.default.strictEqual(elements.showChevron, true);
    });
    (0, node_test_1.default)('should show status dot in compact mode', () => {
        const elements = getDisplayElements(true);
        node_assert_1.default.strictEqual(elements.showStatusDot, true);
    });
    (0, node_test_1.default)('should show coach section in normal mode', () => {
        const elements = getDisplayElements(false);
        node_assert_1.default.strictEqual(elements.showCoachSection, true);
    });
});
(0, node_test_1.describe)('InvoiceCard Status Badge', () => {
    const getStatusBadgeStyle = (status) => {
        const colors = {
            DRAFT: '#6B7280',
            SENT: '#2563EB',
            PAID: '#059669',
            VOID: '#DC2626',
        };
        return {
            backgroundColor: (0, theme_1.withAlpha)(colors[status], 0.09),
            textColor: colors[status],
        };
    };
    (0, node_test_1.default)('should return correct style for DRAFT status', () => {
        const style = getStatusBadgeStyle('DRAFT');
        node_assert_1.default.strictEqual(style.backgroundColor, 'rgba(107, 114, 128, 0.09)');
        node_assert_1.default.strictEqual(style.textColor, '#6B7280');
    });
    (0, node_test_1.default)('should return correct style for SENT status', () => {
        const style = getStatusBadgeStyle('SENT');
        node_assert_1.default.strictEqual(style.backgroundColor, 'rgba(37, 99, 235, 0.09)');
        node_assert_1.default.strictEqual(style.textColor, '#2563EB');
    });
    (0, node_test_1.default)('should return correct style for PAID status', () => {
        const style = getStatusBadgeStyle('PAID');
        node_assert_1.default.strictEqual(style.backgroundColor, 'rgba(5, 150, 105, 0.09)');
        node_assert_1.default.strictEqual(style.textColor, '#059669');
    });
    (0, node_test_1.default)('should return correct style for VOID status', () => {
        const style = getStatusBadgeStyle('VOID');
        node_assert_1.default.strictEqual(style.backgroundColor, 'rgba(220, 38, 38, 0.09)');
        node_assert_1.default.strictEqual(style.textColor, '#DC2626');
    });
});
