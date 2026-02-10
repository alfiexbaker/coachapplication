"use strict";
/**
 * Invoice HTML Template
 *
 * Extracted from invoice-service.ts to reduce file size.
 * Generates a printable/shareable HTML invoice.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoiceHtml = generateInvoiceHtml;
function generateInvoiceHtml(invoice) {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
    };
    const formatCurrency = (amount) => {
        return `\u00A3${amount.toFixed(2)}`;
    };
    const statusColor = {
        DRAFT: '#6B7280',
        SENT: '#2563EB',
        PAID: '#059669',
        VOID: '#DC2626',
    };
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1F2937;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
    .logo { font-size: 24px; font-weight: 700; color: #0F172A; }
    .invoice-number { text-align: right; }
    .invoice-number h1 { font-size: 28px; color: #0F172A; margin-bottom: 4px; }
    .invoice-number .date { color: #6B7280; font-size: 14px; }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      background: ${statusColor[invoice.status]};
      margin-top: 8px;
    }
    .parties { display: flex; gap: 80px; margin-bottom: 40px; }
    .party h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; margin-bottom: 8px; }
    .party p { line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 40px 0; }
    thead { background: #F9FAFB; }
    th { text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; font-weight: 600; }
    td { padding: 16px 12px; border-bottom: 1px solid #E5E7EB; }
    .description { color: #6B7280; font-size: 14px; margin-top: 4px; }
    .totals { margin-left: auto; width: 300px; }
    .totals tr { border: none; }
    .totals td { border: none; padding: 8px 12px; }
    .totals .label { color: #6B7280; }
    .totals .amount { text-align: right; font-weight: 500; }
    .total-row { font-size: 18px; font-weight: 700; border-top: 2px solid #0F172A; padding-top: 12px; }
    .total-row td { padding-top: 16px; }
    .notes { margin-top: 40px; padding-top: 40px; border-top: 1px solid #E5E7EB; }
    .notes h3 { font-size: 14px; margin-bottom: 8px; }
    .notes p { color: #6B7280; line-height: 1.6; }
    .footer { margin-top: 60px; text-align: center; color: #9CA3AF; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Clubroom</div>
    <div class="invoice-number">
      <h1>${invoice.invoiceNumber}</h1>
      <div class="date">Issued ${formatDate(invoice.issuedAt)}</div>
      <span class="status">${invoice.status}</span>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>From</h3>
      <p>
        <strong>${invoice.from.name}</strong><br/>
        ${invoice.from.email}<br/>
        ${invoice.from.address ? `${invoice.from.address}<br/>` : ''}
        ${invoice.from.phone || ''}
      </p>
    </div>
    <div class="party">
      <h3>To</h3>
      <p>
        <strong>${invoice.to.name}</strong><br/>
        ${invoice.to.email}<br/>
        ${invoice.to.address ? `${invoice.to.address}<br/>` : ''}
        ${invoice.to.phone || ''}
      </p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 60%;">Description</th>
        <th style="width: 15%; text-align: center;">Qty</th>
        <th style="width: 15%; text-align: right;">Rate</th>
        <th style="width: 15%; text-align: right;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${invoice.items.map(item => `
        <tr>
          <td>
            <div style="font-weight: 500;">${item.description}</div>
            ${item.details ? `<div class="description">${item.details}</div>` : ''}
          </td>
          <td style="text-align: center;">${item.quantity}</td>
          <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
          <td style="text-align: right;">${formatCurrency(item.total)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <table class="totals">
    <tr>
      <td class="label">Subtotal</td>
      <td class="amount">${formatCurrency(invoice.subtotal)}</td>
    </tr>
    ${invoice.discount > 0 ? `
      <tr>
        <td class="label">Discount</td>
        <td class="amount">-${formatCurrency(invoice.discount)}</td>
      </tr>
    ` : ''}
    <tr>
      <td class="label">VAT (${invoice.taxRate}%)</td>
      <td class="amount">${formatCurrency(invoice.tax)}</td>
    </tr>
    <tr class="total-row">
      <td>Total</td>
      <td class="amount">${formatCurrency(invoice.total)}</td>
    </tr>
  </table>

  ${invoice.notes ? `
    <div class="notes">
      <h3>Notes</h3>
      <p>${invoice.notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>Payment due by ${formatDate(invoice.dueDate)}</p>
    ${invoice.status === 'PAID' && invoice.paidAt ? `
      <p style="margin-top: 8px; color: #059669; font-weight: 500;">
        ✓ Paid on ${formatDate(invoice.paidAt)}
      </p>
    ` : ''}
  </div>
</body>
</html>
`;
}
