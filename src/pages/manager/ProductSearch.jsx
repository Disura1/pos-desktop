import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  searchProducts,
  getVariants,
  updateProduct,
  updateVariant,
} from "../../services/productService";
import { fmtCurrency } from "../../utils/formatters";

// ── SKU generator (same as CategoryManager) ───────────────────────────────
const computeSKU = (productName, size, color, existingSkus = []) => {
  const productCode = (productName || "")
    .trim().split(/[\s\-]+/).filter(Boolean)
    .map((w) => w[0]?.toUpperCase() || "").join("").slice(0, 4);
  const sizeCode  = (size  || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 3);
  const colorCode = (color || "").trim().toUpperCase().replace(/\s+/g, "").slice(0, 3);
  const parts = [productCode, sizeCode, colorCode].filter(Boolean);
  if (!parts.length) return "";
  let base = parts.join("-");
  if (!existingSkus.includes(base)) return base;
  let n = 2;
  while (existingSkus.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

// ── Edit Product Modal — standalone component (NOT inside ProductSearch) ──
const EditProductModal = ({ data, onClose, onSave, saving }) => {
  const [form, setForm] = useState(data);
  useEffect(() => { setForm(data); }, [data]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-title">✏️ Edit Product</div>
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input
            className="form-control"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </div>
        <div className="form-group">
          <label className="form-label">Base Price (LKR) *</label>
          <input
            className="form-control"
            type="number"
            step="0.01"
            value={form.base_price}
            onChange={(e) => setForm({ ...form, base_price: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-control"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? <span className="spinner" /> : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Edit Variant Modal — standalone component (NOT inside ProductSearch) ──
const EditVariantModal = ({ data, productName, otherSkus, onClose, onSave, saving }) => {
  const [form, setForm] = useState(data);
  useEffect(() => { setForm(data); }, [data]);

  // Auto-generate SKU from size+color whenever they change
  // Manager can also type directly in the SKU field to override
  const [skuManual, setSkuManual] = useState(false);

  useEffect(() => {
    if (skuManual) return;
    const generated = computeSKU(productName, form.size, form.color, otherSkus);
    if (generated) setForm((prev) => ({ ...prev, sku: generated }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.size, form.color, skuManual]);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-title">✏️ Edit Variant</div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Size</label>
            <input
              className="form-control"
              value={form.size || ""}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              placeholder="XS / S / M / L / XL"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <input
              className="form-control"
              value={form.color || ""}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="Black / Red / Blue..."
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>SKU *</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {skuManual ? "Manual — editing freely" : "Auto from size & color"}
            </span>
          </label>
          <input
            className="form-control"
            style={{ fontFamily: "monospace" }}
            value={form.sku}
            onChange={(e) => {
              setSkuManual(true);
              setForm({ ...form, sku: e.target.value });
            }}
            placeholder="Auto-generated from size + color"
          />
          {skuManual && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 6, fontSize: 11 }}
              onClick={() => setSkuManual(false)}
            >
              🔄 Switch back to auto
            </button>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Barcode *</span>
            {form.sku && form.barcode !== form.sku && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 11 }}
                onClick={() => setForm({ ...form, barcode: form.sku })}
              >
                🔄 Use SKU as barcode
              </button>
            )}
          </label>
          <input
            className="form-control"
            style={{ fontFamily: "monospace" }}
            value={form.barcode || ""}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="Scan or type barcode"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Variant Price (leave blank to use base price)</label>
          <input
            className="form-control"
            type="number"
            step="0.01"
            value={form.variant_price || ""}
            onChange={(e) => setForm({ ...form, variant_price: e.target.value })}
            placeholder="Optional override"
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
            {saving ? <span className="spinner" /> : "Save Variant"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────
const ProductSearch = () => {
  const { user } = useAuth();
  const branchId = user?.branchId || null;
  const canEdit = user?.role === "Manager";

  const [query, setQuery]               = useState("");
  const [results, setResults]           = useState([]);
  const [searched, setSearched]         = useState(false);
  const [searching, setSearching]       = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants]         = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [msg, setMsg]                   = useState({ text: "", type: "success" });

  // Edit modals — null = closed, object = open with that data
  const [editProductData, setEditProductData]   = useState(null);
  const [editProductSaving, setEditProductSaving] = useState(false);
  const [editVariantData, setEditVariantData]   = useState(null);
  const [editVariantSaving, setEditVariantSaving] = useState(false);

  const inputRef = useRef(null);

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3500);
  };

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
      setResults(data || []);
      setSearched(true);
      if (!data || data.length === 0) {
        showMsg(`No products found for "${q}"`, "error");
      }
    } catch (err) {
      showMsg("Search failed: " + (err.response?.data?.error || err.message), "error");
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSaveProduct = async (form) => {
    if (!form?.name?.trim() || !form?.base_price) {
      showMsg("Product name and base price are required", "error"); return;
    }
    setEditProductSaving(true);
    try {
      await updateProduct(form.product_id, {
        name: form.name,
        base_price: parseFloat(form.base_price),
        description: form.description || "",
      });
      setResults((prev) =>
        prev.map((r) =>
          r.product_id === form.product_id
            ? { ...r, name: form.name, base_price: form.base_price, description: form.description || "" }
            : r,
        ),
      );
      if (selectedProduct?.product_id === form.product_id) {
        setSelectedProduct((prev) => ({ ...prev, name: form.name, base_price: form.base_price, description: form.description || "" }));
      }
      showMsg(`"${form.name}" updated successfully.`);
      setEditProductData(null);
    } catch (err) {
      showMsg(err.response?.data?.error || "Error updating product", "error");
    } finally {
      setEditProductSaving(false);
    }
  };

  const handleSaveVariant = async (form) => {
    if (!form?.sku || !form?.barcode) {
      showMsg("SKU and Barcode are required", "error"); return;
    }
    setEditVariantSaving(true);
    try {
      await updateVariant(form.id, form);
      const updated = await getVariants(selectedProduct.product_id);
      setVariants(updated);
      showMsg("Variant updated!");
      setEditVariantData(null);
    } catch (err) {
      showMsg(err.response?.data?.error || "Error updating variant", "error");
    } finally {
      setEditVariantSaving(false);
    }
  };

  const groupedProducts = results.reduce((acc, row) => {
    if (!acc[row.product_id]) {
      acc[row.product_id] = {
        product_id: row.product_id,
        name: row.name,
        base_price: row.base_price,
        description: row.description || "",
        variants: [],
      };
    }
    acc[row.product_id].variants.push(row);
    return acc;
  }, {});
  const productList = Object.values(groupedProducts);

  const openProductDetail = async (product) => {
    setSelectedProduct(product);
    setLoadingVariants(true);
    try {
      const v = await getVariants(product.product_id);
      setVariants(v || []);
    } catch (err) {
      showMsg("Could not load variants: " + (err.response?.data?.error || err.message), "error");
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedProduct) {
    const otherSkus = variants
      .filter((v) => v.id !== editVariantData?.id)
      .map((v) => v.sku);

    return (
      <div className="page-content">
        {editProductData && (
          <EditProductModal
            data={editProductData}
            onClose={() => setEditProductData(null)}
            onSave={handleSaveProduct}
            saving={editProductSaving}
          />
        )}
        {editVariantData && (
          <EditVariantModal
            data={editVariantData}
            productName={selectedProduct.name}
            otherSkus={otherSkus}
            onClose={() => setEditVariantData(null)}
            onSave={handleSaveVariant}
            saving={editVariantSaving}
          />
        )}

        {msg.text && (
          <div className={`alert alert-${msg.type === "error" ? "danger" : "success"}`} style={{ marginBottom: 16 }}>
            {msg.text}
          </div>
        )}

        <div style={{ marginBottom: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 10 }}
            onClick={() => { setSelectedProduct(null); setVariants([]); }}
          >
            ⬅ Back to Search Results
          </button>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20 }}>
            👗 {selectedProduct.name}
          </h2>
          <div style={{ color: "var(--text-sub)", fontSize: 13, marginTop: 4 }}>
            Base Price: <strong>{fmtCurrency(selectedProduct.base_price)}</strong>
          </div>
        </div>

        {loadingVariants ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Variant Price</th>
                  <th>Stock (This Branch)</th>
                  <th>All Branches</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const branchStock = Array.isArray(v.stock)
                    ? v.stock.find((s) => s.branch_id === branchId)
                    : null;
                  const totalStock = Array.isArray(v.stock)
                    ? v.stock.reduce((sum, s) => sum + (parseInt(s.stock_qty) || 0), 0)
                    : 0;
                  return (
                    <tr key={v.id}>
                      <td style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>{v.sku}</td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>{v.barcode || "—"}</td>
                      <td>{v.size || "—"}</td>
                      <td>{v.color || "—"}</td>
                      <td style={{ fontWeight: 700 }}>
                        {v.variant_price ? fmtCurrency(v.variant_price) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
                            Base ({fmtCurrency(selectedProduct.base_price)})
                          </span>
                        )}
                      </td>
                      <td>
                        {branchStock != null ? (
                          <span className={`badge ${
                            branchStock.stock_qty === 0 ? "badge-danger"
                            : branchStock.stock_qty <= 5 ? "badge-warning"
                            : "badge-success"
                          }`}>
                            {branchStock.stock_qty}
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {Array.isArray(v.stock) && v.stock.length > 0 ? (
                          <div>
                            {v.stock.map((s) => (
                              <div key={s.branch_id} style={{ marginBottom: 2 }}>
                                {s.branch_name}: <strong>{s.stock_qty}</strong>
                              </div>
                            ))}
                            <div style={{ marginTop: 4, paddingTop: 4, borderTop: "1px solid var(--border)", fontWeight: 700, color: "var(--text-sub)" }}>
                              Total: {totalStock}
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      {canEdit && (
                        <td>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              setEditVariantData({
                                id: v.id,
                                sku: v.sku,
                                size: v.size || "",
                                color: v.color || "",
                                barcode: v.barcode || "",
                                variant_price: v.variant_price || "",
                              })
                            }
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {variants.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-icon">⚙️</span>
                <div className="empty-state-text">No variants found for this product</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Search view ────────────────────────────────────────────────────────────
  return (
    <div className="page-content">
      {editProductData && (
        <EditProductModal
          data={editProductData}
          onClose={() => setEditProductData(null)}
          onSave={handleSaveProduct}
          saving={editProductSaving}
        />
      )}

      {msg.text && (
        <div className={`alert alert-${msg.type === "error" ? "danger" : "success"}`} style={{ marginBottom: 16 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 24, maxWidth: 600 }}>
        <input
          ref={inputRef}
          className="form-control"
          style={{ flex: 1, fontSize: 15 }}
          placeholder="Search by product name, SKU or barcode..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button
          className="btn btn-primary"
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          style={{ minWidth: 100 }}
        >
          {searching ? <span className="spinner" style={{ width: 16, height: 16 }} /> : "🔍 Search"}
        </button>
        {searched && (
          <button
            className="btn btn-ghost"
            onClick={() => { setQuery(""); setResults([]); setSearched(false); inputRef.current?.focus(); }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {!searched && !searching && (
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <div className="empty-state-text">Type a product name, SKU or barcode and press Search</div>
        </div>
      )}

      {searched && productList.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 14 }}>
            Found <strong>{productList.length}</strong> product(s) · <strong>{results.length}</strong> variant(s)
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Base Price</th>
                  <th>Matched Variants</th>
                  {canEdit && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {productList.map((product) => (
                  <tr key={product.product_id}>
                    <td style={{ fontWeight: 700 }}>{product.name}</td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(product.base_price)}</td>
                    <td>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {product.variants.map((v) => (
                          <span
                            key={v.variant_id}
                            style={{
                              fontSize: 11, fontFamily: "monospace",
                              background: "var(--card)", border: "1px solid var(--border)",
                              borderRadius: 6, padding: "2px 8px", color: "var(--text-sub)",
                            }}
                          >
                            {v.sku}{v.size ? ` · ${v.size}` : ""}{v.color ? ` · ${v.color}` : ""}{" — "}
                            <span style={{
                              fontWeight: 700,
                              color: v.stock_qty === 0 ? "var(--danger, #e53935)" : v.stock_qty <= 5 ? "#FF9800" : "#4CAF50",
                            }}>
                              {v.stock_qty} in stock
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openProductDetail(product)}
                        >
                          View Details
                        </button>
                        {canEdit && (
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() =>
                              setEditProductData({
                                product_id: product.product_id,
                                name: product.name,
                                base_price: product.base_price,
                                description: product.description || "",
                              })
                            }
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default ProductSearch;