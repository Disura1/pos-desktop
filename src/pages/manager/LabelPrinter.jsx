import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  searchProducts,
  scanProductByBarcode,
  getVariants,
} from "../../services/productService";
import { fmtCurrency } from "../../utils/formatters";

// ── Print engine ────────────────────────────────────────────────────────────
const printLabels = (items, labelSize) => {
  // labelSize: "small" (38x25mm), "medium" (58x40mm), "large" (100x50mm)
  const sizes = {
    small:  { w: 144, h: 96,  nameFontSize: 9,  priceFontSize: 11, detailFontSize: 8  },
    medium: { w: 220, h: 152, nameFontSize: 11, priceFontSize: 14, detailFontSize: 10 },
    large:  { w: 378, h: 189, nameFontSize: 13, priceFontSize: 17, detailFontSize: 11 },
  };
  const s = sizes[labelSize] || sizes.medium;

  const labelHtml = items
    .flatMap((item) =>
      Array.from({ length: item.copies }).map(
        () => `
        <div class="label" style="width:${s.w}px;height:${s.h}px">
          <div class="shop"  style="font-size:${s.detailFontSize - 1}px">Teen Girl Boutique</div>
          <div class="name"  style="font-size:${s.nameFontSize}px">${item.productName}</div>
          <div class="meta"  style="font-size:${s.detailFontSize}px">
            ${item.size  ? `<span>Size: ${item.size}</span>`  : ""}
            ${item.color ? `<span>${item.color}</span>` : ""}
          </div>
          <div class="price" style="font-size:${s.priceFontSize}px">
            LKR ${parseFloat(item.price || 0).toLocaleString("en-LK", { minimumFractionDigits: 2 })}
          </div>
          <svg class="bc" id="bc-${item.barcode}-${Math.random().toString(36).slice(2)}"></svg>
          <div class="sku"   style="font-size:${s.detailFontSize - 1}px">${item.barcode}</div>
        </div>
      `
      )
    )
    .join("");

  const win = window.open("", "_blank", "width=900,height=650");
  win.document.write(`
    <!DOCTYPE html><html><head>
    <title>Print Labels — Teen Girl</title>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;background:#f5f5f5}
      .toolbar{background:#fff;border-bottom:1px solid #ddd;padding:12px 20px;display:flex;gap:12px;align-items:center}
      .toolbar button{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600}
      .print-btn{background:#e91e8c;color:#fff}
      .close-btn{background:#eee;color:#333}
      .count{font-size:13px;color:#666;margin-left:auto}
      .page{display:flex;flex-wrap:wrap;gap:6px;padding:16px;background:#f5f5f5}
      .label{
        background:#fff;border:1px solid #ddd;border-radius:5px;
        padding:6px 8px;display:flex;flex-direction:column;
        align-items:center;justify-content:space-between;
        text-align:center;page-break-inside:avoid;overflow:hidden;
      }
      .shop {color:#e91e8c;font-weight:700;text-transform:uppercase;letter-spacing:.8px;margin-bottom:2px}
      .name {font-weight:700;color:#111;margin:2px 0;line-height:1.2;max-width:100%;word-break:break-word}
      .meta {color:#555;display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:1px 0}
      .price{font-weight:900;color:#111;margin:3px 0}
      .bc  {width:90%;max-height:45px;margin:3px 0}
      .sku {font-family:monospace;color:#555;margin-top:2px}
      @media print{
        body{background:#fff}
        .toolbar{display:none}
        .page{padding:4px;gap:4px;background:#fff}
      }
    </style>
    </head><body>
    <div class="toolbar">
      <button class="print-btn" onclick="window.print()">🖨 Print All Labels</button>
      <button class="close-btn" onclick="window.close()">✕ Close</button>
      <span class="count">
        ${items.reduce((s, i) => s + i.copies, 0)} labels · 
        ${items.length} variant(s)
      </span>
    </div>
    <div class="page">${labelHtml}</div>
    <script>
      window.onload = function() {
        document.querySelectorAll('.bc').forEach(function(el) {
          var val = el.id.replace(/^bc-/, '').replace(/-[a-z0-9]+$/, '');
          // Remove the random suffix we appended
          var parts = el.id.split('-');
          parts.pop(); // remove random
          val = parts.slice(1).join('-'); // remove "bc" prefix
          try {
            JsBarcode(el, val, {
              format:'CODE128', displayValue:false,
              width:1.4, height:38, margin:0
            });
          } catch(e) { el.style.display='none'; }
        });
      };
    </script>
    </body></html>
  `);
  win.document.close();
};

