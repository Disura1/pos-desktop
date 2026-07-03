import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getInventory, transferStock } from '../../services/stockService';
import { getBranches } from '../../services/branchService';
import { fmtCurrency } from '../../utils/formatters';

const TransferStock = () => {
  const { user } = useAuth();
  const branchId = user?.branchId;
  const [inventory, setInventory] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [toBranchId, setToBranchId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  useEffect(() => {
    getInventory({ branchId }).then(setInventory);
    getBranches().then(b => setBranches(b.filter(x => x.is_active && parseInt(x.id) !== parseInt(branchId))));
  }, [branchId]);

  const filtered = inventory.filter(i =>
    `${i.product_name} ${i.sku}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleTransfer = async () => {
    if (!selected || !toBranchId || !quantity || parseInt(quantity) <= 0) return;
    if (parseInt(quantity) > selected.stock_qty) { showMsg('Insufficient stock!', 'danger'); return; }
    setSaving(true);
    try {
      await transferStock({
        variant_id: selected.variant_id, from_branch_id: branchId,
        to_branch_id: parseInt(toBranchId), quantity: parseInt(quantity), note,
      });
      showMsg(`✅ Transferred ${quantity} units of ${selected.sku} successfully!`);
      setSelected(null); setToBranchId(''); setQuantity(''); setNote(''); setSearch('');
      getInventory({ branchId }).then(setInventory);
    } catch (err) { showMsg(err.response?.data?.error || 'Transfer failed', 'danger'); }
    finally { setSaving(false); }
  };

  return (
    <div className="page-content">
      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">1. Select Product to Transfer</div></div>
          <input
            className="form-control"
            style={{ marginBottom: 12 }}
            placeholder="Search product or SKU..."
            value={search}
            onChange={e => { setSearch(e.target.value); setSelected(null); }}
          />
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {filtered.map((item, i) => (
              <div
                key={i}
                onClick={() => item.stock_qty > 0 && setSelected(item)}
                style={{
                  padding: '10px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 6,
                  cursor: item.stock_qty > 0 ? 'pointer' : 'not-allowed',
                  opacity: item.stock_qty === 0 ? 0.5 : 1,
                  border: `1.5px solid ${selected?.sku === item.sku ? 'var(--pink)' : 'var(--border)'}`,
                  background: selected?.sku === item.sku ? 'var(--pink-light)' : 'var(--card)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.product_name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {item.sku} {item.size && `· ${item.size}`} {item.color && `· ${item.color}`}
                </div>
                <div style={{ fontSize: 12, marginTop: 3 }}>
                  Available: <strong style={{ color: item.stock_qty === 0 ? 'var(--danger)' : 'var(--success)' }}>{item.stock_qty}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">2. Transfer Details</div></div>

          {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 12 }}>{msg.text}</div>}

          {selected ? (
            <>
              <div style={{ padding: '12px 14px', background: 'var(--pink-light)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: 'var(--pink-dark)' }}>{selected.product_name}</div>
                <div style={{ fontSize: 12, color: 'var(--pink-dark)' }}>{selected.sku} · Available: <strong>{selected.stock_qty}</strong></div>
              </div>

              <div className="form-group">
                <label className="form-label">Transfer To Branch *</label>
                {branches.length === 0 ? (
                  <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--text-muted)' }}>
                    ⚠️ No other active branches available to transfer to.
                  </div>
                ) : (
                  <select className="form-control" value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
                    <option value="">Select destination branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                  </select>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Quantity to Transfer *</label>
                <input
                  className="form-control"
                  type="number" min="1" max={selected.stock_qty}
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  placeholder={`Max: ${selected.stock_qty}`}
                />
                {quantity && (
                  <div style={{ fontSize: 12, color: 'var(--text-sub)', marginTop: 4 }}>
                    Remaining after transfer: <strong>{Math.max(0, selected.stock_qty - parseInt(quantity || 0))}</strong>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Note (Optional)</label>
                <input
                  className="form-control"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Transfer reason..."
                />
              </div>

              <button
                className="btn btn-primary btn-block btn-lg"
                onClick={handleTransfer}
                disabled={saving || !toBranchId || !quantity || parseInt(quantity) <= 0}
              >
                {saving ? <span className="spinner" /> : '🔄 Confirm Transfer'}
              </button>
            </>
          ) : (
            <div className="empty-state">
              <span className="empty-state-icon">👈</span>
              <div className="empty-state-text">Select a product to transfer</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferStock;
