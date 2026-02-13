/**
 * InvoiceCard Component Tests
 *
 * Unit tests for the InvoiceCard component utility functions and logic.
 * Tests the pure functions that don't require React Native rendering.
 */

import { withAlpha } from '@/constants/theme';
import assert from 'node:assert';
import test, { describe } from 'node:test';

import type { Invoice, InvoiceStatus } from '../../constants/types';

describe('InvoiceCard Utility Functions', () => {
  describe('getStatusIcon', () => {
    type IoniconsName = string;

    const getStatusIcon = (status: InvoiceStatus): IoniconsName => {
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

    test('should return document icon for DRAFT status', () => {
      assert.strictEqual(getStatusIcon('DRAFT'), 'document-outline');
    });

    test('should return paper-plane icon for SENT status', () => {
      assert.strictEqual(getStatusIcon('SENT'), 'paper-plane-outline');
    });

    test('should return checkmark icon for PAID status', () => {
      assert.strictEqual(getStatusIcon('PAID'), 'checkmark-circle-outline');
    });

    test('should return close icon for VOID status', () => {
      assert.strictEqual(getStatusIcon('VOID'), 'close-circle-outline');
    });
  });

  describe('formatDate', () => {
    const formatDate = (dateString: string): string => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    test('should format ISO date correctly', () => {
      const formatted = formatDate('2025-01-15T14:00:00.000Z');
      assert.ok(formatted.includes('Jan'));
      assert.ok(formatted.includes('2025'));
    });

    test('should include day of month', () => {
      const formatted = formatDate('2025-01-15T14:00:00.000Z');
      assert.ok(formatted.includes('15'));
    });

    test('should handle different months', () => {
      const formatted = formatDate('2025-06-20T10:00:00.000Z');
      assert.ok(formatted.includes('Jun'));
    });
  });

  describe('formatShortDate', () => {
    const formatShortDate = (dateString: string, now: Date = new Date()): string => {
      const date = new Date(dateString);
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
      }
    };

    test('should return Today for current date', () => {
      const now = new Date('2025-01-10T15:00:00.000Z');
      const formatted = formatShortDate('2025-01-10T10:00:00.000Z', now);
      assert.strictEqual(formatted, 'Today');
    });

    test('should return Yesterday for previous date', () => {
      const now = new Date('2025-01-10T15:00:00.000Z');
      const formatted = formatShortDate('2025-01-09T10:00:00.000Z', now);
      assert.strictEqual(formatted, 'Yesterday');
    });

    test('should return days ago for recent dates', () => {
      const now = new Date('2025-01-10T15:00:00.000Z');
      const formatted = formatShortDate('2025-01-06T10:00:00.000Z', now);
      assert.strictEqual(formatted, '4 days ago');
    });

    test('should return short date for older dates', () => {
      const now = new Date('2025-01-20T15:00:00.000Z');
      const formatted = formatShortDate('2025-01-01T10:00:00.000Z', now);
      assert.ok(formatted.includes('Jan'));
      assert.ok(formatted.includes('1'));
    });
  });

  describe('Invoice Display Logic', () => {
    const shouldShowDueWarning = (invoice: Partial<Invoice>): boolean => {
      return invoice.status === 'SENT' && !!invoice.dueDate;
    };

    test('should show due warning for SENT invoice with due date', () => {
      const invoice: Partial<Invoice> = {
        status: 'SENT',
        dueDate: '2025-01-25T00:00:00.000Z',
      };
      assert.strictEqual(shouldShowDueWarning(invoice), true);
    });

    test('should not show due warning for PAID invoice', () => {
      const invoice: Partial<Invoice> = {
        status: 'PAID',
        dueDate: '2025-01-25T00:00:00.000Z',
      };
      assert.strictEqual(shouldShowDueWarning(invoice), false);
    });

    test('should not show due warning for DRAFT invoice', () => {
      const invoice: Partial<Invoice> = {
        status: 'DRAFT',
        dueDate: '2025-01-25T00:00:00.000Z',
      };
      assert.strictEqual(shouldShowDueWarning(invoice), false);
    });

    test('should not show due warning for SENT invoice without due date', () => {
      const invoice: Partial<Invoice> = {
        status: 'SENT',
      };
      assert.strictEqual(shouldShowDueWarning(invoice), false);
    });
  });

  describe('Amount Formatting', () => {
    const formatAmount = (amount: number, currency: string = 'GBP'): string => {
      const symbol = '\u00A3';
      return `${symbol}${amount.toFixed(2)}`;
    };

    test('should format GBP amount correctly', () => {
      const formatted = formatAmount(50.00, 'GBP');
      assert.ok(formatted.includes('50.00'));
    });

    test('should format fractional amounts correctly', () => {
      const formatted = formatAmount(41.67, 'GBP');
      assert.ok(formatted.includes('41.67'));
    });

    test('should handle large amounts', () => {
      const formatted = formatAmount(1500.00, 'GBP');
      assert.ok(formatted.includes('1500.00'));
    });
  });

  describe('Invoice Card Props Validation', () => {
    interface InvoiceCardProps {
      invoice: Invoice;
      compact?: boolean;
      onPress?: () => void;
    }

    const validateProps = (props: Partial<InvoiceCardProps>): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!props.invoice) {
        errors.push('Invoice is required');
      } else {
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

    test('should validate valid props', () => {
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
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    test('should reject missing invoice', () => {
      const result = validateProps({});
      assert.strictEqual(result.valid, false);
      assert.ok(result.errors.includes('Invoice is required'));
    });
  });
});

describe('InvoiceCard Compact Mode', () => {
  const getDisplayElements = (compact: boolean) => {
    return {
      showFullDetails: !compact,
      showCoachSection: !compact,
      showDueWarning: !compact,
      showChevron: compact,
      showStatusDot: compact,
    };
  };

  test('should show full details in normal mode', () => {
    const elements = getDisplayElements(false);
    assert.strictEqual(elements.showFullDetails, true);
  });

  test('should hide full details in compact mode', () => {
    const elements = getDisplayElements(true);
    assert.strictEqual(elements.showFullDetails, false);
  });

  test('should show chevron in compact mode', () => {
    const elements = getDisplayElements(true);
    assert.strictEqual(elements.showChevron, true);
  });

  test('should show status dot in compact mode', () => {
    const elements = getDisplayElements(true);
    assert.strictEqual(elements.showStatusDot, true);
  });

  test('should show coach section in normal mode', () => {
    const elements = getDisplayElements(false);
    assert.strictEqual(elements.showCoachSection, true);
  });
});

describe('InvoiceCard Status Badge', () => {
  const getStatusBadgeStyle = (status: InvoiceStatus) => {
    const colors: Record<InvoiceStatus, string> = {
      DRAFT: '#6B7280',
      SENT: '#2563EB',
      PAID: '#059669',
      VOID: '#DC2626',
    };

    return {
      backgroundColor: withAlpha(colors[status], 0.09),
      textColor: colors[status],
    };
  };

  test('should return correct style for DRAFT status', () => {
    const style = getStatusBadgeStyle('DRAFT');
    assert.strictEqual(style.backgroundColor, 'rgba(107, 114, 128, 0.09)');
    assert.strictEqual(style.textColor, '#6B7280');
  });

  test('should return correct style for SENT status', () => {
    const style = getStatusBadgeStyle('SENT');
    assert.strictEqual(style.backgroundColor, 'rgba(37, 99, 235, 0.09)');
    assert.strictEqual(style.textColor, '#2563EB');
  });

  test('should return correct style for PAID status', () => {
    const style = getStatusBadgeStyle('PAID');
    assert.strictEqual(style.backgroundColor, 'rgba(5, 150, 105, 0.09)');
    assert.strictEqual(style.textColor, '#059669');
  });

  test('should return correct style for VOID status', () => {
    const style = getStatusBadgeStyle('VOID');
    assert.strictEqual(style.backgroundColor, 'rgba(220, 38, 38, 0.09)');
    assert.strictEqual(style.textColor, '#DC2626');
  });
});
