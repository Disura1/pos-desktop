// Shared label printing utility used by ReceiveStock and LabelPrinter
// items = [{ productName, sku, barcode, size, color, price, copies }]
// labelSize: 'small' | 'medium' | 'large'

export const printLabel = (items, labelSize = 'medium') => {
  const sizes = {
    small:  { w: 150, h: 100, nameFontSize: 9,  priceFontSize: 11, detailFontSize: 8  },
    medium: { w: 220, h: 150, nameFontSize: 11, priceFontSize: 14, detailFontSize: 10 },
    large:  { w: 378, h: 189, nameFontSize: 13, priceFontSize: 17, detailFontSize: 11 },
  };
  const s = sizes[labelSize] || sizes.medium;

  const labelHtml = items
    .flatMap((item) =>
      Array.from({ length: item.copies || 1 }).map((_, idx) => {
        // unique ID to avoid JsBarcode duplicate rendering
        const uid = `bc_${(item.barcode || item.sku || 'X').replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${idx}`;
        return `
          <div class="label" style="width:${s.w}px;min-height:${s.h}px">
            <div class="shop" style="font-size:${s.detailFontSize - 1}px">Teen Girl Boutique</div>
            <div class="name" style="font-size:${s.nameFontSize}px">${item.productName}</div>
            <div class="meta" style="font-size:${s.detailFontSize}px">
              ${item.size  ? `<span>Size: <strong>${item.size}</strong></span>`  : ''}
              ${item.color ? `<span>${item.color}</span>` : ''}
            </div>
            <div class="price" style="font-size:${s.priceFontSize}px">
              LKR ${parseFloat(item.price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>
            <svg class="bc" id="${uid}" data-barcode="${item.barcode || item.sku}"></svg>
            <div class="sku" style="font-size:${s.detailFontSize - 1}px">${item.barcode || item.sku}</div>
          </div>
        `;
      })
    )
    .join('');

  const win = window.open('', '_blank', 'width=900,height=650');
  win.document.write(`
    <!DOCTYPE html><html><head>
    <title>Print Labels — Teen Girl Boutique</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { font-family: Arial, sans-serif; background: #f5f5f5; }
      .toolbar {
        background: #fff; border-bottom: 1px solid #ddd;
        padding: 12px 20px; display: flex; gap: 12px; align-items: center;
      }
      .toolbar button {
        padding: 8px 20px; border: none; border-radius: 6px;
        cursor: pointer; font-size: 13px; font-weight: 600;
      }
      .print-btn { background: #e91e8c; color: #fff; }
      .close-btn { background: #eee; color: #333; }
      .count { font-size: 13px; color: #666; margin-left: auto; }
      .page { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px; background: #f5f5f5; }
      .label {
        background: #fff; border: 1.5px solid #ccc; border-radius: 6px;
        padding: 8px 10px; display: flex; flex-direction: column;
        align-items: center; justify-content: space-between;
        text-align: center; page-break-inside: avoid;
      }
      .shop  { color: #e91e8c; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px; }
      .name  { font-weight: 700; color: #111; margin: 3px 0; line-height: 1.2; word-break: break-word; max-width: 100%; }
      .meta  { color: #555; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; margin: 2px 0; }
      .price { font-weight: 900; color: #111; margin: 4px 0; }
      .bc    { width: 95%; height: 55px; margin: 4px 0 2px; }
      .sku   { font-family: monospace; color: #666; margin-top: 2px; }
      @media print {
        body { background: #fff; }
        .toolbar { display: none; }
        .page { padding: 4px; gap: 5px; background: #fff; }
      }
    </style>
    </head><body>
    <div class="toolbar">
      <button class="print-btn" onclick="window.print()">🖨 Print All Labels</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
      <span class="count">
        ${items.reduce((s, i) => s + (i.copies || 1), 0)} labels
      </span>
    </div>
    <div class="page">${labelHtml}</div>
    <script>
      window.onload = function() {
        document.querySelectorAll('.bc').forEach(function(el) {
          var val = el.getAttribute('data-barcode');
          if (!val || val.trim() === '') return;
          try {
            JsBarcode(el, val, {
              format: 'CODE128',
              displayValue: false,
              width: 1.6,
              height: 50,
              margin: 0
            });
          } catch(e) {
            el.style.display = 'none';
          }
        });
      };
    </script>
    </body></html>
  `);
  win.document.close();
};