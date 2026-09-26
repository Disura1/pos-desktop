import QRCode from 'qrcode';

const esc = (s) =>
  String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// items = [{ productName, sku, barcode, size, color, price, copies }]
export const printLabel = async (items) => {
  const expanded = items.flatMap((item) =>
    Array.from({ length: item.copies || 1 }, () => item)
  );

  const parts = await Promise.all(expanded.map(buildLabelBlock));
  const bodyHtml = parts.join('');

  // One 30×20mm page per label — printer handles gap feed between physical labels
  const heightMicrons = 20000;
  const widthMicrons = 30000;

  if (window.electronAPI?.printLabel) {
    window.electronAPI.printLabel(bodyHtml, widthMicrons, heightMicrons);
    return;
  }

  // Web fallback
  const win = window.open('', '_blank', 'width=400,height=600');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family:Arial,sans-serif; width:30mm; background:#fff; }
      @media print { body { -webkit-print-color-adjust:exact; } }
    </style>
  </head><body>${bodyHtml}<script>window.onload=()=>{window.print();window.close();}<\/script></body></html>`);
  win.document.close();
};

const buildLabelBlock = async (item) => {
  const barcodeVal = (item.barcode || item.sku || '').trim();
  let qrHtml = '<div style="width:14mm;height:14mm;background:#eee;"></div>';

  if (barcodeVal) {
    try {
      const dataUrl = await QRCode.toDataURL(barcodeVal, {
        margin: 1,
        width: 120,
        color: { dark: '#000000', light: '#ffffff' },
      });
      qrHtml = `<img src="${dataUrl}" style="width:14mm;height:14mm;display:block;" />`;
    } catch (e) {
      console.warn('QR generation failed:', barcodeVal, e);
    }
  }

  const price = parseFloat(item.price || 0).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
  });
  const sizeColor = [item.size || '', item.color || '']
    .filter(Boolean)
    .join(' · ');

  return `
    <div style="width:27mm;height:20mm;margin:0 1.5mm;overflow:hidden;
                box-sizing:border-box;display:flex;align-items:center;gap:1mm;
                page-break-after:always;">
      <div style="flex-shrink:0;">${qrHtml}</div>
      <div style="flex:1;min-width:0;overflow:hidden;">
        <div style="font-size:7px;font-weight:700;color:#111;line-height:1.2;
                    display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;
                    overflow:hidden;">${esc(item.productName)}</div>
        ${sizeColor ? `<div style="font-size:5.5px;color:#555;line-height:1.3;">${esc(sizeColor)}</div>` : ''}
        <div style="font-size:9.5px;font-weight:900;color:#111;line-height:1.3;">LKR ${esc(price)}</div>
        ${barcodeVal ? `<div style="font-size:5px;font-family:monospace;color:#777;line-height:1.2;
                    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(barcodeVal)}</div>` : ''}
      </div>
    </div>
  `;
};
