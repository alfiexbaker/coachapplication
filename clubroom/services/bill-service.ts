/**
 * Bill Service
 *
 * Manages coach bills and expenses: CRUD, mark-as-paid, summaries, categories.
 * Uses apiClient for persistence and event-bus for reactivity.
 */

import { apiClient } from './api-client';
import { emitTyped } from './event-bus';
import { ServiceEvents } from './event-bus';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { createLogger } from '@/utils/logger';
import { ok, err, serviceError } from '@/types/result';
import type { Result, ServiceError } from '@/types/result';
import type { Bill, BillCategory, BillStatus, BillSummary } from '@/constants/types';

const logger = createLogger('BillService');

// ============================================================================
// SEED DATA
// ============================================================================

const SEED_BILLS: Bill[] = [
  {
    id: 'bill_1',
    coachId: 'coach1',
    title: 'Pitch Hire — Riverside Fields',
    amount: 45,
    currency: 'GBP',
    category: 'FACILITY_RENTAL',
    status: 'PAID',
    vendor: 'Riverside Fields Ltd',
    dueDate: '2026-01-15',
    paidAt: '2026-01-14',
    isRecurring: true,
    description: 'Weekly Saturday morning pitch booking',
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-01-14T09:00:00Z',
  },
  {
    id: 'bill_2',
    coachId: 'coach1',
    title: 'Training Cones & Bibs',
    amount: 32.5,
    currency: 'GBP',
    category: 'EQUIPMENT',
    status: 'PAID',
    vendor: 'Sports Direct',
    dueDate: '2026-01-20',
    paidAt: '2026-01-18',
    isRecurring: false,
    createdAt: '2026-01-05T14:30:00Z',
    updatedAt: '2026-01-18T11:00:00Z',
  },
  {
    id: 'bill_3',
    coachId: 'coach1',
    title: 'Public Liability Insurance',
    amount: 180,
    currency: 'GBP',
    category: 'INSURANCE',
    status: 'PENDING',
    vendor: 'Coach Cover UK',
    dueDate: '2026-03-01',
    isRecurring: true,
    description: 'Annual coaching insurance renewal',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-01T09:00:00Z',
  },
  {
    id: 'bill_4',
    coachId: 'coach1',
    title: 'Fuel — Away Sessions',
    amount: 28,
    currency: 'GBP',
    category: 'TRANSPORT',
    status: 'PENDING',
    vendor: 'BP',
    dueDate: '2026-02-28',
    isRecurring: false,
    createdAt: '2026-02-10T16:00:00Z',
    updatedAt: '2026-02-10T16:00:00Z',
  },
  {
    id: 'bill_5',
    coachId: 'coach1',
    title: 'FA Level 2 Course',
    amount: 250,
    currency: 'GBP',
    category: 'CERTIFICATION',
    status: 'PAID',
    vendor: 'The FA',
    dueDate: '2025-12-01',
    paidAt: '2025-11-28',
    isRecurring: false,
    description: 'FA Level 2 coaching certificate',
    createdAt: '2025-11-15T10:00:00Z',
    updatedAt: '2025-11-28T10:00:00Z',
  },
  {
    id: 'bill_6',
    coachId: 'coach1',
    title: 'Instagram Ads — January',
    amount: 40,
    currency: 'GBP',
    category: 'MARKETING',
    status: 'PAID',
    vendor: 'Meta',
    dueDate: '2026-02-01',
    paidAt: '2026-02-01',
    isRecurring: true,
    createdAt: '2026-01-31T20:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

// ============================================================================
// SERVICE
// ============================================================================

async function loadBills(): Promise<Bill[]> {
  const stored = await apiClient.get<Bill[]>(STORAGE_KEYS.BILLS, []);
  if (stored.length === 0) {
    await apiClient.set(STORAGE_KEYS.BILLS, SEED_BILLS);
    return SEED_BILLS;
  }
  return stored;
}

async function saveBills(bills: Bill[]): Promise<void> {
  await apiClient.set(STORAGE_KEYS.BILLS, bills);
}

export const billService = {
  async getCoachBills(coachId: string): Promise<Result<Bill[], ServiceError>> {
    try {
      const bills = await loadBills();
      const coachBills = bills
        .filter((b) => b.coachId === coachId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return ok(coachBills);
    } catch (error) {
      logger.error('Failed to get coach bills', error);
      return err(serviceError('UNKNOWN', 'Failed to load bills', error));
    }
  },

  async createBill(
    data: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'paidAt'>,
  ): Promise<Result<Bill, ServiceError>> {
    try {
      const bills = await loadBills();
      const now = new Date().toISOString();
      const newBill: Bill = {
        ...data,
        id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: now,
        updatedAt: now,
      };
      bills.push(newBill);
      await saveBills(bills);

      emitTyped(ServiceEvents.BILL_CREATED, {
        billId: newBill.id,
        coachId: newBill.coachId,
        amount: newBill.amount,
      });

      logger.success('Bill created', { billId: newBill.id });
      return ok(newBill);
    } catch (error) {
      logger.error('Failed to create bill', error);
      return err(serviceError('UNKNOWN', 'Failed to create bill', error));
    }
  },

  async updateBill(
    billId: string,
    updates: Partial<Pick<Bill, 'title' | 'amount' | 'category' | 'vendor' | 'dueDate' | 'isRecurring' | 'description'>>,
  ): Promise<Result<Bill, ServiceError>> {
    try {
      const bills = await loadBills();
      const idx = bills.findIndex((b) => b.id === billId);
      if (idx === -1) {
        return err(serviceError('NOT_FOUND', 'Bill not found'));
      }

      bills[idx] = {
        ...bills[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      await saveBills(bills);

      emitTyped(ServiceEvents.BILL_UPDATED, {
        billId,
        coachId: bills[idx].coachId,
      });

      logger.info('Bill updated', { billId });
      return ok(bills[idx]);
    } catch (error) {
      logger.error('Failed to update bill', error);
      return err(serviceError('UNKNOWN', 'Failed to update bill', error));
    }
  },

  async deleteBill(billId: string): Promise<Result<void, ServiceError>> {
    try {
      const bills = await loadBills();
      const filtered = bills.filter((b) => b.id !== billId);
      if (filtered.length === bills.length) {
        return err(serviceError('NOT_FOUND', 'Bill not found'));
      }
      await saveBills(filtered);
      logger.info('Bill deleted', { billId });
      return ok(undefined);
    } catch (error) {
      logger.error('Failed to delete bill', error);
      return err(serviceError('UNKNOWN', 'Failed to delete bill', error));
    }
  },

  async markBillAsPaid(billId: string): Promise<Result<Bill, ServiceError>> {
    try {
      const bills = await loadBills();
      const idx = bills.findIndex((b) => b.id === billId);
      if (idx === -1) {
        return err(serviceError('NOT_FOUND', 'Bill not found'));
      }

      const now = new Date().toISOString();
      bills[idx] = {
        ...bills[idx],
        status: 'PAID',
        paidAt: now,
        updatedAt: now,
      };
      await saveBills(bills);

      emitTyped(ServiceEvents.BILL_PAID, {
        billId,
        coachId: bills[idx].coachId,
        amount: bills[idx].amount,
      });

      logger.success('Bill marked as paid', { billId });
      return ok(bills[idx]);
    } catch (error) {
      logger.error('Failed to mark bill as paid', error);
      return err(serviceError('UNKNOWN', 'Failed to mark bill as paid', error));
    }
  },

  async getBillSummary(coachId: string): Promise<Result<BillSummary, ServiceError>> {
    try {
      const result = await this.getCoachBills(coachId);
      if (!result.success) return result;

      const bills = result.data;
      const totalExpenses = bills.reduce((sum: number, b: Bill) => sum + b.amount, 0);
      const paidBills = bills.filter((b: Bill) => b.status === 'PAID');
      const pendingBills = bills.filter((b: Bill) => b.status !== 'PAID');

      return ok({
        totalExpenses,
        totalPaid: paidBills.reduce((sum: number, b: Bill) => sum + b.amount, 0),
        totalPending: pendingBills.reduce((sum: number, b: Bill) => sum + b.amount, 0),
        billCount: bills.length,
        paidCount: paidBills.length,
        pendingCount: pendingBills.length,
        currency: 'GBP',
      });
    } catch (error) {
      logger.error('Failed to get bill summary', error);
      return err(serviceError('UNKNOWN', 'Failed to get bill summary', error));
    }
  },

  async getBillsByCategory(
    coachId: string,
    category: BillCategory,
  ): Promise<Result<Bill[], ServiceError>> {
    try {
      const result = await this.getCoachBills(coachId);
      if (!result.success) return result;
      return ok(result.data.filter((b: Bill) => b.category === category));
    } catch (error) {
      logger.error('Failed to get bills by category', error);
      return err(serviceError('UNKNOWN', 'Failed to filter bills', error));
    }
  },
};
