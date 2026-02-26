import { apiClient } from '@/services/api-client';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { ok, err, serviceError, validationError, type Result, type ServiceError } from '@/types/result';
import type { Invoice } from '@/constants/types';

export interface CoachPaymentInstructions {
  coachId: string;
  payeeName: string;
  bankTransferDetails: string;
  paymentNotes: string;
  updatedAt?: string;
}

interface ReminderItemLike {
  athleteName: string;
  booking: {
    scheduledAt: string;
  };
  invoice: Pick<Invoice, 'total' | 'invoiceNumber' | 'dueDate'>;
}

interface InvoiceMessageParams {
  invoice: Invoice;
  coachName?: string;
  recipientName?: string;
  instructions: CoachPaymentInstructions;
}

interface ReminderMessageParams {
  item: ReminderItemLike;
  coachName?: string;
  instructions: CoachPaymentInstructions;
}

interface BatchReminderMessageParams {
  items: ReminderItemLike[];
  coachName?: string;
  instructions: CoachPaymentInstructions;
}

type StoredInstructionsMap = Record<string, CoachPaymentInstructions>;

const MAX_PAYEE_NAME = 80;
const MAX_BANK_DETAILS = 600;
const MAX_PAYMENT_NOTES = 400;

function formatGBP(amount: number): string {
  return `£${amount.toFixed(2)}`;
}

