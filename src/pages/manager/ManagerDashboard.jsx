import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDailySummary, getRevenueByPeriod, getTopProducts } from '../../services/reportService';
import { getLowStock } from '../../services/stockService';
import { fmtCurrency } from '../../utils/formatters';

const MiniChart = ({ data }) => {
  if (!data?.length) return <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No data yet</div>;
  const max = Math.max(...data.map(d => parseFloat(d.revenue)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {data.map((d, i) => {
        const h = Math.max(4, (parseFloat(d.revenue) / max) * 76);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
            <div title={fmtCurrency(d.revenue)} style={{ width: '100%', height: h, background: 'var(--pink)', opacity: 0.8, borderRadius: '3px 3px 0 0' }} />
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
              {new Date(d.date).toLocaleDateString('en-LK', { weekday: 'short' })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ManagerDashboard = () => {
  const { user } = useAuth();
  const branchId = user?.branchId || null;

  const [summary, setSummary]         = useState(null);
  const [chartData, setChartData]     = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [errors, setErrors]           = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const errs = {};

      const safe = async (key, fn) => {
        try { return await fn(); }
        catch (err) {
          const msg = err.response?.data?.error || err.message;
          console.error(`Dashboard [${key}] error:`, msg);
          errs[key] = msg;
          return null;
        }
      };

      const params = branchId ? { branchId } : {};

      const [s, c, tp, ls] = await Promise.all([
        safe('daily_summary',  () => getDailySummary(params)),
        safe('revenue_7d',     () => getRevenueByPeriod({ days: 7, ...params })),
        safe('top_products',   () => getTopProducts({ limit: 5, days: 30, ...params })),
        safe('low_stock',      () => getLowStock(params)),
      ]);

      if (s)  setSummary(s);
      if (c)  setChartData(c);
      if (tp) setTopProducts(tp);
      if (ls) setLowStock(ls);
      setErrors(errs);
      setLoading(false);
    };
    load();
  }, [branchId]);

  if (loading) return (
    <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <span className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  );

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="page-content">
      {hasErrors && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ Some data could not be loaded:</div>
          {Object.entries(errors).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, color: '#856404', marginBottom: 2 }}>
              <strong>{k}:</strong> {v}
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#856404', marginTop: 6 }}>
            Check the backend terminal for the full error details.
          </div>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi-card" style={{ '--kpi-color': 'var(--pink)' }}>
          <span className="kpi-icon">💰</span>
          <div className="kpi-value">{fmtCurrency(summary?.total_revenue || 0)}</div>
          <div className="kpi-label">Today's Revenue</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#2196F3' }}>
          <span className="kpi-icon">🧾</span>
          <div className="kpi-value">{summary?.total_transactions || 0}</div>
          <div className="kpi-label">Today's Sales</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': '#4CAF50' }}>
          <span className="kpi-icon">📊</span>
          <div className="kpi-value">{fmtCurrency(summary?.avg_sale || 0)}</div>
          <div className="kpi-label">Avg Sale Value</div>
        </div>
        <div className="kpi-card" style={{ '--kpi-color': lowStock.length > 0 ? '#FF9800' : '#4CAF50' }}>
          <span className="kpi-icon">{lowStock.length > 0 ? '⚠️' : '✅'}</span>
          <div className="kpi-value">{lowStock.length}</div>
          <div className="kpi-label">Low Stock Alerts</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Revenue — Last 7 Days</div></div>
          <MiniChart data={chartData} />
        </div>
        <div className="card">
          <div className="card-header"><div className="card-title">⚠️ Low Stock Items</div></div>
          {lowStock.length === 0 ? (
            <div className="empty-state"><span className="empty-state-icon">✅</span><div className="empty-state-text">All stock levels OK</div></div>
          ) : (
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Stock</th></tr></thead>
              <tbody>
                {lowStock.slice(0, 6).map((ls, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ls.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ls.size} {ls.color && `· ${ls.color}`}</div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{ls.sku}</td>
                    <td><span className={`badge ${ls.stock_qty === 0 ? 'badge-danger' : 'badge-warning'}`}>{ls.stock_qty}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header"><div className="card-title">Top Products This Month</div></div>
        {topProducts.length === 0 ? (
          <div className="empty-state"><span className="empty-state-icon">📦</span><div className="empty-state-text">No sales data yet</div></div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Product</th><th>SKU</th><th>Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text-muted)' }}>#{i + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.product_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.size} {p.color && `· ${p.color}`}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.sku}</td>
                  <td><span className="badge badge-info">{p.total_sold}</span></td>
                  <td style={{ fontWeight: 700 }}>{fmtCurrency(p.total_revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ManagerDashboard;
