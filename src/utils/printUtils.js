import { fmtCurrency, fmtDateTime } from './formatters';

export const buildReceiptHtml = ({ sale, items, branchName, cashierName }) => {
  const receiptNo = sale.receipt_number || `#${sale.id}`;
  const address   = sale.branch_address || '';
  const phone     = sale.branch_phone   || '';

  const itemRows = items.map(item => `
    <div style="display:flex;justify-content:space-between;margin:3px 0;font-size:11px;">
      <span>${item.product_name}${item.size ? ` (${item.size})` : ''}${item.color ? ` / ${item.color}` : ''}</span>
      <span>x${item.quantity}</span>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px;">
      <span style="color:#666;">${item.sku}</span>
      <span>${fmtCurrency(item.total_price)}</span>
    </div>
  `).join('');

  return `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-size:18px;font-weight:900;letter-spacing:1px;">TEEN GIRL</div>
      <div style="font-size:11px;font-weight:700;margin-top:2px;">${branchName || 'Boutique Store'}</div>
      ${address ? `<div style="font-size:10px;color:#555;margin-top:2px;">${address}</div>` : ''}
      ${phone   ? `<div style="font-size:10px;color:#555;">Tel: ${phone}</div>` : ''}
    </div>
    <div style="border-top:1px dashed #000;margin:6px 0;"></div>
    <div style="font-size:11px;margin-bottom:3px;font-weight:700;">Receipt: ${receiptNo}</div>
    <div style="font-size:11px;margin-bottom:3px;">Date: ${fmtDateTime(sale.sale_date)}</div>
    <div style="font-size:11px;margin-bottom:8px;">Cashier: ${cashierName || ''}</div>
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
    ${parseFloat(sale.change_amount) > 0 ? `
    <div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px;color:#555;">
      <span>Cash Tendered</span><span>${fmtCurrency(sale.amount_tendered)}</span>
    </div>
    <div style="display:flex;justify-content:space-between;font-size:11px;">
      <span>Change</span><span>${fmtCurrency(sale.change_amount)}</span>
    </div>` : ''}
    <div style="border-top:1px dashed #000;margin:10px 0;"></div>
    <div style="text-align:center;font-size:11px;color:#555;">Thank you for shopping with us!</div>
    <br><br>
  `;
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