import React, { useState, useEffect } from 'react';
import { getInventory, getLowStock } from '../../services/stockService';
import { getBranches } from '../../services/branchService';
import { fmtCurrency } from '../../utils/formatters';
import { exportToCSV } from '../../utils/csvExport';

const OwnerStock = () => {
  const [inventory, setInventory] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('inventory');
  const [exportNote, setExportNote] = useState('');

  useEffect(() => {
    getBranches().then(b => setBranches(b.filter(x => x.is_active)));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadData = async () => {
      setLoading(true);
      try {
        const [inv, ls] = await Promise.all([
          getInventory({ branchId: branchId || undefined }),
          getLowStock({ branchId: branchId || undefined }),
        ]);
        if (!cancelled) {
          setInventory(inv);
          setLowStock(ls);
        }
      } catch (err) { if (!cancelled) console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    };
    loadData();
    return () => { cancelled = true; }; // cleanup prevents stale state updates
  }, [branchId]);

  const filtered = inventory.filter(i =>
    `${i.product_name} ${i.sku} ${i.color} ${i.size}`.toLowerCase().includes(search.toLowerCase())
  );

  const exportInventory = async () => {
    const result = await exportToCSV('inventory.csv', [
      { label: 'Product', value: 'product_name' },
      { label: 'SKU', value: 'sku' },
      { label: 'Size', value: 'size' },
      { label: 'Color', value: 'color' },
      { label: 'Price', value: (r) => r.variant_price || r.base_price },
      { label: 'Branch', value: 'branch_name' },
      { label: 'Stock', value: 'stock_qty' },
    ], filtered);
    if (result.saved) {
      setExportNote(`Saved to ${result.path}`);
      setTimeout(() => setExportNote(''), 4000);
    }
  };

  return (
    <div className="page-content">
      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <label className="form-label">Filter by Branch</label>
          <select className="form-control" style={{ minWidth: 200 }} value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">All Branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, maxWidth: 320 }}>
          <label className="form-label">Search Product</label>
          <input className="form-control" placeholder="Product name, SKU, color..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline btn-sm" onClick={exportInventory} style={{ height: 'fit-content' }}>⬇ Export CSV</button>
          <div className="card" style={{ padding: '10px 16px', textAlign: 'center', border: '1.5px solid var(--border)' }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{filtered.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total Variants</div>
          </div>
          <div className="card" style={{ padding: '10px 16px', textAlign: 'center', border: `1.5px solid ${lowStock.length > 0 ? 'var(--warning-bg)' : 'var(--border)'}` }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: lowStock.length > 0 ? 'var(--warning)' : 'var(--success)' }}>{lowStock.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Low Stock</div>
          </div>
        </div>
      </div>

      {exportNote && <div className="alert alert-success" style={{ marginBottom: 16 }}>{exportNote}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--border)' }}>
        {[{ id: 'inventory', label: `📦 All Inventory (${filtered.length})` }, { id: 'low-stock', label: `⚠️ Low Stock (${lowStock.length})` }].map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, marginBottom: -2,
            color: activeTab === t.id ? 'var(--pink)' : 'var(--text-sub)',
            borderBottom: activeTab === t.id ? '2px solid var(--pink)' : '2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" style={{ width: 32, height: 32 }} /></div>
      ) : activeTab === 'inventory' ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Product</th><th>SKU</th><th>Size</th><th>Color</th><th>Price</th><th>Branch</th><th>Stock</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.product_name}</div>
                    {item.category_name && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.category_name}</div>}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.sku}</td>
                  <td>{item.size || '—'}</td>
                  <td>{item.color || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{fmtCurrency(item.variant_price || item.base_price)}</td>
                  <td style={{ fontSize: 12 }}>{item.branch_name}</td>
                  <td style={{ fontWeight: 700, fontSize: 15 }}>{item.stock_qty}</td>
                  <td>
                    {item.stock_qty === 0 ? <span className="badge badge-danger">Out of Stock</span>
                      : item.stock_qty <= item.low_stock_threshold ? <span className="badge badge-warning">Low Stock</span>
                      : <span className="badge badge-success">In Stock</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state"><span className="empty-state-icon">📦</span><div className="empty-state-text">No inventory found</div></div>
          )}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Size</th><th>Branch</th><th>Stock</th><th>Threshold</th></tr></thead>
            <tbody>
              {lowStock.map((item, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.sku}</td>
                  <td>{item.size || '—'}</td>
                  <td>{item.branch_name}</td>
                  <td><span className={`badge ${item.stock_qty === 0 ? 'badge-danger' : 'badge-warning'}`}>{item.stock_qty}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>Min: {item.low_stock_threshold}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lowStock.length === 0 && (
            <div className="empty-state"><span className="empty-state-icon">✅</span><div className="empty-state-text">All stock levels are healthy!</div></div>
          )}
        </div>
      )}
    </div>
  );
};

export default OwnerStock;
