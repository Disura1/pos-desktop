import JsBarcode from "jsbarcode";

// items = [{ productName, sku, barcode, size, color, price, copies }]
// labelSize: 'small' | 'medium' | 'large'
export const printLabel = (items, labelSize = "medium") => {
  const sizes = {
    small: { w: 150, nameFontSize: 9, priceFontSize: 11, detailFontSize: 8 },
    medium: { w: 220, nameFontSize: 11, priceFontSize: 14, detailFontSize: 10 },
    large: { w: 340, nameFontSize: 13, priceFontSize: 17, detailFontSize: 11 },
  };
  const s = sizes[labelSize] || sizes.medium;

  // Build one canvas per label copy, render barcode, get PNG data URL
  const buildLabel = (item, idx) => {
    const barcodeVal = (item.barcode || item.sku || "").trim();
    let barcodeDataUrl = "";
    if (barcodeVal) {
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, barcodeVal, {
          format: "CODE128",
          displayValue: false,
          width: 2,
          height: 50,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
        barcodeDataUrl = canvas.toDataURL("image/png");
      } catch (e) {
        console.warn("JsBarcode failed for:", barcodeVal, e);
      }
    }

    return `
      <div class="label" style="width:${s.w}px">
        <div class="shop" style="font-size:${s.detailFontSize - 1}px">TEEN GIRL</div>
        <div class="name" style="font-size:${s.nameFontSize}px">${item.productName}</div>
        <div class="meta" style="font-size:${s.detailFontSize}px">
          ${item.size ? `<span>Size: <strong>${item.size}</strong></span>` : ""}
          ${item.color ? `<span>${item.color}</span>` : ""}
        </div>
        <div class="price" style="font-size:${s.priceFontSize}px">
          LKR ${parseFloat(item.price || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
        </div>
        ${
          barcodeDataUrl
            ? `<img class="bc" src="${barcodeDataUrl}" alt="barcode" />`
            : `<div class="bc-missing">No barcode</div>`
        }
        <div class="sku" style="font-size:${s.detailFontSize - 1}px">${barcodeVal}</div>
      </div>
    `;
  };

  const labelHtml = items
    .flatMap((item) =>
      Array.from({ length: item.copies || 1 }).map((_, idx) =>
        buildLabel(item, idx),
      ),
    )
    .join("");

  const win = window.open("", "_blank", "width=900,height=650");
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Print Labels — Teen Girl</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;background:#f5f5f5}
      .toolbar{
        background:#fff;border-bottom:1px solid #ddd;
        padding:12px 20px;display:flex;gap:12px;align-items:center;
      }
      .toolbar button{
        padding:8px 20px;border:none;border-radius:6px;
        cursor:pointer;font-size:13px;font-weight:600;
      }
      .print-btn{background:#e91e8c;color:#fff}
      .close-btn{background:#eee;color:#333}
      .count{font-size:13px;color:#666;margin-left:auto}
      .page{display:flex;flex-wrap:wrap;gap:10px;padding:16px;background:#f5f5f5}
      .label{
        background:#fff;border:1.5px solid #ccc;border-radius:6px;
        padding:10px 10px 8px;display:flex;flex-direction:column;
        align-items:center;text-align:center;page-break-inside:avoid;gap:3px;
      }
      .shop{color:#e91e8c;font-weight:800;text-transform:uppercase;letter-spacing:.8px}
      .name{font-weight:700;color:#111;line-height:1.2;word-break:break-word;max-width:100%}
      .meta{color:#555;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
      .price{font-weight:900;color:#111;margin:3px 0}
      .bc{max-width:100%;height:52px;display:block}
      .bc-missing{font-size:10px;color:#aaa;height:52px;line-height:52px}
      .sku{font-family:monospace;color:#666;font-size:9px}
      @media print{
        body{background:#fff}
        .toolbar{display:none}
        .page{padding:4px;gap:6px;background:#fff}
      }
    </style>
  </head><body>
    <div class="toolbar">
      <button class="print-btn" onclick="window.print()">🖨 Print All Labels</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
      <span class="count">${items.reduce((s, i) => s + (i.copies || 1), 0)} label(s)</span>
    </div>
    <div class="page">${labelHtml}</div>
  </body></html>`);
  win.document.close();
};
