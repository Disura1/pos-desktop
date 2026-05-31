import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSaleHistory, getSaleDetail } from '../../services/saleService';
import { printReceipt } from '../../utils/printUtils';
import { fmtCurrency, fmtDateTime } from '../../utils/formatters';

const SalesHistory = () => {
  const { user } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [printing, setPrinting] = useState(false);

  const load = () => {
    setLoading(true);
    getSaleHistory({ branchId: user?.branchId, limit: 30 })
      .then(setSales).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const viewDetail = async (saleId) => {
    const data = await getSaleDetail(saleId);
    setDetail(data);
  };

  const handleReprint = async () => {
    if (!detail) return;
    setPrinting(true);
    await printReceipt({ sale: detail, items: detail.items, branchName: user.branchName, cashierName: user.fullName || user.username });
    setPrinting(false);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>Last {sales.length} transactions</div>
        <button className="btn btn-outline btn-sm" onClick={load}>🔄 Refresh</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Sale #</th><th>Date & Time</th><th>Items</th><th>Discount</th><th>Total</th><th>Payment</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></td></tr>
            ) : sales.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 700 }}>#{s.id}</td>
                <td style={{ fontSize: 12 }}>{fmtDateTime(s.sale_date)}</td>
                <td>{s.item_count}</td>
                <td style={{ color: 'var(--success)', fontSize: 12 }}>
                  {parseFloat(s.discount_amount) > 0 ? `− ${fmtCurrency(s.discount_amount)}` : '—'}
                </td>
                <td style={{ fontWeight: 700 }}>{fmtCurrency(s.total_amount)}</td>
                <td><span className={`badge ${s.payment_method === 'cash' ? 'badge-success' : 'badge-info'}`}>{s.payment_method}</span></td>
                <td>
                  <button className="btn btn-ghost btn-sm" onClick={() => viewDetail(s.id)}>View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && sales.length === 0 && (
          <div className="empty-state"><span className="empty-state-icon">🧾</span><div className="empty-state-text">No sales today</div></div>
        )}
      </div>

      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal">
            <div className="modal-title">🧾 Sale #{detail.id} Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, fontSize: 13 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>Date:</span> {fmtDateTime(detail.sale_date)}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Cashier:</span> {detail.cashier_name}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Payment:</span> <span className="badge badge-info">{detail.payment_method}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>Branch:</span> {detail.branch_name}</div>
            </div>
            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table>
                <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                <tbody>
                  {detail.items?.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.size} {item.color && `· ${item.color}`}</div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.sku}</td>
                      <td>{item.quantity}</td>
                      <td>{fmtCurrency(item.unit_price)}</td>
                      <td style={{ fontWeight: 600 }}>{fmtCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ background: 'var(--bg)', padding: '12px 14px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>Subtotal</span><span>{fmtCurrency(detail.subtotal)}</span>
              </div>
              {parseFloat(detail.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: 'var(--success)' }}>
                  <span>Discount</span><span>− {fmtCurrency(detail.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16 }}>
                <span>TOTAL</span><span>{fmtCurrency(detail.total_amount)}</span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetail(null)}>Close</button>
              <button className="btn btn-outline" onClick={handleReprint} disabled={printing}>
                {printing ? <span className="spinner" /> : '🖨️ Reprint Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesHistory;
