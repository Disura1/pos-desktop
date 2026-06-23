// Shared label printing utility — works offline in Electron (no CDN)
// items = [{ productName, sku, barcode, size, color, price, copies }]
// labelSize: 'small' | 'medium' | 'large'

export const printLabel = (items, labelSize = 'medium') => {
  const sizes = {
    small:  { w: 150, nameFontSize: 9,  priceFontSize: 11, detailFontSize: 8  },
    medium: { w: 220, nameFontSize: 11, priceFontSize: 14, detailFontSize: 10 },
    large:  { w: 340, nameFontSize: 13, priceFontSize: 17, detailFontSize: 11 },
  };
  const s = sizes[labelSize] || sizes.medium;

  const labelHtml = items
    .flatMap((item) =>
      Array.from({ length: item.copies || 1 }).map((_, idx) => {
        const uid = `bc_${idx}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const barcodeVal = (item.barcode || item.sku || '').trim();
        return `
          <div class="label" style="width:${s.w}px">
            <div class="shop" style="font-size:${s.detailFontSize - 1}px">TEEN GIRL BOUTIQUE</div>
            <div class="name" style="font-size:${s.nameFontSize}px">${item.productName}</div>
            <div class="meta" style="font-size:${s.detailFontSize}px">
              ${item.size  ? `<span>Size: <strong>${item.size}</strong></span>` : ''}
              ${item.color ? `<span>${item.color}</span>` : ''}
            </div>
            <div class="price" style="font-size:${s.priceFontSize}px">
              LKR ${parseFloat(item.price || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
            </div>
            <canvas class="bc" id="${uid}" data-val="${barcodeVal}"></canvas>
            <div class="sku" style="font-size:${s.detailFontSize - 1}px">${barcodeVal}</div>
          </div>
        `;
      })
    )
    .join('');

  const win = window.open('', '_blank', 'width=900,height=650');
  win.document.write(`<!DOCTYPE html><html><head>
    <title>Print Labels — Teen Girl Boutique</title>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;background:#f5f5f5}
      .toolbar{background:#fff;border-bottom:1px solid #ddd;padding:12px 20px;display:flex;gap:12px;align-items:center}
      .toolbar button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
      .print-btn{background:#e91e8c;color:#fff}
      .close-btn{background:#eee;color:#333}
      .count{font-size:13px;color:#666;margin-left:auto}
      .page{display:flex;flex-wrap:wrap;gap:10px;padding:16px;background:#f5f5f5}
      .label{
        background:#fff;border:1.5px solid #ccc;border-radius:6px;
        padding:10px 10px 8px;display:flex;flex-direction:column;
        align-items:center;text-align:center;page-break-inside:avoid;gap:2px;
      }
      .shop{color:#e91e8c;font-weight:800;text-transform:uppercase;letter-spacing:.8px}
      .name{font-weight:700;color:#111;line-height:1.2;word-break:break-word;max-width:100%}
      .meta{color:#555;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
      .price{font-weight:900;color:#111;margin:3px 0}
      .bc{display:block;max-width:100%;height:48px}
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
    <script>
    // Minimal CODE128 barcode renderer using Canvas — no CDN needed
    (function() {
      // CODE128B character set
      var C128 = {
        START_B: 104,
        STOP: 106,
        chars: ' !"#$%&\\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~'
      };
      var PATTERNS = [
        '11011001100','11001101100','11001100110','10010011000','10010001100',
        '10001001100','10011001000','10011000100','10001100100','11001001000',
        '11001000100','11000100100','10110011100','10011011100','10011001110',
        '10111001100','10011101100','10011100110','11001110010','11001011100',
        '11001001110','11011100100','11001110100','11101101110','11101001100',
        '11100101100','11100100110','11101100100','11100110100','11100110010',
        '11011011000','11011000110','11000110110','10100011000','10001011000',
        '10001000110','10110001000','10001101000','10001100010','11010001000',
        '11000101000','11000100010','10110111000','10110001110','10001101110',
        '10111011000','10111000110','10001110110','11101110110','11010001110',
        '11000101110','11011101000','11011100010','11011101110','11101011000',
        '11101000110','11100010110','11101101000','11101100010','11100011010',
        '11101111010','11001000010','11110001010','10100110000','10100001100',
        '10010110000','10010000110','10000101100','10000100110','10110010000',
        '10110000100','10011010000','10011000010','10000110100','10000110010',
        '11000010010','11001010000','11110111010','11000010100','10001111010',
        '10100111100','10010111100','10010011110','10111100100','10011110100',
        '10011110010','11110100100','11110010100','11110010010','11011011110',
        '11011110110','11110110110','10101111000','10100011110','10001011110',
        '10111101000','10111100010','11110101000','11110100010','10111011110',
        '10111101110','11101011110','11110101110','11010000100','11010010000',
        '11010011100','1100011101011'
      ];

      function encode(text) {
        var bars = [];
        var checksum = C128.START_B;
        bars.push(PATTERNS[C128.START_B]);
        for (var i = 0; i < text.length; i++) {
          var idx = C128.chars.indexOf(text[i]);
          if (idx === -1) idx = 0;
          checksum += (i + 1) * idx;
          bars.push(PATTERNS[idx]);
        }
        bars.push(PATTERNS[checksum % 103]);
        bars.push(PATTERNS[C128.STOP]);
        return bars.join('');
      }

      function draw(canvas, text) {
        if (!text || !canvas) return;
        var encoded = encode(text);
        var barW = Math.max(1, Math.floor(canvas.offsetWidth / encoded.length));
        var w = encoded.length * barW;
        var h = canvas.height || 48;
        canvas.width = w;
        canvas.style.width = w + 'px';
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#000';
        var x = 0;
        for (var j = 0; j < encoded.length; j++) {
          if (encoded[j] === '1') ctx.fillRect(x, 0, barW, h);
          x += barW;
        }
      }

      document.querySelectorAll('canvas.bc').forEach(function(el) {
        var val = el.getAttribute('data-val');
        if (val) draw(el, val);
      });
    })();
    </script>
  </body></html>`);
  win.document.close();
};