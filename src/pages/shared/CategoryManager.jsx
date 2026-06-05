import React, { useState, useEffect } from "react";
import {
  getCategories,
  addCategory,
  deleteCategory,
  updateCategory,
} from "../../services/categoryService";
import {
  addProduct,
  getProductsByCategory,
  deleteProduct,
  updateProduct,
  addVariant,
  updateVariant,
  deleteVariant,
  getVariants,
} from "../../services/productService";
import { fmtCurrency } from "../../utils/formatters";

const CategoryManager = () => {
  const [allCats, setAllCats] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [parentId, setParentId] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [catData, setCatData] = useState({ id: null, name: "" });
  const [itemData, setItemData] = useState({
    id: null,
    name: "",
    base_price: "",
    description: "",
  });
  const [selectedProduct, setSelectedProduct] = useState(null); // product whose variants page is open
  const [variantData, setVariantData] = useState({
    sku: "",
    size: "",
    color: "",
    barcode: "",
    variant_price: "",
  });
  const [skuAutoMode, setSkuAutoMode] = useState(true);
  const [editingVariant, setEditingVariant] = useState(null);
  const [skuEditAutoMode, setSkuEditAutoMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "success" }), 3500);
  };

  const loadCategories = () => getCategories().then(setAllCats);
  const loadItems = (id) =>
    id
      ? getProductsByCategory(id).then((d) => setItems(d || []))
      : setItems([]);

  useEffect(() => {
    loadCategories();
  }, []);
  useEffect(() => {
    loadItems(parentId);
  }, [parentId]);

  // ─── SKU generation ───────────────────────────────────────────────────────
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

  // Keep variantData.sku in sync when auto mode is on (Add form)
  useEffect(() => {
    if (!skuAutoMode || !selectedProduct) return;
    const generated = computeSKU(
      selectedProduct.name,
      variantData.size,
      variantData.color,
      variants.map((v) => v.sku),
    );
    setVariantData((prev) => ({ ...prev, sku: generated }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    skuAutoMode,
    variantData.size,
    variantData.color,
    selectedProduct,
    variants,
  ]);

  // Keep editingVariant.sku in sync when edit-auto mode is on
  useEffect(() => {
    if (!skuEditAutoMode || !editingVariant || !selectedProduct) return;
    const generated = computeSKU(
      selectedProduct.name,
      editingVariant.size,
      editingVariant.color,
      variants.filter((v) => v.id !== editingVariant.id).map((v) => v.sku),
    );
    setEditingVariant((prev) => ({ ...prev, sku: generated }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuEditAutoMode, editingVariant?.size, editingVariant?.color]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (editMode) await updateCategory(catData.id, { name: catData.name });
      else await addCategory({ name: catData.name, parent_id: parentId });
      setShowCatModal(false);
      setEditMode(false);
      setCatData({ id: null, name: "" });
      loadCategories();
      showMsg("Category saved!");
    } catch {
      showMsg("Error saving category", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      if (editMode) await updateProduct(itemData.id, itemData);
      else await addProduct({ ...itemData, category_id: parentId });
      setShowItemModal(false);
      setEditMode(false);
      setItemData({ id: null, name: "", base_price: "", description: "" });
      loadItems(parentId);
      showMsg("Product saved!");
    } catch {
      showMsg("Error saving product", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVariant = async () => {
    if (!variantData.sku || !variantData.barcode) {
      showMsg("SKU and Barcode are required", "error");
      return;
    }
    // Client-side duplicate check
    if (variants.some((v) => v.sku === variantData.sku)) {
      showMsg(
        `SKU "${variantData.sku}" already exists — change it or use auto-generate`,
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      await addVariant({ ...variantData, product_id: selectedProduct.id });
      const updated = await getVariants(selectedProduct.id);
      setVariants(updated);
      setVariantData({
        sku: "",
        size: "",
        color: "",
        barcode: "",
        variant_price: "",
      });
      setSkuAutoMode(true);
      setShowAddVariantModal(false);
      showMsg("Variant added!");
    } catch (err) {
      showMsg(err.response?.data?.error || "Error adding variant", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateVariant = async () => {
    if (!editingVariant) return;
    if (!editingVariant.sku || !editingVariant.barcode) {
      showMsg("SKU and Barcode are required", "error");
      return;
    }
    // Client-side duplicate check (exclude self)
    if (
      variants.some(
        (v) => v.id !== editingVariant.id && v.sku === editingVariant.sku,
      )
    ) {
      showMsg(
        `SKU "${editingVariant.sku}" is already used by another variant`,
        "error",
      );
      return;
    }
    setSaving(true);
    try {
      await updateVariant(editingVariant.id, editingVariant);
      const updated = await getVariants(selectedProduct.id);
      setVariants(updated);
      setEditingVariant(null);
      setSkuEditAutoMode(false);
      showMsg("Variant updated!");
    } catch (err) {
      showMsg(err.response?.data?.error || "Error updating variant", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVariant = async (variantId, sku) => {
    if (
      !window.confirm(
        `Delete variant "${sku}"? This will also remove its stock records.`,
      )
    )
      return;
    setSaving(true);
    try {
      await deleteVariant(variantId);
      const updated = await getVariants(selectedProduct.id);
      setVariants(updated);
      showMsg("Variant deleted!");
    } catch (err) {
      showMsg(err.response?.data?.error || "Error deleting variant", "error");
    } finally {
      setSaving(false);
    }
  };

  const openVariantsPage = async (product) => {
    setSelectedProduct(product);
    const v = await getVariants(product.id);
    setVariants(v);
    setEditingVariant(null);
    setSkuEditAutoMode(false);
  };

  const openAddVariantModal = () => {
    setVariantData({
      sku: "",
      size: "",
      color: "",
      barcode: "",
      variant_price: "",
    });
    setSkuAutoMode(true);
    setShowAddVariantModal(true);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────
  const currentCategories = allCats.filter((c) => c.parent_id === parentId);

  const buildBreadcrumb = () => {
    const trail = [];
    let id = parentId;
    while (id) {
      const cat = allCats.find((c) => c.id === id);
      if (!cat) break;
      trail.unshift({ id: cat.id, name: cat.name });
      id = cat.parent_id;
    }
    return trail;
  };
  const breadcrumb = buildBreadcrumb();

  // ─── Variant detail page ──────────────────────────────────────────────────
  if (selectedProduct) {
    return (
      <div className="page-content">
        {/* Message bar */}
        {msg.text && (
          <div
            className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
            style={{ marginBottom: 16 }}
          >
            {msg.text}
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div>
            {/* Breadcrumb */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
                marginBottom: 8,
              }}
            >
              {/* Root */}
              <span
                onClick={() => {
                  setSelectedProduct(null);
                  setEditingVariant(null);
                  setParentId(null);
                }}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--pink)",
                  cursor: "pointer",
                }}
              >
                🏠 All Categories
              </span>

              {/* Category trail */}
              {breadcrumb.map((crumb) => (
                <span
                  key={crumb.id}
                  style={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 14,
                      margin: "0 4px",
                    }}
                  >
                    ›
                  </span>
                  <span
                    onClick={() => {
                      setSelectedProduct(null);
                      setEditingVariant(null);
                      setParentId(crumb.id);
                    }}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--pink)",
                      cursor: "pointer",
                    }}
                  >
                    {crumb.name}
                  </span>
                </span>
              ))}

              {/* Product name */}
              <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    margin: "0 4px",
                  }}
                >
                  ›
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  👗 {selectedProduct.name}
                </span>
              </span>

              {/* Variants (current) */}
              <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 14,
                    margin: "0 4px",
                  }}
                >
                  ›
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "var(--text)",
                  }}
                >
                  ⚙️ Variants
                </span>
              </span>
            </div>

            <button
              className="btn btn-ghost btn-sm"
              style={{ marginBottom: 6 }}
              onClick={() => {
                setSelectedProduct(null);
                setEditingVariant(null);
              }}
            >
              ⬅ Back to Products
            </button>
            <div
              style={{ color: "var(--text-sub)", fontSize: 13, marginTop: 3 }}
            >
              Base Price: {fmtCurrency(selectedProduct.base_price)}
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAddVariantModal}>
            + Add Variant
          </button>
        </div>

        {/* Variants Table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Size</th>
                <th>Color</th>
                <th>Variant Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) =>
                editingVariant?.id === v.id ? (
                  /* ── Inline edit row ── */
                  <tr key={v.id} style={{ background: "rgba(233,30,99,0.04)" }}>
                    {/* SKU */}
                    <td style={{ minWidth: 170 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          marginBottom: 4,
                        }}
                      >
                        {skuEditAutoMode && (
                          <span
                            style={{
                              fontSize: 10,
                              background: "var(--success-bg)",
                              color: "var(--success)",
                              padding: "1px 6px",
                              borderRadius: 10,
                              fontWeight: 700,
                            }}
                          >
                            AUTO
                          </span>
                        )}
                        <button
                          type="button"
                          title="Auto-generate SKU from Size & Color"
                          onClick={() => setSkuEditAutoMode(true)}
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
                          title="Switch to manual SKU"
                          onClick={() => setSkuEditAutoMode(false)}
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
                      </div>
                      <input
                        className="form-control"
                        style={{ fontSize: 12, fontFamily: "monospace" }}
                        value={editingVariant.sku}
                        readOnly={skuEditAutoMode}
                        onChange={(e) => {
                          setSkuEditAutoMode(false);
                          setEditingVariant((prev) => ({
                            ...prev,
                            sku: e.target.value,
                          }));
                        }}
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        style={{
                          fontSize: 12,
                          fontFamily: "monospace",
                          minWidth: 110,
                        }}
                        value={editingVariant.barcode || ""}
                        onChange={(e) =>
                          setEditingVariant((prev) => ({
                            ...prev,
                            barcode: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        style={{ fontSize: 12, width: 70 }}
                        value={editingVariant.size || ""}
                        onChange={(e) =>
                          setEditingVariant((prev) => ({
                            ...prev,
                            size: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        style={{ fontSize: 12, width: 90 }}
                        value={editingVariant.color || ""}
                        onChange={(e) =>
                          setEditingVariant((prev) => ({
                            ...prev,
                            color: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="form-control"
                        type="number"
                        step="0.01"
                        style={{ fontSize: 12, width: 100 }}
                        value={editingVariant.variant_price || ""}
                        placeholder="Base price"
                        onChange={(e) =>
                          setEditingVariant((prev) => ({
                            ...prev,
                            variant_price: e.target.value,
                          }))
                        }
                      />
                    </td>
                    <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {Array.isArray(v.stock)
                        ? v.stock.map((s) => (
                            <div key={s.branch_id}>
                              {s.branch_name}: <strong>{s.stock_qty}</strong>
                            </div>
                          ))
                        : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={handleUpdateVariant}
                          disabled={saving}
                        >
                          {saving ? (
                            <span
                              className="spinner"
                              style={{ width: 12, height: 12 }}
                            />
                          ) : (
                            "✓ Save"
                          )}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditingVariant(null);
                            setSkuEditAutoMode(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  /* ── Normal display row ── */
                  <tr key={v.id}>
                    <td
                      style={{
                        fontFamily: "monospace",
                        fontSize: 12,
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
                    <td>
                      {v.variant_price ? (
                        fmtCurrency(v.variant_price)
                      ) : (
                        <span
                          style={{ color: "var(--text-muted)", fontSize: 12 }}
                        >
                          Base
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 11 }}>
                      {Array.isArray(v.stock)
                        ? v.stock.map((s) => (
                            <div key={s.branch_id}>
                              {s.branch_name}: <strong>{s.stock_qty}</strong>
                            </div>
                          ))
                        : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setEditingVariant({
                              ...v,
                              variant_price: v.variant_price || "",
                            });
                            setSkuEditAutoMode(false);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteVariant(v.id, v.sku)}
                          disabled={saving}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
          {variants.length === 0 && (
            <div className="empty-state">
              <span className="empty-state-icon">⚙️</span>
              <div className="empty-state-text">
                No variants yet — click "+ Add Variant" to create one
              </div>
            </div>
          )}
        </div>

        {/* ── Add Variant Popup ── */}
        {showAddVariantModal && (
          <div
            className="modal-overlay"
            onClick={(e) =>
              e.target === e.currentTarget && setShowAddVariantModal(false)
            }
          >
            <div className="modal">
              <div className="modal-title">
                + Add Variant — {selectedProduct.name}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Size</label>
                  <input
                    className="form-control"
                    value={variantData.size}
                    onChange={(e) =>
                      setVariantData((prev) => ({
                        ...prev,
                        size: e.target.value,
                      }))
                    }
                    placeholder="XS / S / M / L / XL"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <input
                    className="form-control"
                    value={variantData.color}
                    onChange={(e) =>
                      setVariantData((prev) => ({
                        ...prev,
                        color: e.target.value,
                      }))
                    }
                    placeholder="Black / White / Red..."
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>SKU *</span>
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {skuAutoMode ? (
                        <span
                          style={{
                            fontSize: 10,
                            background: "var(--success-bg)",
                            color: "var(--success)",
                            padding: "2px 7px",
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
                            padding: "2px 7px",
                            borderRadius: 10,
                            fontWeight: 700,
                          }}
                        >
                          MANUAL
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setSkuAutoMode(true)}
                        style={{
                          fontSize: 11,
                          background: "none",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          padding: "1px 7px",
                          cursor: "pointer",
                          color: "var(--text-sub)",
                        }}
                        title="Auto-generate SKU from product + size + color"
                      >
                        🔄 Auto
                      </button>
                      <button
                        type="button"
                        onClick={() => setSkuAutoMode(false)}
                        style={{
                          fontSize: 11,
                          background: "none",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          padding: "1px 7px",
                          cursor: "pointer",
                          color: "var(--text-sub)",
                        }}
                        title="Enter SKU manually"
                      >
                        ✏️ Manual
                      </button>
                    </span>
                  </label>
                  <input
                    className="form-control"
                    value={variantData.sku}
                    readOnly={skuAutoMode}
                    onChange={(e) => {
                      setSkuAutoMode(false);
                      setVariantData((prev) => ({
                        ...prev,
                        sku: e.target.value,
                      }));
                    }}
                    placeholder={
                      skuAutoMode
                        ? "Auto-generated from product + size + color"
                        : "Type SKU manually"
                    }
                    style={{
                      fontFamily: "monospace",
                      letterSpacing: 0.5,
                      background: skuAutoMode
                        ? "var(--input-disabled, rgba(255,255,255,0.04))"
                        : undefined,
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      marginTop: 4,
                    }}
                  >
                    {skuAutoMode
                      ? `Generated: "${variantData.sku || "(type size/color above)"}"`
                      : "Manual mode — click 🔄 Auto to switch back"}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Barcode *</label>
                  <input
                    className="form-control"
                    value={variantData.barcode}
                    onChange={(e) =>
                      setVariantData({
                        ...variantData,
                        barcode: e.target.value,
                      })
                    }
                    placeholder="Scan or enter barcode"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Variant Price (leave blank to use base price)
                </label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  value={variantData.variant_price}
                  onChange={(e) =>
                    setVariantData({
                      ...variantData,
                      variant_price: e.target.value,
                    })
                  }
                  placeholder="Optional override price"
                />
              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowAddVariantModal(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSaveVariant}
                  disabled={saving}
                >
                  {saving ? <span className="spinner" /> : "+ Add Variant"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── Main category/product view ───────────────────────────────────────────
  return (
    <div className="page-content">
      {msg.text && (
        <div
          className={`alert alert-${msg.type === "error" ? "danger" : "success"}`}
          style={{ marginBottom: 14 }}
        >
          {msg.text}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <span
              onClick={() => setParentId(null)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: parentId ? "var(--pink)" : "var(--text)",
                cursor: parentId ? "pointer" : "default",
              }}
            >
              🏠 All Categories
            </span>
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              return (
                <span
                  key={crumb.id}
                  style={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 14,
                      margin: "0 4px",
                    }}
                  >
                    ›
                  </span>
                  <span
                    onClick={() => !isLast && setParentId(crumb.id)}
                    style={{
                      fontSize: 13,
                      fontWeight: isLast ? 700 : 600,
                      color: isLast ? "var(--text)" : "var(--pink)",
                      cursor: isLast ? "default" : "pointer",
                    }}
                  >
                    {isLast ? `📂 ${crumb.name}` : crumb.name}
                  </span>
                </span>
              );
            })}
          </div>
          {parentId && (
            <button
              className="btn btn-ghost btn-sm"
              style={{
                alignSelf: "flex-start",
                padding: "3px 10px",
                fontSize: 12,
              }}
              onClick={() => {
                const cur = allCats.find((c) => c.id === parentId);
                setParentId(cur?.parent_id ?? null);
              }}
            >
              ⬅ Back
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-outline"
            onClick={() => {
              setEditMode(false);
              setCatData({ id: null, name: "" });
              setShowCatModal(true);
            }}
          >
            + New Folder
          </button>
          {parentId && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditMode(false);
                setItemData({
                  id: null,
                  name: "",
                  base_price: "",
                  description: "",
                });
                setShowItemModal(true);
              }}
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      {currentCategories.length > 0 && (
        <div className="grid-4" style={{ gap: 14, marginBottom: 28 }}>
          {currentCategories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => setParentId(cat.id)}
              style={{
                background: "var(--card)",
                border: "1.5px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "18px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                userSelect: "none",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = "var(--pink)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = "var(--border)")
              }
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div
                style={{
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: 10,
                }}
              >
                {cat.name}
              </div>
              <div
                style={{ display: "flex", gap: 6, justifyContent: "center" }}
              >
                <button
                  className="btn btn-outline btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCatData({ id: cat.id, name: cat.name });
                    setEditMode(true);
                    setShowCatModal(true);
                  }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("Delete this folder?"))
                      deleteCategory(cat.id).then(loadCategories);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products Table */}
      {parentId && (
        <>
          <div
            style={{
              borderBottom: "2px solid var(--pink-light)",
              paddingBottom: 10,
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              Products in this category
            </span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Description</th>
                  <th>Base Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: "var(--text-sub)", fontSize: 13 }}>
                      {item.description || "—"}
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {fmtCurrency(item.base_price)}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openVariantsPage(item)}
                        >
                          Variants
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setItemData({
                              id: item.id,
                              name: item.name || "",
                              base_price: item.base_price || "",
                              description: item.description || "",
                            });
                            setEditMode(true);
                            setShowItemModal(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          disabled={saving}
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete "${item.name}"?\n\nThis will also remove all its variants and stock records.`,
                              )
                            )
                              return;
                            setSaving(true);
                            try {
                              await deleteProduct(item.id);
                              await loadItems(parentId);
                              showMsg(`"${item.name}" deleted.`);
                            } catch (err) {
                              showMsg(
                                err.response?.data?.error ||
                                  "Error deleting product",
                                "error",
                              );
                            } finally {
                              setSaving(false);
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="empty-state">
                <span className="empty-state-icon">👗</span>
                <div className="empty-state-text">
                  No products in this category
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowCatModal(false)
          }
        >
          <div className="modal modal-sm">
            <div className="modal-title">
              {editMode ? "✏️ Edit Category" : "📂 New Category"}
            </div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input
                className="form-control"
                value={catData.name}
                onChange={(e) =>
                  setCatData({ ...catData, name: e.target.value })
                }
                placeholder="Category name"
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCatModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveCategory}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showItemModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowItemModal(false)
          }
        >
          <div className="modal">
            <div className="modal-title">
              {editMode ? "✏️ Edit Product" : "👗 New Product"}
            </div>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                className="form-control"
                value={itemData.name}
                onChange={(e) =>
                  setItemData({ ...itemData, name: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Base Price (LKR) *</label>
              <input
                className="form-control"
                type="number"
                step="0.01"
                value={itemData.base_price}
                onChange={(e) =>
                  setItemData({ ...itemData, base_price: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-control"
                value={itemData.description}
                onChange={(e) =>
                  setItemData({ ...itemData, description: e.target.value })
                }
              />
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowItemModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveItem}
                disabled={saving}
              >
                {saving ? <span className="spinner" /> : "Save Product"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
