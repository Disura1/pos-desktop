import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
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

// ── Shared: Non-blocking confirm dialog ───────────────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
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
        maxWidth: 400,
        width: "90%",
        boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
      }}
    >
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          marginBottom: 20,
          lineHeight: 1.5,
          whiteSpace: "pre-line",
        }}
      >
        {message}
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-danger" onClick={onConfirm}>
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Shared: SKU generator ──────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════
// MANAGER: New-way Add Product+Variant form (inline, single step)
// ══════════════════════════════════════════════════════════════════════════
const EMPTY_NEW = {
  productName: "",
  basePrice: "",
  description: "",
  size: "",
  color: "",
  skuAuto: true,
  sku: "",
  barcode: "",
  variant_price: "",
};

const ManagerAddProductModal = ({ categoryId, onSaved, onClose, showMsg }) => {
  const [form, setForm] = useState(EMPTY_NEW);
  const [saving, setSaving] = useState(false);

  // Auto-SKU
  useEffect(() => {
    if (!form.skuAuto) return;
    const generated = computeSKU(form.productName, form.size, form.color, []);
    setForm((prev) => ({ ...prev, sku: generated }));
  }, [form.skuAuto, form.productName, form.size, form.color]);

  // Auto-barcode from SKU
  useEffect(() => {
    if (!form.skuAuto) return;
    setForm((prev) => ({ ...prev, barcode: prev.sku }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sku]);

  const handleSave = async () => {
    if (!form.productName.trim() || !form.basePrice) {
      showMsg("Product name and base price are required", "error");
      return;
    }
    if (!form.sku) {
      showMsg("SKU is required", "error");
      return;
    }
    if (!form.barcode) {
      showMsg("Barcode is required — use SKU or scan", "error");
      return;
    }
    setSaving(true);
    try {
      const product = await addProduct({
        name: form.productName.trim(),
        base_price: parseFloat(form.basePrice),
        description: form.description || "",
        category_id: categoryId,
      });
      await addVariant({
        product_id: product.id,
        sku: form.sku,
        size: form.size || null,
        color: form.color || null,
        barcode: form.barcode,
        variant_price: form.variant_price
          ? parseFloat(form.variant_price)
          : null,
      });
      showMsg(`"${form.productName}" added with first variant!`);
      onSaved();
      onClose();
    } catch (err) {
      showMsg(err.response?.data?.error || "Error saving product", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: 560 }}>
        <div className="modal-title">👗 Add New Product</div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginBottom: 16,
            marginTop: -8,
          }}
        >
          Fill product details and the first variant below. You can add more
          variants after saving.
        </div>

        {/* Product info */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "14px 16px",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              color: "var(--text-sub)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            Product Info
          </div>
          <div className="form-group">
            <label className="form-label">Product Name *</label>
            <input
              className="form-control"
              value={form.productName}
              onChange={(e) =>
                setForm({ ...form, productName: e.target.value })
              }
              placeholder="e.g. Floral Silk Dress"
              autoFocus
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Base Price (LKR) *</label>
              <input
                className="form-control"
                type="number"
                step="0.01"
                value={form.basePrice}
                onChange={(e) =>
                  setForm({ ...form, basePrice: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-control"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Optional"
              />
            </div>
          </div>
        </div>

        {/* First variant */}
        <div
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-sm)",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontWeight: 700,
              fontSize: 12,
              color: "var(--text-sub)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            First Variant
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Size</label>
              <input
                className="form-control"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="XS / S / M / L / XL"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <input
                className="form-control"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                placeholder="Black / Red / Blue..."
              />
            </div>
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
              <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {form.skuAuto ? (
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
                  onClick={() => setForm({ ...form, skuAuto: true })}
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
                  onClick={() => setForm({ ...form, skuAuto: false })}
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
              value={form.sku}
              readOnly={form.skuAuto}
              onChange={(e) =>
                setForm({ ...form, sku: e.target.value, skuAuto: false })
              }
              placeholder={
                form.skuAuto
                  ? "Auto from name + size + color"
                  : "Type SKU manually"
              }
            />
            {form.skuAuto && form.sku && (
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 3,
                }}
              >
                Generated:{" "}
                <strong style={{ fontFamily: "monospace" }}>{form.sku}</strong>
              </div>
            )}
          </div>

          {/* Barcode */}
          <div className="form-group">
            <label
              className="form-label"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <span>Barcode *</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Scan item or use SKU
              </span>
            </label>
            <input
              className="form-control"
              style={{ fontFamily: "monospace" }}
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              placeholder="Scan barcode or auto-filled from SKU"
            />
            {form.sku && form.barcode !== form.sku && (
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
                onClick={() => setForm({ ...form, barcode: form.sku })}
              >
                Use SKU as barcode ({form.sku})
              </button>
            )}
          </div>

          {/* Variant price */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              Variant Price (leave blank to use base price)
            </label>
            <input
              className="form-control"
              type="number"
              step="0.01"
              value={form.variant_price}
              onChange={(e) =>
                setForm({ ...form, variant_price: e.target.value })
              }
              placeholder="Optional override"
            />
          </div>
        </div>

        <div className="modal-footer" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <span className="spinner" />
            ) : (
              "💾 Save Product & Variant"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MANAGER: Add Variant modal — new way with auto SKU + auto barcode
// ══════════════════════════════════════════════════════════════════════════
const ManagerAddVariantModal = ({
  product,
  existingVariants,
  onSaved,
  onClose,
  showMsg,
}) => {
  const EMPTY = {
    size: "",
    color: "",
    skuAuto: true,
    sku: "",
    barcode: "",
    variant_price: "",
  };
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!form.skuAuto) return;
    const generated = computeSKU(
      product.name,
      form.size,
      form.color,
      existingVariants.map((v) => v.sku),
    );
    setForm((prev) => ({ ...prev, sku: generated }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.skuAuto, form.size, form.color]);

  useEffect(() => {
    if (!form.skuAuto) return;
    setForm((prev) => ({ ...prev, barcode: prev.sku }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.sku]);

  const handleSave = async () => {
    if (!form.sku) {
      showMsg("SKU is required", "error");
      return;
    }
    if (!form.barcode) {
      showMsg("Barcode is required", "error");
      return;
    }
    if (existingVariants.some((v) => v.sku === form.sku)) {
      showMsg(`SKU "${form.sku}" already exists`, "error");
      return;
    }
    setSaving(true);
    try {
      await addVariant({
        product_id: product.id,
        sku: form.sku,
        size: form.size || null,
        color: form.color || null,
        barcode: form.barcode,
        variant_price: form.variant_price
          ? parseFloat(form.variant_price)
          : null,
      });
      showMsg("Variant added!");
      onSaved();
      onClose();
    } catch (err) {
      showMsg(err.response?.data?.error || "Error adding variant", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal-title">+ Add Variant — {product.name}</div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Size</label>
            <input
              className="form-control"
              value={form.size}
              onChange={(e) => setForm({ ...form, size: e.target.value })}
              placeholder="XS / S / M / L / XL"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <input
              className="form-control"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              placeholder="Black / Red / Blue..."
            />
          </div>
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
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {form.skuAuto ? (
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
                onClick={() => setForm({ ...form, skuAuto: true })}
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
                onClick={() => setForm({ ...form, skuAuto: false })}
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
            value={form.sku}
            readOnly={form.skuAuto}
            onChange={(e) =>
              setForm({ ...form, sku: e.target.value, skuAuto: false })
            }
            placeholder={
              form.skuAuto
                ? "Auto from product + size + color"
                : "Type SKU manually"
            }
          />
          {form.skuAuto && form.sku && (
            <div
              style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}
            >
              Generated:{" "}
              <strong style={{ fontFamily: "monospace" }}>{form.sku}</strong>
            </div>
          )}
        </div>

        {/* Barcode */}
        <div className="form-group">
          <label
            className="form-label"
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>Barcode *</span>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Scan item or use SKU
            </span>
          </label>
          <input
            className="form-control"
            style={{ fontFamily: "monospace" }}
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            placeholder="Scan or auto-filled from SKU"
          />
          {form.sku && form.barcode !== form.sku && (
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
              onClick={() => setForm({ ...form, barcode: form.sku })}
            >
              Use SKU as barcode ({form.sku})
            </button>
          )}
        </div>

        {/* Variant price */}
        <div className="form-group">
          <label className="form-label">
            Variant Price (leave blank to use base price)
          </label>
          <input
            className="form-control"
            type="number"
            step="0.01"
            value={form.variant_price}
            onChange={(e) =>
              setForm({ ...form, variant_price: e.target.value })
            }
            placeholder="Optional override"
          />
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <span className="spinner" /> : "+ Add Variant"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN: CategoryManager (shared — Owner & Manager)
// ══════════════════════════════════════════════════════════════════════════
const CategoryManager = () => {
  const { user } = useAuth();
  const isManager = user?.role === "Manager";

  const [allCats, setAllCats] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [parentId, setParentId] = useState(null);

  // Modals
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [showManagerAddProduct, setShowManagerAddProduct] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [catData, setCatData] = useState({ id: null, name: "" });
  const [itemData, setItemData] = useState({
    id: null,
    name: "",
    base_price: "",
    description: "",
  });

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingVariant, setEditingVariant] = useState(null);
  const [skuEditAutoMode, setSkuEditAutoMode] = useState(false);

  // Owner-only add variant form state (old way)
  const [variantData, setVariantData] = useState({
    sku: "",
    size: "",
    color: "",
    barcode: "",
    variant_price: "",
  });
  const [skuAutoMode, setSkuAutoMode] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [confirmDialog, setConfirmDialog] = useState(null);

  const confirm = (message) =>
    new Promise((resolve) => {
      setConfirmDialog({
        message,
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

  // ── Owner SKU auto (old way) ──
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

  // ── Handlers ──
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

  // Owner-only: add variant (old way)
  const handleSaveVariant = async () => {
    if (!variantData.sku || !variantData.barcode) {
      showMsg("SKU and Barcode are required", "error");
      return;
    }
    if (variants.some((v) => v.sku === variantData.sku)) {
      showMsg(`SKU "${variantData.sku}" already exists`, "error");
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
    if (
      variants.some(
        (v) => v.id !== editingVariant.id && v.sku === editingVariant.sku,
      )
    ) {
      showMsg(`SKU "${editingVariant.sku}" is already used`, "error");
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
    const ok = await confirm(
      `Delete variant "${sku}"? This will also remove its stock records.`,
    );
    if (!ok) return;
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

  // ── Derived ──
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

  // ══════════════════════════════════════════════════════════════════════
  // VARIANT PAGE (shared — same for both roles)
  // ══════════════════════════════════════════════════════════════════════
  if (selectedProduct) {
    return (
      <div className="page-content">
        {confirmDialog && <ConfirmDialog {...confirmDialog} />}

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
          <button
            className="btn btn-primary"
            onClick={() =>
              isManager ? setShowAddVariantModal(true) : openAddVariantModal()
            }
          >
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
                  <tr key={v.id} style={{ background: "rgba(233,30,99,0.04)" }}>
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

        {/* ── Add Variant Modal ──
            Manager → new way (auto SKU + auto barcode)
            Owner   → old way (manual fields) */}
        {showAddVariantModal && isManager && (
          <ManagerAddVariantModal
            product={selectedProduct}
            existingVariants={variants}
            onSaved={async () => {
              const updated = await getVariants(selectedProduct.id);
              setVariants(updated);
            }}
            onClose={() => setShowAddVariantModal(false)}
            showMsg={showMsg}
          />
        )}

        {showAddVariantModal && !isManager && (
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
                      skuAutoMode ? "Auto-generated" : "Type SKU manually"
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
                      : "Manual mode"}
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

  // ══════════════════════════════════════════════════════════════════════
  // MAIN CATEGORY / PRODUCT VIEW
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="page-content">
      {confirmDialog && <ConfirmDialog {...confirmDialog} />}

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
                if (isManager) {
                  setShowManagerAddProduct(true);
                } else {
                  setEditMode(false);
                  setItemData({
                    id: null,
                    name: "",
                    base_price: "",
                    description: "",
                  });
                  setShowItemModal(true);
                }
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
                    confirm("Delete this folder?").then((ok) => {
                      if (ok) deleteCategory(cat.id).then(loadCategories);
                    });
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
                            const ok = await confirm(
                              `Delete "${item.name}"?\n\nThis will also remove all its variants and stock records.`,
                            );
                            if (!ok) return;
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

      {/* ── Category Modal ── */}
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

      {/* ── Owner: Product Modal (old way) ── */}
      {showItemModal && !isManager && (
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

      {/* ── Owner: Edit Product Modal ── */}
      {showItemModal && isManager && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowItemModal(false)
          }
        >
          <div className="modal">
            <div className="modal-title">✏️ Edit Product</div>
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

      {/* ── Manager: Add Product (new way — product + first variant in one form) ── */}
      {showManagerAddProduct && isManager && (
        <ManagerAddProductModal
          categoryId={parentId}
          onSaved={() => loadItems(parentId)}
          onClose={() => setShowManagerAddProduct(false)}
          showMsg={showMsg}
        />
      )}
    </div>
  );
};

export default CategoryManager;
