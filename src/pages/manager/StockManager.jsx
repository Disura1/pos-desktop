import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getInventory,
  adjustStock,
  updateThreshold,
} from "../../services/stockService";
import { fmtCurrency } from "../../utils/formatters";

const StockManager = () => {
  const { user } = useAuth();
  const branchId = user?.branchId;
  const [inventory, setInventory] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'low' | 'out'
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { item, mode: 'adjust'|'threshold' }
  const [adjustVal, setAdjustVal] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const showMsg = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  };

  const load = () => {
    setLoading(true);
    getInventory({ branchId })
      .then(setInventory)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [branchId]);

  // Separate, non-overlapping counts
  const outOfStockItems = inventory.filter((i) => i.stock_qty === 0);
  const lowStockOnlyItems = inventory.filter(
    (i) => i.stock_qty > 0 && i.stock_qty <= i.low_stock_threshold,
  );
  const outCount = outOfStockItems.length;
  const lowCount = lowStockOnlyItems.length;

  const statusFiltered = inventory.filter((i) => {
    if (statusFilter === "low")
      return i.stock_qty > 0 && i.stock_qty <= i.low_stock_threshold;
    if (statusFilter === "out") return i.stock_qty === 0;
    return true;
  });

  const filtered = statusFiltered.filter((i) =>
    `${i.product_name} ${i.sku} ${i.color} ${i.size}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const handleAdjust = async () => {
    if (adjustVal === "" || isNaN(adjustVal)) return;
    setSaving(true);
    try {
      await adjustStock({
        variant_id: modal.item.variant_id,
        branch_id: branchId,
        new_qty: parseInt(adjustVal),
        note,
      });
      showMsg(`Stock updated to ${adjustVal} for ${modal.item.sku}`);
      setModal(null);
      setAdjustVal("");
      setNote("");
      load();
    } catch (err) {
      showMsg(err.response?.data?.error || "Failed", "danger");
    } finally {
      setSaving(false);
    }
  };

  const handleThreshold = async () => {
    setSaving(true);
    try {
      await updateThreshold({
        variant_id: modal.item.variant_id,
        branch_id: branchId,
        threshold: parseInt(adjustVal),
      });
      showMsg("Low stock threshold updated!");
      setModal(null);
      setAdjustVal("");
      load();
    } catch {
      showMsg("Failed", "danger");
    } finally {
      setSaving(false);
    }
  };

  const StatCard = ({ label, value, color, filterKey, borderColor }) => (
    <div
      className="card"
      onClick={() =>
        setStatusFilter(statusFilter === filterKey ? "all" : filterKey)
      }
      style={{
        padding: "10px 18px",
        flex: 1,
        cursor: "pointer",
        borderLeft: borderColor ? `4px solid ${borderColor}` : undefined,
        outline:
          statusFilter === filterKey
            ? `2px solid ${color || "var(--pink)"}`
            : "none",
        transition: "all 0.12s",
      }}
    >
      <div
        style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}
      >
        {label}
      </div>
      <div
        style={{ fontSize: 22, fontWeight: 800, color: color || "var(--text)" }}
      >
        {value}
      </div>
    </div>
  );

  return (
    <div className="page-content">
      {/* Stats bar — click to filter */}
      <div
        style={{ display: "flex", gap: 14, marginBottom: 20, flexWrap: "wrap" }}
      >
        <StatCard
          label="TOTAL VARIANTS"
          value={inventory.length}
          filterKey="all"
        />
        <StatCard
          label="LOW STOCK"
          value={lowCount}
          color="var(--warning)"
          borderColor="var(--warning)"
          filterKey="low"
        />
        <StatCard
          label="OUT OF STOCK"
          value={outCount}
          color="var(--danger)"
          borderColor="var(--danger)"
          filterKey="out"
        />
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <input
            className="form-control"
            style={{ minWidth: 260 }}
            placeholder="Search product, SKU, color..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {statusFilter !== "all" && (
        <div
          style={{
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-sub)" }}>
            Filtering:{" "}
            <strong>
              {statusFilter === "low" ? "Low Stock" : "Out of Stock"}
            </strong>
          </span>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setStatusFilter("all")}
          >
            ✕ Clear filter
          </button>
        </div>
      )}

      {msg.text && (
        <div className={`alert alert-${msg.type}`} style={{ marginBottom: 14 }}>
          {msg.text}
        </div>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Color</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Min Threshold</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 32 }}>
                  <span className="spinner" />
                </td>
              </tr>
            ) : (
              filtered.map((item, i) => (
                <tr
                  key={i}
                  style={{
                    background:
                      item.stock_qty === 0
                        ? "#fff5f5"
                        : item.stock_qty <= item.low_stock_threshold
                          ? "#fffde7"
                          : "transparent",
                  }}
                >
                  <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>
                    {item.sku}
                  </td>
                  <td>{item.size || "—"}</td>
                  <td>{item.color || "—"}</td>
                  <td>{fmtCurrency(item.variant_price || item.base_price)}</td>
                  <td
                    style={{
                      fontWeight: 800,
                      fontSize: 16,
                      color:
                        item.stock_qty === 0
                          ? "var(--danger)"
                          : item.stock_qty <= item.low_stock_threshold
                            ? "var(--warning)"
                            : "var(--success)",
                    }}
                  >
                    {item.stock_qty}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {item.low_stock_threshold}
                  </td>
                  <td>
                    {item.stock_qty === 0 ? (
                      <span className="badge badge-danger">Out of Stock</span>
                    ) : item.stock_qty <= item.low_stock_threshold ? (
                      <span className="badge badge-warning">Low Stock</span>
                    ) : (
                      <span className="badge badge-success">OK</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => {
                          setModal({ item, mode: "adjust" });
                          setAdjustVal(item.stock_qty);
                          setNote("");
                        }}
                      >
                        Adjust
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setModal({ item, mode: "threshold" });
                          setAdjustVal(item.low_stock_threshold);
                        }}
                      >
                        Threshold
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">📦</span>
            <div className="empty-state-text">No inventory found</div>
          </div>
        )}
      </div>

      {modal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setModal(null)}
        >
          <div className="modal modal-sm">
            <div className="modal-title">
              {modal.mode === "adjust"
                ? "📝 Adjust Stock"
                : "⚠️ Set Low Stock Threshold"}
            </div>
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                background: "var(--bg)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div style={{ fontWeight: 700 }}>{modal.item.product_name}</div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                SKU: {modal.item.sku} · Current Stock:{" "}
                <strong>{modal.item.stock_qty}</strong>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">
                {modal.mode === "adjust"
                  ? "New Stock Quantity"
                  : "Minimum Stock Level"}
              </label>
              <input
                className="form-control"
                type="number"
                min="0"
                value={adjustVal}
                onChange={(e) => setAdjustVal(e.target.value)}
                autoFocus
              />
            </div>
            {modal.mode === "adjust" && (
              <div className="form-group">
                <label className="form-label">Reason / Note</label>
                <input
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Damaged goods, count correction..."
                />
              </div>
            )}
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={
                  modal.mode === "adjust" ? handleAdjust : handleThreshold
                }
                disabled={saving}
              >
                {saving ? (
                  <span className="spinner" />
                ) : modal.mode === "adjust" ? (
                  "Update Stock"
                ) : (
                  "Set Threshold"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockManager;