// ── Main component ──────────────────────────────────────────────────────────
const LabelPrinter = () => {
  const { user } = useAuth();
  const branchId = user?.branchId || null;

  // search / scan state
  const [mode, setMode]             = useState("search"); // "search" | "scan"
  const [query, setQuery]           = useState("");
  const [scanInput, setScanInput]   = useState("");
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState([]);
  const [searched, setSearched]     = useState(false);

  // product detail
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants]     = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // label queue
  const [queue, setQueue]           = useState([]); // [{ variantId, productName, sku, barcode, size, color, price, copies }]
  const [labelSize, setLabelSize]   = useState("medium");
  const [msg, setMsg]               = useState({ text: "", type: "success" });

  const scanRef   = useRef(null);
  const searchRef = useRef(null);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3500);
  };

  // ── Search ──
  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setResults([]);
    setSearched(false);
    setSelectedProduct(null);
    setVariants([]);
    try {
      const data = await searchProducts(q, branchId);
      // Group by product
      const grouped = {};
      (data || []).forEach((row) => {
        if (!grouped[row.product_id]) {
          grouped[row.product_id] = {
            product_id: row.product_id,
            name: row.name,
            base_price: row.base_price,
          };
        }
      });
      setResults(Object.values(grouped));
      setSearched(true);
      if (!data || data.length === 0) showMsg(`No products found for "${q}"`, "error");
    } catch (err) {
      showMsg("Search failed: " + err.message, "error");
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  // ── Scan ──
  const handleScan = async () => {
    const val = scanInput.trim();
    if (!val) return;
    try {
      const data = await scanProductByBarcode(val, branchId);
      // Add directly to queue
      addToQueue({
        variantId: data.variant_id,
        productName: data.name,
        sku: data.sku,
        barcode: data.barcode || data.sku,
        size: data.size,
        color: data.color,
        price: data.price || data.base_price,
      });
      setScanInput("");
      showMsg(`✅ "${data.name}" (${data.sku}) added to queue`);
      setTimeout(() => scanRef.current?.focus(), 100);
    } catch (err) {
      if (err.response?.status === 404) {
        showMsg(`Barcode "${val}" not found in system`, "error");
      } else {
        showMsg("Scan error: " + err.message, "error");
      }
      setScanInput("");
    }
  };

  // ── Open product to pick variants ──
  const openProduct = async (product) => {
    setSelectedProduct(product);
    setLoadingVariants(true);
    try {
      const v = await getVariants(product.product_id);
      setVariants(v || []);
    } catch (err) {
      showMsg("Could not load variants", "error");
    } finally {
      setLoadingVariants(false);
    }
  };

  // ── Queue management ──
  const addToQueue = (item) => {
    setQueue((prev) => {
      const exists = prev.find((q) => q.variantId === item.variantId);
      if (exists) {
        // Already in queue — increment copies
        return prev.map((q) =>
          q.variantId === item.variantId
            ? { ...q, copies: q.copies + 1 }
            : q
        );
      }
      return [...prev, { ...item, copies: 1 }];
    });
  };

  const addVariantToQueue = (variant, product) => {
    addToQueue({
      variantId: variant.id,
      productName: product.name,
      sku: variant.sku,
      barcode: variant.barcode || variant.sku,
      size: variant.size,
      color: variant.color,
      price: variant.variant_price || product.base_price,
    });
    showMsg(`"${variant.sku}" added to print queue`);
  };

  const addAllVariantsToQueue = (product) => {
    variants.forEach((v) => addVariantToQueue(v, product));
    showMsg(`All ${variants.length} variants of "${product.name}" added`);
  };

  const updateCopies = (variantId, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    if (n === 0) {
      setQueue((prev) => prev.filter((q) => q.variantId !== variantId));
    } else {
      setQueue((prev) =>
        prev.map((q) => (q.variantId === variantId ? { ...q, copies: n } : q))
      );
    }
  };

  const removeFromQueue = (variantId) => {
    setQueue((prev) => prev.filter((q) => q.variantId !== variantId));
  };

  const totalLabels = queue.reduce((s, q) => s + q.copies, 0);

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-content">
      {msg.text && (
        <div
          className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      )}

      <div className="grid-2" style={{ gap: 20, alignItems: "flex-start" }}>

        {/* ── LEFT: Find products ── */}
        <div>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: 0, marginBottom: 16, border: "1.5px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", width: "100%" }}>
            {[
              { key: "search", label: "🔍 Search" },
              { key: "scan",   label: "📷 Scan Barcode" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => {
                  setMode(m.key);
                  setResults([]); setSearched(false);
                  setQuery(""); setScanInput("");
                  setSelectedProduct(null); setVariants([]);
                  setTimeout(() => (m.key === "scan" ? scanRef : searchRef).current?.focus(), 100);
                }}
                style={{
                  flex: 1, padding: "9px 0", fontSize: 13, fontWeight: 600,
                  border: "none", cursor: "pointer",
                  background: mode === m.key ? "var(--pink)" : "var(--card)",
                  color: mode === m.key ? "#fff" : "var(--text-sub)",
                  transition: "all 0.15s",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          {mode === "search" && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={searchRef}
                  className="form-control"
                  placeholder="Product name, SKU or barcode..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  style={{ minWidth: 80 }}
                >
                  {searching
                    ? <span className="spinner" style={{ width: 14, height: 14 }} />
                    : "Search"
                  }
                </button>
              </div>

              {/* Search results */}
              {searched && results.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  {results.map((p) => (
                    <div
                      key={p.product_id}
                      onClick={() => openProduct(p)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${selectedProduct?.product_id === p.product_id ? "var(--pink)" : "var(--border)"}`,
                        background: selectedProduct?.product_id === p.product_id ? "var(--pink-light)" : "var(--card)",
                        marginBottom: 6, cursor: "pointer", transition: "all 0.12s",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                        Base: {fmtCurrency(p.base_price)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scan input */}
          {mode === "scan" && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={scanRef}
                  className="form-control"
                  style={{ fontFamily: "monospace", letterSpacing: 1 }}
                  placeholder="Scan barcode and press Enter..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleScan()}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleScan}
                  disabled={!scanInput.trim()}
                >
                  Add
                </button>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                💡 Scan a label — matching variant is added to the print queue
              </div>
            </div>
          )}

          {/* Variants of selected product */}
          {selectedProduct && (
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{selectedProduct.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Select variants to add to print queue
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => addAllVariantsToQueue(selectedProduct)}
                  disabled={loadingVariants || variants.length === 0}
                >
                  + Add All
                </button>
              </div>

              {loadingVariants ? (
                <div style={{ textAlign: "center", padding: 20 }}>
                  <span className="spinner" style={{ width: 20, height: 20 }} />
                </div>
              ) : variants.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-state-icon">⚙️</span>
                  <div className="empty-state-text">No variants for this product</div>
                </div>
              ) : (
                variants.map((v) => {
                  const inQueue = queue.find((q) => q.variantId === v.id);
                  return (
                    <div
                      key={v.id}
                      style={{
                        display: "flex", justifyContent: "space-between",
                        alignItems: "center", padding: "8px 10px",
                        borderRadius: "var(--radius-sm)",
                        border: `1.5px solid ${inQueue ? "var(--pink)" : "var(--border)"}`,
                        background: inQueue ? "var(--pink-light)" : "transparent",
                        marginBottom: 6, transition: "all 0.12s",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12, fontFamily: "monospace" }}>
                          {v.sku}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {v.size  ? `Size: ${v.size}`  : ""}
                          {v.color ? ` · ${v.color}` : ""}
                          {" · "}{fmtCurrency(v.variant_price || selectedProduct.base_price)}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          Barcode: {v.barcode || v.sku}
                        </div>
                      </div>
                      <div>
                        {inQueue ? (
                          <span style={{ fontSize: 11, color: "var(--pink)", fontWeight: 700 }}>
                            ✓ In queue ({inQueue.copies})
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => addVariantToQueue(v, selectedProduct)}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Print queue ── */}
        <div>
          <div className="card">
            {/* Queue header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>🖨 Print Queue</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  {queue.length} variant(s) · {totalLabels} label(s) total
                </div>
              </div>
              {queue.length > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setQueue([])}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Label size picker */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-sub)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Label Size
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { key: "small",  label: "Small",  sub: "38×25mm" },
                  { key: "medium", label: "Medium", sub: "58×40mm" },
                  { key: "large",  label: "Large",  sub: "100×50mm" },
                ].map((s) => (
                  <div
                    key={s.key}
                    onClick={() => setLabelSize(s.key)}
                    style={{
                      flex: 1, textAlign: "center", padding: "8px 6px",
                      border: `2px solid ${labelSize === s.key ? "var(--pink)" : "var(--border)"}`,
                      borderRadius: "var(--radius-sm)", cursor: "pointer",
                      background: labelSize === s.key ? "var(--pink-light)" : "var(--card)",
                      transition: "all 0.12s",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 12, color: labelSize === s.key ? "var(--pink-dark)" : "var(--text)" }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{s.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue items */}
            {queue.length === 0 ? (
              <div className="empty-state">
                <span className="empty-state-icon">🏷️</span>
                <div className="empty-state-text">
                  Add variants from the left panel to build your print queue
                </div>
              </div>
            ) : (
              <>
                <div style={{ maxHeight: 380, overflowY: "auto", marginBottom: 14 }}>
                  {queue.map((item) => (
                    <div
                      key={item.variantId}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {/* Label preview mini */}
                      <div style={{
                        minWidth: 52, height: 36,
                        border: "1px solid var(--border)",
                        borderRadius: 4, background: "#fff",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        padding: "2px 4px",
                      }}>
                        <div style={{ fontSize: 6, color: "#e91e8c", fontWeight: 700 }}>Teen Girl</div>
                        <div style={{ fontSize: 6, fontWeight: 700, textAlign: "center", lineHeight: 1.1, maxWidth: 50, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                          {item.productName}
                        </div>
                        <div style={{ fontSize: 7, fontWeight: 900 }}>
                          LKR {parseFloat(item.price || 0).toFixed(0)}
                        </div>
                        <div style={{ width: 44, height: 8, background: "repeating-linear-gradient(90deg,#000 0,#000 1px,#fff 1px,#fff 2px)", margin: "1px 0" }} />
                        <div style={{ fontSize: 5, fontFamily: "monospace", color: "#555" }}>
                          {(item.barcode || "").slice(0, 12)}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 12 }}>{item.productName}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>
                          {item.sku}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {item.size  ? `Size: ${item.size}`  : ""}
                          {item.color ? ` · ${item.color}` : ""}
                          {" · "}{fmtCurrency(item.price)}
                        </div>
                      </div>

                      {/* Copies input */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                        <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>Copies</div>
                        <input
                          type="number"
                          min="1"
                          value={item.copies}
                          onChange={(e) => updateCopies(item.variantId, e.target.value)}
                          style={{
                            width: 54, textAlign: "center", fontSize: 13, fontWeight: 700,
                            border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
                            padding: "3px 4px", background: "var(--input, var(--card))", color: "var(--text)",
                          }}
                        />
                      </div>

                      {/* Remove */}
                      <button
                        onClick={() => removeFromQueue(item.variantId)}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          color: "var(--text-muted)", fontSize: 16, padding: "0 4px",
                          lineHeight: 1,
                        }}
                        title="Remove from queue"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                {/* Summary & print button */}
                <div style={{ padding: "12px 14px", background: "var(--pink-light)", borderRadius: "var(--radius-sm)", marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: "var(--text-sub)" }}>Total variants:</span>
                    <strong>{queue.length}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                    <span style={{ color: "var(--text-sub)" }}>Total labels:</span>
                    <strong style={{ color: "var(--pink-dark)", fontSize: 15 }}>{totalLabels}</strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                    <span style={{ color: "var(--text-sub)" }}>Label size:</span>
                    <strong style={{ textTransform: "capitalize" }}>{labelSize}</strong>
                  </div>
                </div>

                <button
                  className="btn btn-primary btn-block btn-lg"
                  disabled={totalLabels === 0}
                  onClick={() => printLabels(queue, labelSize)}
                  style={{ width: "100%" }}
                >
                  🖨 Print {totalLabels} Label{totalLabels !== 1 ? "s" : ""}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabelPrinter;