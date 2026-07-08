import React, { useState, useEffect } from "react";
import {
  getBranchComparison,
  getDailySummary,
  getRevenueByPeriod,
  getTopProducts,
} from "../../services/reportService";
import { getLowStock } from "../../services/stockService";
import { fmtCurrency } from "../../utils/formatters";

const MiniBarChart = ({ data }) => {
  if (!data || data.length === 0)
    return (
      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
        No data yet
      </div>
    );
  const max = Math.max(...data.map((d) => parseFloat(d.revenue)), 1);
  return (
    <div
      style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80 }}
    >
      {data.map((d, i) => {
        const h = Math.max(4, (parseFloat(d.revenue) / max) * 76);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              height: "100%",
            }}
          >
            <div
              title={fmtCurrency(d.revenue)}
              style={{
                width: "100%",
                height: h,
                background: "var(--pink)",
                borderRadius: "3px 3px 0 0",
                opacity: 0.85,
              }}
            />
            <div
              style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 3 }}
            >
              {new Date(String(d.date).slice(0, 10) + 'T00:00:00').toLocaleDateString("en-LK", {
                weekday: "short",
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const OwnerDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [branches, setBranches] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const errs = {};

      const safe = async (key, fn) => {
        try {
          return await fn();
        } catch (err) {
          const msg = err.response?.data?.error || err.message;
          console.error(`Dashboard [${key}] error:`, msg);
          errs[key] = msg;
          return null;
        }
      };

      const [s, b, c, tp, ls] = await Promise.all([
        safe("daily_summary", () => getDailySummary({})),
        safe("branch_comparison", () => getBranchComparison()),
        safe("revenue_7d", () => getRevenueByPeriod({ days: 7 })),
        safe("top_products", () => getTopProducts({ limit: 5, days: 30 })),
        safe("low_stock", () => getLowStock({})),
      ]);

      if (s) setSummary(s);
      if (b) setBranches(b);
      if (c) setChartData(c);
      if (tp) setTopProducts(tp);
      if (ls) setLowStock(ls);
      setErrors(errs);
      setLoading(false);
    };
    load();
  }, []);

  if (loading)
    return (
      <div
        className="page-content"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 300,
        }}
      >
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );

  const totalRevenue7d = chartData.reduce(
    (s, d) => s + parseFloat(d.revenue),
    0,
  );
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div className="page-content">
      {/* Show any API errors so we can debug */}
      {hasErrors && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            background: "#fff3cd",
            border: "1px solid #ffc107",
            borderRadius: 8,
          }}
        >
          <div style={{ fontWeight: 700, color: "#856404" }}>
            ⚠️ Some dashboard data could not be loaded. Please check your connection and try refreshing.
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ "--kpi-color": "var(--pink)" }}>
          <span className="kpi-icon">💰</span>
          <div className="kpi-value">
            {fmtCurrency(summary?.total_revenue || 0)}
          </div>
          <div className="kpi-label">Today's Revenue</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "#2196F3" }}>
          <span className="kpi-icon">🧾</span>
          <div className="kpi-value">{summary?.total_transactions || 0}</div>
          <div className="kpi-label">Today's Transactions</div>
        </div>
        <div className="kpi-card" style={{ "--kpi-color": "#4CAF50" }}>
          <span className="kpi-icon">🏪</span>
          <div className="kpi-value">{branches.length}</div>
          <div className="kpi-label">Active Branches</div>
        </div>
        <div
          className="kpi-card"
          style={{ "--kpi-color": lowStock.length > 0 ? "#FF9800" : "#4CAF50" }}
        >
          <span className="kpi-icon">{lowStock.length > 0 ? "⚠️" : "✅"}</span>
          <div className="kpi-value">{lowStock.length}</div>
          <div className="kpi-label">Low Stock Alerts</div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Revenue (Last 7 Days)</div>
              <div
                style={{ fontSize: 12, color: "var(--text-sub)", marginTop: 2 }}
              >
                Total: {fmtCurrency(totalRevenue7d)}
              </div>
            </div>
          </div>
          <MiniBarChart data={chartData} />
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Branch Performance (Today)</div>
          </div>
          {branches.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">🏪</span>
              <div className="empty-state-text">No branch data</div>
            </div>
          ) : (
            branches.map((b) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {b.branch_name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {b.today_transactions || 0} transactions
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--pink)",
                    }}
                  >
                    {fmtCurrency(b.today_revenue || 0)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    30d: {fmtCurrency(b.month_revenue || 0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <div className="card-title">Top Products (30 Days)</div>
          </div>
          {topProducts.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">📦</span>
              <div className="empty-state-text">No sales data yet</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {p.product_name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {p.sku} {p.size && `· ${p.size}`}{" "}
                        {p.color && `· ${p.color}`}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{p.total_sold}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {fmtCurrency(p.total_revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">
              ⚠️ Low Stock Alerts ({lowStock.length})
            </div>
          </div>
          {lowStock.length === 0 ? (
            <div className="empty-state">
              <span className="empty-state-icon">✅</span>
              <div className="empty-state-text">All stocks are healthy</div>
            </div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Branch</th>
                    <th>Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((ls, i) => (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          {ls.product_name}
                        </div>
                        <div
                          style={{ fontSize: 11, color: "var(--text-muted)" }}
                        >
                          {ls.sku} {ls.size && `· ${ls.size}`}
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{ls.branch_name}</td>
                      <td>
                        <span
                          className={`badge ${ls.stock_qty === 0 ? "badge-danger" : "badge-warning"}`}
                        >
                          {ls.stock_qty}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerDashboard;
