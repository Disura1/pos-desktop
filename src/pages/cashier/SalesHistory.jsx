import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getSaleHistory, getSaleDetail } from '../../services/saleService';
import { printReceipt } from '../../utils/printUtils';
import { fmtCurrency, fmtDateTime, fmtDate } from '../../utils/formatters';

const today     = () => new Date().toISOString().slice(0, 10);
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); };

const PAYMENT_OPTIONS = [
  { value: 'all',  label: 'All Methods' },
  { value: 'cash', label: '💵 Cash' },
  { value: 'card', label: '💳 Card' },
];

const DATE_PRESETS = [
  { value: 'all',       label: 'All' },
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'custom',    label: 'Custom Date' },
];

const SalesHistory = () => {
  const { user } = useAuth();

  // Server-side filters
  const [datePreset,  setDatePreset]  = useState('today');
  const [customDate,  setCustomDate]  = useState(today());

  // Client-side filters
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [minPrice,      setMinPrice]      = useState('');
  const [maxPrice,      setMaxPrice]      = useState('');
  const [searchId,      setSearchId]      = useState('');

  // Data
  const [sales,    setSales]   = useState([]);
  const [loading,  setLoading] = useState(false);
  const [detail,   setDetail]  = useState(null);
  const [printing, setPrinting] = useState(false);

  // Compute which date to send to API
  const apiDate = useMemo(() => {
    if (datePreset === 'today')     return today();
    if (datePreset === 'yesterday') return yesterday();
    if (datePreset === 'custom')    return customDate;
    return null; // 'all'
  }, [datePreset, customDate]);

  const load = () => {
    setLoading(true);
    getSaleHistory({
      branchId: user?.branchId || undefined,
      date:     apiDate || undefined,
      limit:    200,
    }).then(setSales).catch(() => setSales([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [apiDate]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let rows = sales;
    if (paymentFilter !== 'all')
      rows = rows.filter(s => s.payment_method === paymentFilter);
    if (minPrice !== '')
      rows = rows.filter(s => parseFloat(s.total_amount) >= parseFloat(minPrice));
    if (maxPrice !== '')
      rows = rows.filter(s => parseFloat(s.total_amount) <= parseFloat(maxPrice));
    if (searchId.trim() !== '')
      rows = rows.filter(s =>
        String(s.id).includes(searchId.trim()) ||
        (s.receipt_number || '').toLowerCase().includes(searchId.trim().toLowerCase())
      );
    return rows;
  }, [sales, paymentFilter, minPrice, maxPrice, searchId]);

  // Summary stats of filtered results
  const stats = useMemo(() => ({
    count:    filtered.length,
    revenue:  filtered.reduce((s, r) => s + parseFloat(r.total_amount), 0),
    cash:     filtered.filter(r => r.payment_method === 'cash').length,
    card:     filtered.filter(r => r.payment_method === 'card').length,
  }), [filtered]);

  const hasActiveFilters = paymentFilter !== 'all' || minPrice || maxPrice || searchId;

  const resetFilters = () => {
    setPaymentFilter('all');
    setMinPrice('');
    setMaxPrice('');
    setSearchId('');
  };

  const viewDetail = async (saleId) => {
    const data = await getSaleDetail(saleId);
    setDetail(data);
  };

  const handleReprint = async () => {
    if (!detail) return;
    setPrinting(true);
    await printReceipt({
      sale: detail, items: detail.items,
      branchName: user.branchName,
      cashierName: user.fullName || user.username,
    });
    setPrinting(false);
  };

  return (
    <div className="page-content">

      {/* ── Filter Bar ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>

        {/* Row 1: Date presets + search */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>

          {/* Date preset chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            {DATE_PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${datePreset === p.value ? 'var(--pink)' : 'var(--border)'}`,
                  background: datePreset === p.value ? 'var(--pink)' : 'white',
                  color: datePreset === p.value ? 'white' : 'var(--text)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date picker — shown only when Custom is selected */}
          {datePreset === 'custom' && (
            <input
              type="date"
              className="form-control"
              style={{ width: 160, fontSize: 13 }}
              value={customDate}
              max={today()}
              onChange={e => setCustomDate(e.target.value)}
            />
          )}

          {/* Sale ID search */}
          <input
            className="form-control"
            style={{ width: 150, fontSize: 13 }}
            placeholder="Search receipt / ID"
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
          />

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {hasActiveFilters && (
              <button className="btn btn-danger btn-sm" onClick={resetFilters}>✕ Reset Filters</button>
            )}
            <button className="btn btn-outline btn-sm" onClick={load} disabled={loading}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Row 2: Payment + Price range */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>

          {/* Payment method */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Payment Method</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {PAYMENT_OPTIONS.map(o => (
                <button
                  key={o.value}
                  onClick={() => setPaymentFilter(o.value)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: `1.5px solid ${paymentFilter === o.value ? 'var(--pink)' : 'var(--border)'}`,
                    background: paymentFilter === o.value ? 'var(--pink-light)' : 'white',
                    color: paymentFilter === o.value ? 'var(--pink-dark)' : 'var(--text)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min / Max price */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>Price Range (LKR)</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                className="form-control"
                style={{ width: 120, fontSize: 13 }}
                type="number"
                min="0"
                placeholder="Min price"
                value={minPrice}
                onChange={e => setMinPrice(e.target.value)}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>
              <input
                className="form-control"
                style={{ width: 120, fontSize: 13 }}
                type="number"
                min="0"
                placeholder="Max price"
                value={maxPrice}
                onChange={e => setMaxPrice(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Summary Stats ──────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Transactions',  value: stats.count,            color: 'var(--pink)',    icon: '🧾' },
          { label: 'Total Revenue', value: fmtCurrency(stats.revenue), color: '#4CAF50',   icon: '💰' },
          { label: 'Cash Sales',    value: stats.cash,             color: '#2196F3',        icon: '💵' },
          { label: 'Card Sales',    value: stats.card,             color: '#9C27B0',        icon: '💳' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ flex: 1, padding: '12px 16px', borderLeft: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.icon} {s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Table ──────────────────────────────────────────── */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sale #</th>
              <th>Date & Time</th>
              <th>Items</th>
              <th>Discount</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></td></tr>
            ) : filtered.map(s => (
              <tr key={s.id}>
                <td style={{ fontWeight: 700, color: 'var(--pink)', fontFamily: 'monospace', fontSize: 12 }}>
                  {s.receipt_number || `#${s.id}`}
                </td>
                <td style={{ fontSize: 12 }}>{fmtDateTime(s.sale_date)}</td>
                <td style={{ textAlign: 'center' }}>{s.item_count}</td>
                <td style={{ color: 'var(--success)', fontSize: 12 }}>
                  {parseFloat(s.discount_amount) > 0 ? `− ${fmtCurrency(s.discount_amount)}` : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                </td>
                <td style={{ fontWeight: 700 }}>{fmtCurrency(s.total_amount)}</td>
                <td>
                  <span className={`badge ${s.payment_method === 'cash' ? 'badge-success' : 'badge-info'}`}>
                    {s.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                  </span>
                </td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => viewDetail(s.id)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🧾</span>
            <div className="empty-state-text">
              {sales.length === 0 ? 'No sales for this period' : 'No results match your filters'}
            </div>
            {hasActiveFilters && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={resetFilters}>
                Clear Filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Sale Detail Modal ───────────────────────────────── */}
      {detail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="modal">
            <div className="modal-title">🧾 {detail.receipt_number || `#${detail.id}`} Details</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16, fontSize: 13 }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>DATE & TIME</span>
                {fmtDateTime(detail.sale_date)}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>CASHIER</span>
                {detail.cashier_name}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>PAYMENT</span>
                <span className={`badge ${detail.payment_method === 'cash' ? 'badge-success' : 'badge-info'}`}>
                  {detail.payment_method === 'cash' ? '💵 Cash' : '💳 Card'}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 2 }}>BRANCH</span>
                {detail.branch_name}
              </div>
            </div>

            <div className="table-wrap" style={{ marginBottom: 14 }}>
              <table>
                <thead>
                  <tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {detail.items?.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {item.size && `Size: ${item.size}`} {item.color && `· ${item.color}`}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.sku}</td>
                      <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                      <td>{fmtCurrency(item.unit_price)}</td>
                      <td style={{ fontWeight: 600 }}>{fmtCurrency(item.total_price || item.unit_price * item.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'var(--bg)', padding: '14px 16px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'var(--text-sub)' }}>
                <span>Subtotal</span><span>{fmtCurrency(detail.subtotal)}</span>
              </div>
              {parseFloat(detail.discount_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'var(--success)' }}>
                  <span>Discount ({detail.discount_name || ''})</span>
                  <span>− {fmtCurrency(detail.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17, borderTop: '2px solid var(--border)', paddingTop: 8 }}>
                <span>TOTAL</span><span style={{ color: 'var(--pink)' }}>{fmtCurrency(detail.total_amount)}</span>
              </div>
              {parseFloat(detail.change_amount) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 6, color: 'var(--text-sub)' }}>
                  <span>Change Given</span><span>{fmtCurrency(detail.change_amount)}</span>
                </div>
              )}
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
