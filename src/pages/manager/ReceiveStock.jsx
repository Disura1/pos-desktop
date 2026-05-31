import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInventory, receiveStock, getMovements } from '../../services/stockService';
import { fmtCurrency, fmtDateTime } from '../../utils/formatters';

const ReceiveStock = () => {
  const { user } = useAuth();
  const branchId = user?.branchId;
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  const load = () => {
    getInventory({ branchId }).then(setInventory);
    getMovements({ branchId, limit: 20 }).then(data => setMovements(data.filter(m => m.movement_type === 'receive')));
  };
  useEffect(() => { load(); }, [branchId]);

  const filtered = inventory.filter(i =>
    `${i.product_name} ${i.sku} ${i.color} ${i.size}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleReceive = async () => {
    if (!selected || !quantity || parseInt(quantity) <= 0) return;
    setSaving(true);
    try {
      await receiveStock({ variant_id: selected.variant_id, branch_id: branchId, quantity: parseInt(quantity), note });
      showMsg(`✅ Received ${quantity} units of ${selected.sku}`);
      setSelected(null); setQuantity(''); setNote(''); setSearch(''); load();
    } catch (err) { showMsg(err.response?.data?.error || 'Failed', 'danger'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-content">
      <div className="grid-2" style={{ gap: 20 }}>
        {/* Select Product */}
        <div>
          <div className="card">
            <div className="card-header"><div className="card-title">1. Select Product Variant</div></div>
            <input
              className="form-control"
              style={{ marginBottom: 12 }}
              placeholder="Search by product name or SKU..."
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
            />
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {filtered.slice(0, 30).map((item, i) => (
                <div
                  key={i}
                  onClick={() => setSelected(item)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    marginBottom: 6,
                    cursor: 'pointer',
                    border: `1.5px solid ${selected?.sku === item.sku ? 'var(--pink)' : 'var(--border)'}`,
                    background: selected?.sku === item.sku ? 'var(--pink-light)' : 'var(--card)',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    SKU: {item.sku} {item.size && `· Size: ${item.size}`} {item.color && `· ${item.color}`}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 3 }}>
                    Current Stock: <strong style={{ color: item.stock_qty === 0 ? 'var(--danger)' : 'var(--success)' }}>{item.stock_qty}</strong>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>{fmtCurrency(item.variant_price || item.base_price)}</span>
                  </div>
                </div>
              ))}
              {!search && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: 12 }}>Type to search products</div>}
            </div>
          </div>
        </div>

        {/* Receive Form */}
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><div className="card-title">2. Enter Quantity Received</div></div>

            {selected ? (
              <>
                <div style={{ padding: '12px 14px', background: 'var(--pink-light)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: 'var(--pink-dark)' }}>{selected.product_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--pink-dark)', marginTop: 2 }}>
                    {selected.sku} · {selected.size && `Size ${selected.size}`} {selected.color && `· ${selected.color}`}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Current Stock: <strong>{selected.stock_qty}</strong></div>
                </div>

                {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

                <div className="form-group">
                  <label className="form-label">Quantity Received *</label>
                  <input
                    className="form-control"
                    type="number" min="1"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                    autoFocus
                  />
                  {quantity && selected && (
                    <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                      New total: {selected.stock_qty + parseInt(quantity || 0)} units
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Note (Optional)</label>
                  <input
                    className="form-control"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Supplier delivery, ref #12345"
                  />
                </div>

                <button className="btn btn-primary btn-block btn-lg" onClick={handleReceive} disabled={saving || !quantity}>
                  {saving ? <span className="spinner" /> : `📥 Receive ${quantity || 0} Units`}
                </button>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">👈</span>
                <div className="empty-state-text">Select a product from the left panel</div>
              </div>
            )}
          </div>

          {/* Recent Receives */}
          <div className="card">
            <div className="card-title" style={{ marginBottom: 12 }}>Recent Receives</div>
            {movements.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 16 }}>No recent receives</div>
            ) : (
              <div>
                {movements.slice(0, 8).map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{m.product_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.sku} · {fmtDateTime(m.created_at)}</div>
                    </div>
                    <span className="badge badge-success">+{m.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiveStock;
