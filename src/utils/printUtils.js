import { fmtCurrency, fmtDateTime } from './formatters';

// Escape user-supplied strings before embedding in HTML
const esc = (str) => String(str || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

// Amount without "LKR" prefix — used for individual line item figures
const fmtAmt = (val) =>
  parseFloat(val || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const buildReceiptHtml = ({ sale, items, branchName, cashierName }) => {
  const receiptNo = sale.receipt_number || `#${sale.id}`;
  const address   = sale.branch_address || '';
  const phone     = sale.branch_phone   || '';

  // Customer saving = sum of (stated_price - unit_price) * qty for each item
  const itemSaving = items.reduce((sum, item) => {
    const stated = parseFloat(item.stated_price || 0);
    const selling = parseFloat(item.unit_price || 0);
    if (stated > selling) {
      return sum + (stated - selling) * parseInt(item.quantity || 0);
    }
    return sum;
  }, 0);
  const discountSaving = parseFloat(sale.discount_amount || 0);
  const totalSaving = itemSaving + discountSaving;

  const itemRows = items.map(item => {
    const qty = parseInt(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price || 0);
    const stated = parseFloat(item.stated_price || 0);
    const showStated = stated > unitPrice;
    return `
    <div style="margin:4px 0 2px;">
      <div style="font-size:11px;font-weight:700;">${esc(item.product_name)}${item.size ? ` (${esc(item.size)})` : ''}${item.color ? ` / ${esc(item.color)}` : ''}</div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#444;">
        <span>${showStated ? `<span style="text-decoration:line-through;color:#999;">${fmtAmt(stated)}</span>  ` : ''}${fmtAmt(unitPrice)} × ${qty}</span>
        <span>${fmtAmt(unitPrice * qty)}</span>
      </div>
    </div>
  `;
  }).join('');

  return `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-size:18px;font-weight:900;letter-spacing:1px;">TEEN GIRL</div>
      <div style="font-size:11px;font-weight:700;margin-top:2px;">${esc(branchName) || 'Boutique Store'}</div>
      ${address ? `<div style="font-size:10px;color:#555;margin-top:2px;">${esc(address)}</div>` : ''}
      ${phone   ? `<div style="font-size:10px;color:#555;">Tel: ${esc(phone)}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="font-size:11px;margin-bottom:3px;font-weight:700;">Receipt: ${esc(receiptNo)}</div>
    <div style="font-size:11px;margin-bottom:3px;">Date: ${fmtDateTime(sale.sale_date)}</div>
    <div style="font-size:11px;margin-bottom:8px;">Cashier: ${esc(cashierName)}</div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    ${itemRows}
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;">
      <span>Subtotal</span><span>${fmtCurrency(sale.subtotal)}</span>
    </div>
    ${parseFloat(sale.discount_amount) > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px;color:#555;">
      <span>Discount</span><span>- ${fmtCurrency(sale.discount_amount)}</span>
    </div>` : ''}
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin-top:4px;">
      <span>TOTAL</span><span>${fmtCurrency(sale.total_amount)}</span>
    </div>
    ${totalSaving > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:6px;font-weight:700;color:#000;">
      <span>You saved</span><span>${fmtCurrency(totalSaving)}</span>
    </div>` : ''}
    ${parseFloat(sale.change_amount) > 0 ? `
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:#555;">
      <span>Cash Tendered</span><span>${fmtCurrency(sale.amount_tendered)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;">
      <span>Change</span><span>${fmtCurrency(sale.change_amount)}</span>
    </div>` : ''}
    <div style="border-top:1px dashed #000;margin:10px 0;"></div>
    <div style="text-align:center;font-size:10px;color:#555;margin-bottom:6px;">
      Items may be exchanged within <strong>3 days</strong> of purchase<br>
      with original receipt and tags attached.
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="text-align:center;font-size:11px;color:#555;margin-bottom:4px;">Thank you for shopping with us!</div>
  `;
};

export const buildExchangeSlipHtml = ({ returnNumber, createdAt, cashierName, items, exchangeValue }) => {
  const itemRows = items.map(item => `
    <div style="display:flex;justify-content:space-between;font-size:11px;margin:3px 0;">
      <span style="flex:1;padding-right:6px;">
        ${esc(item.product_name)}${item.size ? ` (${esc(item.size)})` : ''}${item.color ? ` / ${esc(item.color)}` : ''}
        × ${item.quantity}
      </span>
      <span style="white-space:nowrap;">${fmtAmt(item.unit_price * item.quantity)}</span>
    </div>
  `).join('');

  return `
    <div style="text-align:center;margin-bottom:10px;">
      <div style="font-size:15px;font-weight:900;letter-spacing:1px;">EXCHANGE SLIP</div>
      <div style="font-size:10px;color:#555;margin-top:2px;">Internal use only — not a receipt</div>
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="font-size:11px;margin-bottom:3px;font-weight:700;">Ref: ${esc(returnNumber)}</div>
    <div style="font-size:11px;margin-bottom:3px;">Date: ${fmtDateTime(createdAt)}</div>
    <div style="font-size:11px;margin-bottom:8px;">Cashier: ${esc(cashierName)}</div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="font-size:11px;font-weight:700;margin-bottom:4px;">Items Returned:</div>
    ${itemRows}
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;margin-top:4px;">
      <span>Exchange Value</span><span>LKR ${fmtAmt(exchangeValue)}</span>
    </div>
    <div style="border-top:1px dashed #000;margin:10px 0;"></div>
    <div style="text-align:center;font-size:10px;color:#555;">Customer to select replacement item(s)</div>
  `;
};

export const printExchangeSlip = async (data) => {
  const html = buildExchangeSlipHtml(data);
  if (window.electronAPI?.printReceipt) {
    await window.electronAPI.printReceipt(html);
  } else {
    const w = window.open('', 'PRINT', 'width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{font-family:'Courier New',monospace;font-size:12px;width:72mm;padding:8px;}</style>
    </head><body>${html}<script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    w.document.close();
  }
};

export const printReceipt = async (data) => {
  const html = buildReceiptHtml(data);
  if (window.electronAPI?.printReceipt) {
    await window.electronAPI.printReceipt(html);
  } else {
    const w = window.open('', 'PRINT', 'width=400,height=600');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{font-family:'Courier New',monospace;font-size:12px;width:72mm;padding:8px;}</style>
    </head><body>${html}<script>window.onload=()=>{window.print();window.close();}</script></body></html>`);
    w.document.close();
  }
};
