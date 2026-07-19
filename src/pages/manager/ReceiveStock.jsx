import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getInventory,
  receiveStock,
  getMovements,
} from "../../services/stockService";
import {
  scanProductByBarcode,
  searchProducts,
  quickCreateProduct,
} from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import { fmtCurrency, fmtDateTime } from "../../utils/formatters";
import { printLabel } from '../../utils/printLabel';

// ── Non-blocking confirm dialog ────────────────────────────────────────────
const ConfirmDialog = ({
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  confirmClass = "btn-primary",
}) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 10000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <div
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "28px 32px",
        maxWidth: 420,
        width: "90%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 20,
          lineHeight: 1.6,
          whiteSpace: "pre-line",
        }}
      >
        {message}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className={`btn ${confirmClass}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

const LabelSizePicker = ({ value, onChange }) => (
  <div className="form-group">
    <label className="form-label">Label Size</label>
    <div style={{ display: "flex", gap: 6 }}>
      {[
        { key: "small", label: "Small", sub: "38×25mm" },
        { key: "medium", label: "Medium", sub: "58×40mm" },
        { key: "large", label: "Large", sub: "100×50mm" },
      ].map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => onChange(s.key)}
          style={{
            flex: 1,
            padding: "8px 6px",
            borderRadius: "var(--radius-sm)",
            border: `2px solid ${value === s.key ? "var(--pink)" : "var(--border)"}`,
            background: value === s.key ? "var(--pink-light)" : "var(--card)",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 11, color: value === s.key ? "var(--pink-dark)" : "var(--text)" }}>
            {s.label}
          </div>
          <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{s.sub}</div>
        </button>
      ))}
    </div>
  </div>
);

// ── SKU generator ──────────────────────────────────────────────────────────
const computeSKU = (productName, size, color, existingSkus = []) => {
  const productCode = (productName || "")
    .trim()
    .split(/[\s\-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 4);
  const sizeCode = (size || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 3);
  const colorCode = (color || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 3);
  const parts = [productCode, sizeCode, colorCode].filter(Boolean);
  if (!parts.length) return "";
  let base = parts.join("-");
  if (!existingSkus.includes(base)) return base;
  let n = 2;
  while (existingSkus.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

// ── Main component ─────────────────────────────────────────────────────────
const EMPTY_NEW_ITEM = {
  productName: "",
  categoryId: "",
  basePrice: "",
  size: "",
  color: "",
  barcode: "",
  skuAuto: true,
  sku: "",
  copies: 1,
};

const ReceiveStock = () => {
  const { user } = useAuth();
  const branchId = user?.branchId;

  // ── state ──
  const [mode, setMode] = useState("scan"); // "scan" | "search"
  const [scanInput, setScanInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [found, setFound] = useState(null); // matched variant from DB
  const [notFound, setNotFound] = useState(false); // barcode not in DB
  const [scannedBarcode, setScannedBarcode] = useState(""); // barcode that wasn't found

  const [showNewItemForm, setShowNewItemForm] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_NEW_ITEM);
  const [categories, setCategories] = useState([]);
  const [savingNew, setSavingNew] = useState(false);

  const [quantity, setQuantity] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [movements, setMovements] = useState([]);

  const [labelSize, setLabelSize] = useState("medium");

  const [unitCost, setUnitCost] = useState("");

  const scanRef = useRef(null);
  const searchRef = useRef(null);
  const qtyRef = useRef(null);

  // ── helpers ──
  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 4000);
  };
  const confirm = (
    message,
    confirmLabel = "Confirm",
    confirmClass = "btn-primary",
  ) =>
    new Promise((resolve) => {
      setConfirmDialog({
        message,
        confirmLabel,
        confirmClass,
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
      });
    });

  const loadMovements = () =>
    getMovements({ branchId, limit: 15 }).then((d) =>
      setMovements(d.filter((m) => m.movement_type === "receive")),
    );

  useEffect(() => {
    loadMovements();
    getCategories().then(setCategories);
  }, [branchId]);

  // ── Auto-SKU sync for new item form ──
  useEffect(() => {
    if (!newItem.skuAuto) return;
    const generated = computeSKU(
      newItem.productName,
      newItem.size,
      newItem.color,
      [],
    );
    setNewItem((prev) => ({ ...prev, sku: generated }));
  }, [newItem.skuAuto, newItem.productName, newItem.size, newItem.color]);

  // Auto-copy SKU to barcode when no barcode typed and skuAuto on
  useEffect(() => {
    if (!newItem.skuAuto) return;
    if (!newItem.barcode || newItem.barcode === "") {
      setNewItem((prev) => ({ ...prev, barcode: prev.sku }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newItem.sku]);

  // ── Scan handler ──
  const handleScan = async () => {
    const val = scanInput.trim();
    if (!val) return;
    setFound(null);
    setNotFound(false);
    setSearchResults([]);
    try {
      const data = await scanProductByBarcode(val, branchId);
      setFound(data);
      setScannedBarcode(val);
      setTimeout(() => qtyRef.current?.focus(), 100);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
        setScannedBarcode(val);
        // Pre-fill barcode in new item form
        setNewItem({ ...EMPTY_NEW_ITEM, barcode: val, skuAuto: false });
        showMsg(
          `Barcode "${val}" not found — fill in the new item details below`,
          "error",
        );
      } else {
        showMsg("Scan error: " + err.message, "error");
      }
    }
  };

  const handleScanKey = (e) => {
    if (e.key === "Enter") handleScan();
  };

  // ── Search handler ──
  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) return;
    setSearching(true);
    setFound(null);
    setNotFound(false);
    try {
      const data = await searchProducts(q, branchId);
      setSearchResults(data || []);
      if (!data || data.length === 0) {
        showMsg(`No results for "${q}"`, "error");
      }
    } catch (err) {
      showMsg("Search failed: " + err.message, "error");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKey = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const selectSearchResult = (row) => {
    setFound({
      product_id: row.product_id,
      name: row.name,
      base_price: row.base_price,
      variant_id: row.variant_id,
      sku: row.sku,
      size: row.size,
      color: row.color,
      barcode: row.barcode,
      price: row.price,
      stock_qty: row.stock_qty,
    });
    setSearchResults([]);
    setTimeout(() => qtyRef.current?.focus(), 100);
  };

  // ── Receive stock ──
  const handleReceive = async () => {
    if (!found || !quantity || parseInt(quantity) <= 0) return;
    setSaving(true);
    try {
      await receiveStock({
        variant_id: found.variant_id,
        branch_id: branchId,
        quantity: parseInt(quantity),
        unit_cost: unitCost || null,
        note: note || "Stock received",
      });
      showMsg(`✅ Received ${quantity} units of ${found.sku}`);

      // Ask about printing labels
      const wantPrint = await confirm(
        `Stock received!\n\nDo you want to print labels for "${found.name}" (${found.sku})?`,
        "Yes, Print Labels",
        "btn-primary",
      );
      if (wantPrint) {
        const copies = parseInt(quantity);
        printLabel(
          [
            {
              productName: found.name,
              sku: found.sku,
              barcode: found.barcode || found.sku,
              size: found.size,
              color: found.color,
              price: found.price || found.base_price,
              copies,
            },
          ],
          labelSize,
        );
      }

      // Reset
      setFound(null);
      setNotFound(false);
      setScanInput("");
      setSearchInput("");
      setQuantity("");
      setUnitCost("");
      setNote("");
      setSearchResults([]);
      loadMovements();
      if (mode === "scan") setTimeout(() => scanRef.current?.focus(), 100);
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed to receive stock", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Save new item ──
  const handleSaveNewItem = async () => {
    if (
      !newItem.productName ||
      !newItem.basePrice ||
      !newItem.categoryId ||
      !newItem.sku
    ) {
      showMsg("Product name, category, price and SKU are required", "error");
      return;
    }
    if (!newItem.barcode) {
      showMsg("Barcode is required", "error");
      return;
    }
    if (parseFloat(newItem.basePrice) <= 0) {
      showMsg("Base price must be greater than 0", "error");
      return;
    }
    if (!quantity || parseInt(quantity) < 0) {
      showMsg("Please enter a quantity to receive (0 or more)", "error");
      return;
    }
    setSavingNew(true);
    try {
      // Product, variant, and initial stock are all created together in one
      // atomic backend transaction — if anything fails (e.g. duplicate SKU),
      // nothing gets saved at all, so there's no orphaned product left behind.
      await quickCreateProduct({
        name: newItem.productName,
        base_price: parseFloat(newItem.basePrice),
        category_id: parseInt(newItem.categoryId),
        description: "",
        sku: newItem.sku,
        size: newItem.size || null,
        color: newItem.color || null,
        barcode: newItem.barcode,
        variant_price: null,
        branch_id: branchId,
        quantity: parseInt(quantity) || 0,
        unit_cost: unitCost || null,
        note: note || "Initial stock receive",
      });

      showMsg(`✅ "${newItem.productName}" added and stock received!`);

      // Ask about printing labels
      const wantPrint = await confirm(
        `"${newItem.productName}" saved!\n\nPrint labels now?`,
        "Yes, Print Labels",
        "btn-primary",
      );
      if (wantPrint) {
        printLabel(
          [
            {
              productName: newItem.productName,
              sku: newItem.sku,
              barcode: newItem.barcode,
              size: newItem.size,
              color: newItem.color,
              price: newItem.basePrice,
              copies: parseInt(quantity) || 1,
            },
          ],
          labelSize,
        );
      }

      // Reset everything
      setShowNewItemForm(false);
      setNewItem(EMPTY_NEW_ITEM);
      setNotFound(false);
      setScanInput("");
      setSearchInput("");
      setQuantity("");
      setUnitCost("");
      setNote("");
      loadMovements();
      if (mode === "scan") setTimeout(() => scanRef.current?.focus(), 100);
    } catch (err) {
      showMsg(err.response?.data?.error || "Error saving new item", "error");
    } finally {
      setSavingNew(false);
    }
  };

  // ── Flat search result grouping ──
  const groupedSearch = searchResults.reduce((acc, row) => {
    const key = row.variant_id;
    if (!acc[key]) acc[key] = row;
    return acc;
  }, {});
  const searchList = Object.values(groupedSearch);

  // ── Leaf categories only (for product creation) ──
  const leafCategories = categories.filter(
    (c) => !categories.some((x) => x.parent_id === c.id),
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="page-content">
      {confirmDialog && <ConfirmDialog {...confirmDialog} />}

      {/* Messages */}
      {msg.text && (
        <div
          className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      )}

      {/* ── Mode Toggle ── */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 20,
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius)",
          overflow: "hidden",
          width: "fit-content",
        }}
      >
        {[
          { key: "scan", label: "📷 Scan Barcode" },
          { key: "search", label: "🔍 Search by Name / SKU" },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => {
              setMode(m.key);
              setFound(null);
              setNotFound(false);
              setScanInput("");
              setSearchInput("");
              setSearchResults([]);
              setTimeout(
                () => (m.key === "scan" ? scanRef : searchRef).current?.focus(),
                100,
              );
            }}
            style={{
              padding: "9px 22px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: mode === m.key ? "var(--pink)" : "var(--card)",
              color: mode === m.key ? "#fff" : "var(--text-sub)",
              transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: "flex-start" }}>
        {/* ── LEFT: Input panel ── */}
        <div>
          {/* Scan mode */}
          {mode === "scan" && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>
                Scan Barcode
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={scanRef}
                  className="form-control"
                  style={{ flex: 1, fontSize: 15, letterSpacing: 1 }}
                  placeholder="Scan or type barcode and press Enter..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScanKey}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleScan}
                  disabled={!scanInput.trim()}
                >
                  Go
                </button>
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 6,
                }}
              >
                💡 Click this field and scan — the scanner acts like a keyboard
              </div>
            </div>
          )}

          {/* Search mode */}
          {mode === "search" && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 12 }}>
                Search Product
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={searchRef}
                  className="form-control"
                  style={{ flex: 1 }}
                  placeholder="Product name, SKU or barcode..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKey}
                  autoFocus
                />
                <button
                  className="btn btn-primary"
                  onClick={handleSearch}
                  disabled={searching || !searchInput.trim()}
                >
                  {searching ? (
                    <span
                      className="spinner"
                      style={{ width: 14, height: 14 }}
                    />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>

              {/* Search results */}
              {searchList.length > 0 && (
                <div
                  style={{ marginTop: 10, maxHeight: 320, overflowY: "auto" }}
                >
                  {searchList.map((row) => (
                    <div
                      key={row.variant_id}
                      onClick={() => selectSearchResult(row)}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        border: "1.5px solid var(--border)",
                        marginBottom: 6,
                        cursor: "pointer",
                        background: "var(--card)",
                        transition: "all 0.12s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "var(--pink)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = "var(--border)")
                      }
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {row.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        SKU: <strong>{row.sku}</strong>
                        {row.size ? ` · Size: ${row.size}` : ""}
                        {row.color ? ` · ${row.color}` : ""}
                        {row.barcode ? ` · Barcode: ${row.barcode}` : ""}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 3 }}>
                        This branch:{" "}
                        <strong
                          style={{
                            color:
                              row.stock_qty === 0
                                ? "var(--danger)"
                                : "var(--success)",
                          }}
                        >
                          {row.stock_qty}
                        </strong>
                        <span style={{ color: "var(--text-muted)", marginLeft: 10 }}>
                          All branches: <strong>{row.total_stock || 0}</strong>
                        </span>
                        <span
                          style={{ color: "var(--text-muted)", marginLeft: 10 }}
                        >
                          {fmtCurrency(row.price)}
                        </span>
                      </div>
                      {!row.is_active_here && (
                        <div style={{ fontSize: 11, color: "var(--pink)", marginTop: 3, fontWeight: 600 }}>
                          ℹ️ Not yet stocked at this branch — receiving will activate it here
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Not found — new item form ── */}
          {(notFound || showNewItemForm) && !found && (
            <div
              className="card"
              style={{ border: "2px solid var(--pink)", marginBottom: 16 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div
                  className="card-title"
                  style={{ margin: 0, color: "var(--pink)" }}
                >
                  ➕ New Item — Fill Details
                </div>
                {notFound && (
                  <span
                    style={{
                      fontSize: 11,
                      background: "var(--danger-bg, rgba(229,57,53,0.08))",
                      color: "var(--danger, #e53935)",
                      padding: "2px 10px",
                      borderRadius: 10,
                      fontWeight: 700,
                    }}
                  >
                    Not Found
                  </span>
                )}
              </div>

              {msg.text && (
                <div
                  className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
                  style={{ marginBottom: 14 }}
                >
                  {msg.text}
                </div>
              )}

              {/* Product name & category */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Product Name *</label>
                  <input
                    className="form-control"
                    value={newItem.productName}
                    onChange={(e) =>
                      setNewItem({ ...newItem, productName: e.target.value })
                    }
                    placeholder="e.g. Floral Silk Dress"
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="form-control"
                    value={newItem.categoryId}
                    onChange={(e) =>
                      setNewItem({ ...newItem, categoryId: e.target.value })
                    }
                  >
                    <option value="">Select category</option>
                    {leafCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Size & Color */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Size</label>
                  <input
                    className="form-control"
                    value={newItem.size}
                    onChange={(e) =>
                      setNewItem({ ...newItem, size: e.target.value })
                    }
                    placeholder="XS / S / M / L / XL"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input
                    className="form-control"
                    value={newItem.color}
                    onChange={(e) =>
                      setNewItem({ ...newItem, color: e.target.value })
                    }
                    placeholder="Red / Blue / Black..."
                  />
                </div>
              </div>

              {/* Price */}
              <div className="form-group">
                <label className="form-label">Base Price (LKR) *</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  value={newItem.basePrice}
                  onChange={(e) =>
                    setNewItem({ ...newItem, basePrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>

              {/* SKU */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>SKU *</span>
                  <span style={{ display: "flex", gap: 6 }}>
                    {newItem.skuAuto ? (
                      <span
                        style={{
                          fontSize: 10,
                          background: "var(--success-bg)",
                          color: "var(--success)",
                          padding: "1px 8px",
                          borderRadius: 10,
                          fontWeight: 700,
                        }}
                      >
                        AUTO
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 10,
                          background: "var(--border)",
                          color: "var(--text-sub)",
                          padding: "1px 8px",
                          borderRadius: 10,
                          fontWeight: 700,
                        }}
                      >
                        MANUAL
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, skuAuto: true })}
                      style={{
                        fontSize: 10,
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        cursor: "pointer",
                        color: "var(--text-sub)",
                      }}
                    >
                      🔄 Auto
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewItem({ ...newItem, skuAuto: false })}
                      style={{
                        fontSize: 10,
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        cursor: "pointer",
                        color: "var(--text-sub)",
                      }}
                    >
                      ✏️ Manual
                    </button>
                  </span>
                </label>
                <input
                  className="form-control"
                  style={{ fontFamily: "monospace" }}
                  value={newItem.sku}
                  readOnly={newItem.skuAuto}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      sku: e.target.value,
                      skuAuto: false,
                    })
                  }
                  placeholder={
                    newItem.skuAuto
                      ? "Auto from name+size+color"
                      : "Type SKU manually"
                  }
                />
              </div>

              {/* Barcode */}
              <div className="form-group">
                <label
                  className="form-label"
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>Barcode *</span>
                  {!scannedBarcode && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      Scan item or leave to use SKU
                    </span>
                  )}
                </label>
                <input
                  className="form-control"
                  style={{ fontFamily: "monospace" }}
                  value={newItem.barcode}
                  onChange={(e) =>
                    setNewItem({ ...newItem, barcode: e.target.value })
                  }
                  placeholder="Scan barcode or auto-filled from SKU"
                />
                {newItem.sku && newItem.barcode !== newItem.sku && (
                  <button
                    type="button"
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--pink)",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                    onClick={() =>
                      setNewItem({ ...newItem, barcode: newItem.sku })
                    }
                  >
                    Use SKU as barcode ({newItem.sku})
                  </button>
                )}
              </div>

              {/* Quantity to receive */}
              <div className="form-group">
                <label className="form-label">Quantity to Receive *</label>
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="How many units are you receiving now"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Unit Cost (optional)</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  placeholder="What did you pay per unit for this batch?"
                />
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Used to calculate profit reports. Leave blank if unknown.
                </div>
              </div>

              {/* Label copies */}
              <div className="form-group">
                <label className="form-label">Label Copies to Print</label>
                <input
                  className="form-control"
                  type="number"
                  min="0"
                  value={newItem.copies}
                  onChange={(e) =>
                    setNewItem({ ...newItem, copies: e.target.value })
                  }
                  placeholder="How many labels to print"
                />
              </div>

              <LabelSizePicker value={labelSize} onChange={setLabelSize} />

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewItemForm(false);
                    setNotFound(false);
                    setNewItem(EMPTY_NEW_ITEM);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={handleSaveNewItem}
                  disabled={savingNew}
                >
                  {savingNew ? (
                    <>
                      <span
                        className="spinner"
                        style={{ width: 14, height: 14 }}
                      />{" "}
                      Saving...
                    </>
                  ) : (
                    "💾 Save & Receive Stock"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Add new item manually (search mode — not found) */}
          {mode === "search" && !found && !showNewItemForm && !notFound && (
            <button
              className="btn btn-outline"
              style={{ width: "100%", marginBottom: 12 }}
              onClick={() => {
                setShowNewItemForm(true);
                setNewItem(EMPTY_NEW_ITEM);
              }}
            >
              ➕ Item not in system? Add New Item
            </button>
          )}
        </div>

        {/* ── RIGHT: Quantity & receive panel ── */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              Receive Stock
            </div>

            {found ? (
              <>
                {/* Found item details */}
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--pink-light)",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      color: "var(--pink-dark)",
                      fontSize: 14,
                    }}
                  >
                    {found.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--pink-dark)",
                      marginTop: 2,
                    }}
                  >
                    <span style={{ fontFamily: "monospace" }}>{found.sku}</span>
                    {found.size ? ` · Size: ${found.size}` : ""}
                    {found.color ? ` · ${found.color}` : ""}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Current Stock:{" "}
                    <strong
                      style={{
                        color:
                          found.stock_qty === 0
                            ? "var(--danger)"
                            : "var(--success)",
                      }}
                    >
                      {found.stock_qty}
                    </strong>
                    <span
                      style={{ color: "var(--text-muted)", marginLeft: 10 }}
                    >
                      {fmtCurrency(found.price || found.base_price)}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity Received *</label>
                  <input
                    ref={qtyRef}
                    className="form-control"
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    onKeyDown={(e) => e.key === "Enter" && handleReceive()}
                  />
                  {quantity && parseInt(quantity) > 0 && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--success)",
                        marginTop: 4,
                      }}
                    >
                      New total: {(found.stock_qty || 0) + parseInt(quantity)}{" "}
                      units
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Unit Cost (optional)</label>
                  <input
                    className="form-control"
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    placeholder="What did you pay per unit for this batch?"
                  />
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    Used to calculate profit reports. Leave blank if unknown.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <input
                    className="form-control"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Supplier delivery ref #1234"
                  />
                </div>

                <LabelSizePicker value={labelSize} onChange={setLabelSize} />

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setFound(null);
                      setQuantity("");
                      setNote("");
                    }}
                  >
                    ✕ Clear
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    onClick={handleReceive}
                    disabled={saving || !quantity || parseInt(quantity) <= 0}
                  >
                    {saving ? (
                      <>
                        <span
                          className="spinner"
                          style={{ width: 14, height: 14 }}
                        />{" "}
                        Receiving...
                      </>
                    ) : (
                      `📥 Receive ${quantity || 0} Units`
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">
                  {mode === "scan" ? "📷" : "🔍"}
                </span>
                <div className="empty-state-text">
                  {mode === "scan"
                    ? "Scan a barcode to find the product"
                    : "Search and select a product to receive stock"}
                </div>
              </div>
            )}
          </div>

          {/* Recent Receives */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>
              Recent Receives
            </div>
            {movements.length === 0 ? (
              <div
                style={{
                  color: "var(--text-muted)",
                  fontSize: 13,
                  textAlign: "center",
                  padding: 16,
                }}
              >
                No recent receives
              </div>
            ) : (
              movements.slice(0, 10).map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {m.product_name}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {m.sku}
                      {m.size ? ` · ${m.size}` : ""}
                      {m.color ? ` · ${m.color}` : ""} ·{" "}
                      {fmtDateTime(m.created_at)}
                    </div>
                  </div>
                  <span className="badge badge-success">+{m.quantity}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveStock;