function formatDate(dateIso?: string): string | null {
  if (!dateIso) return null;
  const value = new Date(dateIso);
  if (Number.isNaN(value.getTime())) return null;
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSessionDate(dateIso: string): string {
  const value = new Date(dateIso);
  if (Number.isNaN(value.getTime())) return 'the scheduled session';
  return value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function trimAndLimit(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength);
}

function buildPaymentInstructionsBlock(instructions: CoachPaymentInstructions): string {
  const lines: string[] = [];

  if (instructions.payeeName) {
    lines.push(`Payee: ${instructions.payeeName}`);
  }

  if (instructions.bankTransferDetails) {
    lines.push('Bank details:');
    lines.push(instructions.bankTransferDetails);
  } else {
    lines.push('Bank details: I will send these directly.');
  }

  if (instructions.paymentNotes) {
    lines.push('');
    lines.push(instructions.paymentNotes);
  }

  return lines.join('\n');
}

function getDefaultInstructions(coachId: string): CoachPaymentInstructions {
  return {
    coachId,
    payeeName: '',
    bankTransferDetails: '',
    paymentNotes:
      'Please use the invoice number as the payment reference and message me once sent so I can mark it as paid in the app.',
  };
}

function sanitizeInstructions(input: CoachPaymentInstructions): Result<CoachPaymentInstructions, ServiceError> {
  const sanitized: CoachPaymentInstructions = {
    coachId: input.coachId.trim(),
    payeeName: trimAndLimit(input.payeeName || '', MAX_PAYEE_NAME),
    bankTransferDetails: trimAndLimit(input.bankTransferDetails || '', MAX_BANK_DETAILS),
    paymentNotes: trimAndLimit(input.paymentNotes || '', MAX_PAYMENT_NOTES),
    updatedAt: new Date().toISOString(),
  };

  if (!sanitized.coachId) {
    return err(validationError('Coach ID is required'));
  }

  if (!sanitized.bankTransferDetails && !sanitized.paymentNotes) {
    return err(validationError('Add bank details or payment notes so families know how to pay you'));
  }

  return ok(sanitized);
}

export const coachPaymentInstructionsService = {
  async getCoachPaymentInstructions(
    coachId: string,
  ): Promise<Result<CoachPaymentInstructions, ServiceError>> {
    if (!coachId.trim()) {
      return err(validationError('Coach ID is required'));
    }

    try {
      const map = await apiClient.get<StoredInstructionsMap>(STORAGE_KEYS.COACH_PAYMENT_INSTRUCTIONS, {});
      return ok(map[coachId] ?? getDefaultInstructions(coachId));
    } catch (error) {
      return err(serviceError('STORAGE', 'Failed to load payment instructions', error));
    }
  },

  async saveCoachPaymentInstructions(
    input: CoachPaymentInstructions,
  ): Promise<Result<CoachPaymentInstructions, ServiceError>> {
    const sanitized = sanitizeInstructions(input);
    if (!sanitized.success) {
      return sanitized;
    }

    try {
      const map = await apiClient.get<StoredInstructionsMap>(STORAGE_KEYS.COACH_PAYMENT_INSTRUCTIONS, {});
      const next: StoredInstructionsMap = {
        ...map,
        [sanitized.data.coachId]: sanitized.data,
      };
      await apiClient.set(STORAGE_KEYS.COACH_PAYMENT_INSTRUCTIONS, next);
      return ok(sanitized.data);
    } catch (error) {
      return err(serviceError('STORAGE', 'Failed to save payment instructions', error));
    }
  },

  buildInvoiceMessage({
    invoice,
    coachName,
    recipientName,
    instructions,
  }: InvoiceMessageParams): string {
    const recipientLine = recipientName?.trim() ? `Hi ${recipientName.trim()},` : 'Hi,';
    const sessionDate = formatDate(invoice.sessionDate) ?? 'your session date';
    const dueDate = formatDate(invoice.dueDate);
    const invoiceNumber = invoice.invoiceNumber || `Invoice ${invoice.id}`;
    const coachLabel = coachName?.trim() ? `${coachName.trim()} (coach)` : 'your coach';

    const lines = [
      recipientLine,
      '',
      `Thanks for your session booking. ${invoiceNumber} for ${formatGBP(invoice.total)} is now due for the session on ${sessionDate}.`,
      'Payment is made directly to the coach (outside the app).',
      '',
      buildPaymentInstructionsBlock(instructions),
      '',
      `Reference: ${invoice.invoiceNumber || invoice.id}`,
    ];

    if (dueDate) {
      lines.push(`Payment due by: ${dueDate}`);
    }

    lines.push('');
    lines.push(`Please reply once payment is sent so ${coachLabel} can mark it as paid in the reconciler.`);

    return lines.join('\n');
  },

  buildReminderMessage({
    item,
    coachName,
    instructions,
  }: ReminderMessageParams): string {
    const dueDate = formatDate(item.invoice.dueDate);
    const coachLabel = coachName?.trim() ? coachName.trim() : 'Coach';
    const lines = [
      `Hi, just a friendly reminder that ${formatGBP(item.invoice.total)} is still due for ${item.athleteName}'s session on ${formatSessionDate(item.booking.scheduledAt)}.`,
      'Payment is made directly to the coach (outside the app).',
      '',
      buildPaymentInstructionsBlock(instructions),
      '',
      `Reference: ${item.invoice.invoiceNumber || 'session payment'}`,
    ];

    if (dueDate) {
      lines.push(`Due date: ${dueDate}`);
    }

    lines.push('');
    lines.push(`Please let ${coachLabel} know once payment is sent so it can be marked as paid.`);

    return lines.join('\n');
  },

  buildBatchReminderMessage({
    items,
    coachName,
    instructions,
  }: BatchReminderMessageParams): string {
    const total = items.reduce((sum, item) => sum + item.invoice.total, 0);
    const coachLabel = coachName?.trim() ? coachName.trim() : 'Coach';
    const lines = items.map(
      (item) =>
        `- ${item.athleteName} (${formatSessionDate(item.booking.scheduledAt)}): ${formatGBP(item.invoice.total)} [${item.invoice.invoiceNumber || item.invoice.dueDate || 'payment'}]`,
    );

    return [
      `Hi, just a reminder about outstanding session payments totalling ${formatGBP(total)}.`,
      '',
      ...lines,
      '',
      'Payment is made directly to the coach (outside the app).',
      '',
      buildPaymentInstructionsBlock(instructions),
      '',
      `Please let ${coachLabel} know once payment has been sent so the reconciler can be updated.`,
    ].join('\n');
  },

  getMaxLengths() {
    return {
      payeeName: MAX_PAYEE_NAME,
      bankTransferDetails: MAX_BANK_DETAILS,
      paymentNotes: MAX_PAYMENT_NOTES,
    };
  },
};
