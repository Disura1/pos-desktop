import React, { useState, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { searchProducts, getVariants } from "../../services/productService";
import { fmtCurrency } from "../../utils/formatters";

const ProductSearch = () => {
  const { user } = useAuth();
  const branchId = user?.branchId || null;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // { product_id, name, base_price }
  const [variants, setVariants] = useState([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });
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
      showMsg(
        "Search failed: " + (err.response?.data?.error || err.message),
        "error",
      );
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // Group flat search results by product
  const groupedProducts = results.reduce((acc, row) => {
    if (!acc[row.product_id]) {
      acc[row.product_id] = {
        product_id: row.product_id,
        name: row.name,
        base_price: row.base_price,
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
      showMsg(
        "Could not load variants: " +
          (err.response?.data?.error || err.message),
        "error",
      );
      setVariants([]);
    } finally {
      setLoadingVariants(false);
    }
  };

  // ── Detail view ────────────────────────────────────────────────────────────
  if (selectedProduct) {
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

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginBottom: 10 }}
            onClick={() => {
              setSelectedProduct(null);
              setVariants([]);
            }}
          >
            ⬅ Back to Search Results
          </button>
          <h2 style={{ margin: 0, fontWeight: 800, fontSize: 20 }}>
            👗 {selectedProduct.name}
          </h2>
          <div style={{ color: "var(--text-sub)", fontSize: 13, marginTop: 4 }}>
            Base Price:{" "}
            <strong>{fmtCurrency(selectedProduct.base_price)}</strong>
          </div>
        </div>

        {/* Variants Table */}
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
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => {
                  const branchStock = Array.isArray(v.stock)
                    ? v.stock.find((s) => s.branch_id === branchId)
                    : null;
                  const totalStock = Array.isArray(v.stock)
                    ? v.stock.reduce(
                        (sum, s) => sum + (parseInt(s.stock_qty) || 0),
                        0,
                      )
                    : 0;

                  return (
                    <tr key={v.id}>
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: 13,
                          fontWeight: 600,
                        }}
                      >
                        {v.sku}
                      </td>
                      <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                        {v.barcode || "—"}
                      </td>
                      <td>{v.size || "—"}</td>
                      <td>{v.color || "—"}</td>
                      <td style={{ fontWeight: 700 }}>
                        {v.variant_price ? (
                          fmtCurrency(v.variant_price)
                        ) : (
                          <span
                            style={{ color: "var(--text-muted)", fontSize: 12 }}
                          >
                            Base ({fmtCurrency(selectedProduct.base_price)})
                          </span>
                        )}
                      </td>
                      <td>
                        {branchStock != null ? (
                          <span
                            className={`badge ${branchStock.stock_qty === 0 ? "badge-danger" : branchStock.stock_qty <= 5 ? "badge-warning" : "badge-success"}`}
                          >
                            {branchStock.stock_qty}
                          </span>
                        ) : (
                          <span
                            style={{ color: "var(--text-muted)", fontSize: 12 }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 11 }}>
                        {Array.isArray(v.stock) && v.stock.length > 0 ? (
                          <div>
                            {v.stock.map((s) => (
                              <div
                                key={s.branch_id}
                                style={{ marginBottom: 2 }}
                              >
                                {s.branch_name}: <strong>{s.stock_qty}</strong>
                              </div>
                            ))}
                            <div
                              style={{
                                marginTop: 4,
                                paddingTop: 4,
                                borderTop: "1px solid var(--border)",
                                fontWeight: 700,
                                color: "var(--text-sub)",
                              }}
                            >
                              Total: {totalStock}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {variants.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-icon">⚙️</span>
                <div className="empty-state-text">
                  No variants found for this product
                </div>
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
      {msg.text && (
        <div
          className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
          style={{ marginBottom: 16 }}
        >
          {msg.text}
        </div>
      )}

      {/* Search Bar */}
      <div
        style={{ display: "flex", gap: 10, marginBottom: 24, maxWidth: 600 }}
      >
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
          {searching ? (
            <span className="spinner" style={{ width: 16, height: 16 }} />
          ) : (
            "🔍 Search"
          )}
        </button>
        {searched && (
          <button
            className="btn btn-ghost"
            onClick={() => {
              setQuery("");
              setResults([]);
              setSearched(false);
              inputRef.current?.focus();
            }}
          >
            ✕ Clear
          </button>
        )}
      </div>

      {/* Results */}
      {!searched && !searching && (
        <div className="empty-state">
          <span className="empty-state-icon">🔍</span>
          <div className="empty-state-text">
            Type a product name, SKU or barcode and press Search
          </div>
        </div>
      )}

      {searched && productList.length > 0 && (
        <>
          <div
            style={{ fontSize: 13, color: "var(--text-sub)", marginBottom: 14 }}
          >
            Found <strong>{productList.length}</strong> product(s) ·{" "}
            <strong>{results.length}</strong> variant(s)
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Base Price</th>
                  <th>Matched Variants</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {productList.map((product) => (
                  <tr key={product.product_id}>
                    <td style={{ fontWeight: 700 }}>{product.name}</td>
                    <td style={{ fontWeight: 600 }}>
                      {fmtCurrency(product.base_price)}
                    </td>
                    <td>
                      <div
                        style={{ display: "flex", flexWrap: "wrap", gap: 5 }}
                      >
                        {product.variants.map((v) => (
                          <span
                            key={v.variant_id}
                            style={{
                              fontSize: 11,
                              fontFamily: "monospace",
                              background: "var(--card)",
                              border: "1px solid var(--border)",
                              borderRadius: 6,
                              padding: "2px 8px",
                              color: "var(--text-sub)",
                            }}
                          >
                            {v.sku}
                            {v.size ? ` · ${v.size}` : ""}
                            {v.color ? ` · ${v.color}` : ""}
                            {" — "}
                            <span
                              className={`${v.stock_qty === 0 ? "" : ""}`}
                              style={{
                                fontWeight: 700,
                                color:
                                  v.stock_qty === 0
                                    ? "var(--danger, #e53935)"
                                    : v.stock_qty <= 5
                                      ? "#FF9800"
                                      : "#4CAF50",
                              }}
                            >
                              {v.stock_qty} in stock
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openProductDetail(product)}
                      >
                        View Details
                      </button>
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
