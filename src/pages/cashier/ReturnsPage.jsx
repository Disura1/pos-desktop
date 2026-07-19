import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { lookupSaleForReturn, searchSalesForReturn, processReturn, getReturnHistory } from "../../services/returnService";
import { fmtCurrency, fmtDateTime } from "../../utils/formatters";
import { printReceipt } from "../../utils/printUtils";

const ReturnsPage = () => {
  const { user } = useAuth();
  const [receiptNumber, setReceiptNumber] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [sale, setSale] = useState(null);
  const [items, setItems] = useState([]);
  const [returnQty, setReturnQty] = useState({});
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("cash");
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "success" });
  const [history, setHistory] = useState([]);
  const [historyBranchId, setHistoryBranchId] = useState("");
  const [historyStart, setHistoryStart] = useState("");
  const [historyEnd, setHistoryEnd] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const loadHistory = () => {
    getReturnHistory({
      limit: 200,
      branchId: historyBranchId || undefined,
      startDate: historyStart || undefined,
      endDate: historyEnd || undefined,
      search: historySearch || undefined,
    }).then(setHistory).catch(() => {});
  };
  useEffect(() => { loadHistory(); }, []);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg({ text: "", type: "success" }), 5000);
  };

  const handleSearch = async () => {
    if (!receiptNumber.trim() || receiptNumber.trim().length < 2) {
      showMsg("danger", "Enter at least 2 characters to search");
      return;
    }
    setSearching(true);
    setSale(null);
    setItems([]);
    setSearchResults([]);
    try {
      const results = await searchSalesForReturn(receiptNumber.trim());
      if (results.length === 0) {
        showMsg("danger", "No matching sale found");
      } else if (results.length === 1) {
        selectSale(results[0].receipt_number);
      } else {
        setSearchResults(results);
      }
    } catch (err) {
      showMsg("danger", err.response?.data?.error || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const selectSale = async (exactReceiptNumber) => {
    setLooking(true);
    setSearchResults([]);
    try {
      const data = await lookupSaleForReturn(exactReceiptNumber);
      setSale(data.sale);
      setItems(data.items);
      setRefundMethod(data.sale.payment_method || "cash");
      const initialQty = {};
      data.items.forEach((i) => { initialQty[i.sale_item_id] = 0; });
      setReturnQty(initialQty);
    } catch (err) {
      showMsg("danger", err.response?.data?.error || "Sale not found");
    } finally {
      setLooking(false);
    }
  };

  const setQty = (saleItemId, value, max) => {
    const v = Math.max(0, Math.min(max, parseInt(value) || 0));
    setReturnQty((prev) => ({ ...prev, [saleItemId]: v }));
  };

  // Client-side estimate only — the real refund is always computed server-side
  const discountRatio = sale && parseFloat(sale.subtotal) > 0
    ? parseFloat(sale.discount_amount || 0) / parseFloat(sale.subtotal) : 0;
  const estimatedRefund = items.reduce((sum, i) => {
    const qty = returnQty[i.sale_item_id] || 0;
    return sum + qty * parseFloat(i.unit_price) * (1 - discountRatio);
  }, 0);
  const hasSelection = Object.values(returnQty).some((q) => q > 0);

  const handleProcessReturn = async () => {
    const selected = items
      .filter((i) => (returnQty[i.sale_item_id] || 0) > 0)
      .map((i) => ({ saleItemId: i.sale_item_id, quantity: returnQty[i.sale_item_id] }));
    if (selected.length === 0) {
      showMsg("danger", "Select at least one item to return");
      return;
    }
    setSaving(true);
    try {
      const result = await processReturn({
        saleId: sale.id,
        items: selected,
        reason: reason || null,
        refundMethod,
      });
      showMsg("success", `✅ Refund of ${fmtCurrency(result.refundAmount)} processed successfully`);

      // Print a refund slip using the same receipt template, marked as a return
      await printReceipt({
        sale: {
          receipt_number: result.returnNumber,
          branch_address: sale.branch_address,
          branch_phone: sale.branch_phone,
          sale_date: result.createdAt,
          subtotal: -result.refundAmount,
          discount_amount: 0,
          total_amount: -result.refundAmount,
          amount_tendered: -result.refundAmount,
          change_amount: 0,
        },
        items: items
          .filter((i) => (returnQty[i.sale_item_id] || 0) > 0)
          .map((i) => ({
            product_name: `REFUND: ${i.product_name}`,
            sku: i.sku,
            size: i.size,
            color: i.color,
            quantity: returnQty[i.sale_item_id],
            total_price: -(returnQty[i.sale_item_id] * parseFloat(i.unit_price) * (1 - discountRatio)),
          })),
        branchName: sale.branch_name,
        cashierName: user.fullName || user.username,
      });

      setSale(null);
      setItems([]);
      setReceiptNumber("");
      setSearchResults([]);
      setReason("");
      loadHistory();
    } catch (err) {
      showMsg("danger", err.response?.data?.error || "Could not process return");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <h2 style={{ marginBottom: 16 }}>↩️ Returns & Refunds</h2>

      {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 16 }}>{msg.text}</div>}

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-title" style={{ marginBottom: 10 }}>Look Up Sale</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            className="form-control"
            placeholder="Type any part of the receipt number — e.g. 30, 000030, or TGMN-000030"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button className="btn btn-primary" onClick={handleSearch} disabled={searching || looking}>
            {searching || looking ? <span className="spinner" /> : "🔍 Search"}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
              {searchResults.length} matching sale(s) — select one:
            </div>
            {searchResults.map((r) => (
              <div
                key={r.id}
                onClick={() => selectSale(r.receipt_number)}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)",
                  marginBottom: 6, cursor: "pointer",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--pink-light)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div>
                  <div style={{ fontWeight: 700, fontFamily: "monospace" }}>{r.receipt_number}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {fmtDateTime(r.sale_date)} · {r.branch_name} · {r.cashier_name}
                  </div>
                </div>
                <div style={{ fontWeight: 700 }}>{fmtCurrency(r.total_amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {sale && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700 }}>{sale.receipt_number}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {fmtDateTime(sale.sale_date)} · {sale.branch_name} · Total: {fmtCurrency(sale.total_amount)}
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Purchased</th><th>Already Returned</th><th>Return Qty</th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.sale_item_id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{i.product_name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{i.size} · {i.color}</div>
                  </td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{i.sku}</td>
                  <td>{i.quantity}</td>
                  <td>{i.already_returned}</td>
                  <td>
                    {i.returnable_qty > 0 ? (
                      <input
                        type="number"
                        min="0"
                        max={i.returnable_qty}
                        className="form-control"
                        style={{ width: 80 }}
                        value={returnQty[i.sale_item_id] || 0}
                        onChange={(e) => setQty(i.sale_item_id, e.target.value, i.returnable_qty)}
                      />
                    ) : (
                      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Fully returned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "flex", gap: 14, marginTop: 16, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <label className="form-label">Reason (optional)</label>
              <input className="form-control" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Wrong size, defective, changed mind" />
            </div>
            <div>
              <label className="form-label">Refund Method</label>
              <select className="form-control" value={refundMethod} onChange={(e) => setRefundMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
              </select>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 800 }}>
              Estimated Refund: {fmtCurrency(estimatedRefund)}
            </div>
            <button className="btn btn-primary" disabled={!hasSelection || saving} onClick={handleProcessReturn}>
              {saving ? <span className="spinner" /> : "✅ Process Return"}
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-title" style={{ marginBottom: 10 }}>All Returns</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
          <div style={{ flex: "1 1 200px" }}>
            <label className="form-label">Search (return # or original receipt)</label>
            <input className="form-control" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="e.g. RE-000001 or TGMN-000030" />
          </div>
          <div>
            <label className="form-label">From</label>
            <input className="form-control" type="date" value={historyStart} onChange={(e) => setHistoryStart(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={historyEnd} onChange={(e) => setHistoryEnd(e.target.value)} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={loadHistory}>Filter</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setHistorySearch("");
              setHistoryStart("");
              setHistoryEnd("");
              getReturnHistory({ limit: 200 }).then(setHistory).catch(() => {});
            }}
          >
            ✕ Clear
          </button>
        </div>

        <table>
          <thead><tr><th>Return #</th><th>Date</th><th>Original Sale</th><th>Items</th><th>Refund</th><th>Reason</th><th>By</th></tr></thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.id}>
                <td style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700 }}>{r.return_number || `RE-${r.id}`}</td>
                <td style={{ fontSize: 12 }}>{fmtDateTime(r.created_at)}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{r.original_receipt_number}</td>
                <td>{r.item_count}</td>
                <td style={{ fontWeight: 700, color: "var(--danger)" }}>− {fmtCurrency(r.refund_amount)}</td>
                <td style={{ fontSize: 12 }}>{r.reason || "—"}</td>
                <td style={{ fontSize: 12 }}>{r.processed_by_name}</td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>No returns found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReturnsPage;