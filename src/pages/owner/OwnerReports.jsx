import React, { useState, useEffect } from 'react';
import { getDailySummary, getRevenueByPeriod, getTopProducts, getDateRangeReport } from '../../services/reportService';
import { getBranches } from '../../services/branchService';
import { getSaleHistory } from '../../services/saleService';
import { fmtCurrency, fmtDate, fmtDateTime } from '../../utils/formatters';

const localDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const today   = () => localDateStr();
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return localDateStr(d); };

const MiniBarChart = ({ data, valueKey = 'revenue' }) => {
  if (!data?.length) return <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: 16 }}>No data for this period</div>;
  const max = Math.max(...data.map(d => parseFloat(d[valueKey])), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100, paddingTop: 4 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (parseFloat(d[valueKey]) / max) * 96);
        return (
          <div key={i} title={fmtCurrency(d[valueKey])} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ width: '100%', height: h, background: 'var(--pink)', borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3, whiteSpace: 'nowrap' }}>
              {fmtDate(d.date).slice(0, 6)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const handleExport = async () => {
  const csv = 'Date,Branch,Total\n' + rows.map(r => `${r.date},${r.branch},${r.total}`).join('\n');
  const result = await window.electronAPI.exportFile('sales-report.csv', csv);
  if (result.saved) showMsg('success', `Saved to ${result.path}`);
};

const OwnerReports = () => {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [startDate, setStartDate] = useState(daysAgo(29));
  const [endDate, setEndDate] = useState(today());
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => { getBranches().then(b => setBranches(b.filter(x => x.is_active))); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const days = Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000) + 1;
      const [s, c, tp, sl] = await Promise.all([
        getDateRangeReport({ startDate, endDate, branchId: branchId || null }),
        getRevenueByPeriod({ days, branchId: branchId || null }),
        getTopProducts({ days, branchId: branchId || null, limit: 10 }),
        getSaleHistory({ branchId: branchId || null, limit: 200, date: null }),
      ]);
      setSummary(s.summary);
      setChartData(c);
      setTopProducts(tp);
      setSales(sl);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'chart', label: 'Revenue Chart' },
    { id: 'products', label: 'Top Products' },
    { id: 'sales', label: 'Sales List' },
  ];

  return (
    <div className="page-content">
      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label">Branch</label>
            <select className="form-control" style={{ minWidth: 180 }} value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">From</label>
            <input className="form-control" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input className="form-control" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={loadData} disabled={loading}>
            {loading ? <span className="spinner" /> : '🔍 Generate Report'}
          </button>
          <div style={{ display: 'flex', gap: 6 }}>
            {['7d','30d','90d'].map(p => (
              <button key={p} className="btn btn-outline btn-sm" onClick={() => { setStartDate(daysAgo(parseInt(p))); setEndDate(today()); }}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none', background: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: 13,
              color: activeTab === t.id ? 'var(--pink)' : 'var(--text-sub)',
              borderBottom: activeTab === t.id ? '2px solid var(--pink)' : '2px solid transparent',
              marginBottom: -2,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && summary && (
        <div className="kpi-grid">
          <div className="kpi-card" style={{ '--kpi-color': 'var(--pink)' }}>
            <span className="kpi-icon">💰</span>
            <div className="kpi-value">{fmtCurrency(summary.total_revenue)}</div>
            <div className="kpi-label">Total Revenue</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#2196F3' }}>
            <span className="kpi-icon">🧾</span>
            <div className="kpi-value">{summary.total_transactions}</div>
            <div className="kpi-label">Total Transactions</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#4CAF50' }}>
            <span className="kpi-icon">📊</span>
            <div className="kpi-value">{fmtCurrency(summary.avg_sale)}</div>
            <div className="kpi-label">Average Sale Value</div>
          </div>
          <div className="kpi-card" style={{ '--kpi-color': '#FF9800' }}>
            <span className="kpi-icon">🏷️</span>
            <div className="kpi-value">{fmtCurrency(summary.total_discounts)}</div>
            <div className="kpi-label">Total Discounts Given</div>
          </div>
        </div>
      )}

      {/* Chart Tab */}
      {activeTab === 'chart' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Daily Revenue</div></div>
          <MiniBarChart data={chartData} />
          <div style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th>Date</th><th>Revenue</th><th>Transactions</th></tr></thead>
              <tbody>
                {chartData.map((d, i) => (
                  <tr key={i}>
                    <td>{fmtDate(d.date)}</td>
                    <td style={{ fontWeight: 600 }}>{fmtCurrency(d.revenue)}</td>
                    <td>{d.transactions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Products Tab */}
      {activeTab === 'products' && (
        <div className="card">
          <div className="card-header"><div className="card-title">Top Selling Products</div></div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Sold</th><th>Revenue</th></tr></thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>#{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.size} · {p.color}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</td>
                    <td><span className="badge badge-info">{p.total_sold} pcs</span></td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(p.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sales List Tab */}
      {activeTab === 'sales' && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Sales</div>
            <span style={{ fontSize: 12, color: 'var(--text-sub)' }}>{sales.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sale #</th><th>Date & Time</th><th>Branch</th><th>Cashier</th><th>Items</th><th>Discount</th><th>Total</th><th>Payment</th></tr></thead>
              <tbody>
                {sales.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>
                      {s.receipt_number || `#${s.id}`}
                    </td>
                    <td style={{ fontSize: 12 }}>{fmtDateTime(s.sale_date)}</td>
                    <td style={{ fontSize: 12 }}>{s.branch_name}</td>
                    <td style={{ fontSize: 12 }}>{s.cashier_name}</td>
                    <td>{s.item_count}</td>
                    <td style={{ color: 'var(--success)', fontSize: 12 }}>{parseFloat(s.discount_amount) > 0 ? `− ${fmtCurrency(s.discount_amount)}` : '—'}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(s.total_amount)}</td>
                    <td><span className={`badge ${s.payment_method === 'cash' ? 'badge-success' : 'badge-info'}`}>{s.payment_method}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default OwnerReports;
