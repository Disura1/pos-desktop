import React, { useState, useEffect } from 'react';
import { getAllDiscounts, createDiscount, updateDiscount, deleteDiscount } from '../../services/discountService';
import { fmtCurrency } from '../../utils/formatters';

const empty = { name: '', type: 'percentage', value: '', min_amount: '', is_active: true };

const DiscountManager = () => {
  const [discounts, setDiscounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editDiscount, setEditDiscount] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const load = () => getAllDiscounts().then(setDiscounts).catch(console.error);
  useEffect(() => { load(); }, []);

  const showMsg = (text, type = 'success') => { setMsg({ text, type }); setTimeout(() => setMsg({ text: '', type: '' }), 3000); };

  const openCreate = () => { setForm(empty); setEditDiscount(null); setShowModal(true); };
  const openEdit = (d) => {
    setForm({ name: d.name, type: d.type, value: d.value, min_amount: d.min_amount || '', is_active: d.is_active });
    setEditDiscount(d); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.value) return;
    setSaving(true);
    try {
      if (editDiscount) await updateDiscount(editDiscount.id, form);
      else await createDiscount(form);
      showMsg(editDiscount ? 'Discount updated!' : 'Discount created!');
      setShowModal(false); load();
    } catch (err) { showMsg(err.response?.data?.error || 'Save failed', 'danger'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Deactivate discount "${d.name}"?`)) return;
    await deleteDiscount(d.id); load();
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: 'var(--text-sub)' }}>{discounts.length} discount(s)</div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Discount</button>
      </div>

      {msg.text && <div className={`alert alert-${msg.type}`} style={{ marginBottom: 14 }}>{msg.text}</div>}

      <div className="grid-3">
        {discounts.map(d => (
          <div key={d.id} className="card" style={{ borderTop: `4px solid ${d.is_active ? 'var(--pink)' : 'var(--border)'}`, opacity: d.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
              <span className={`badge ${d.is_active ? 'badge-success' : 'badge-gray'}`}>{d.is_active ? 'Active' : 'Off'}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--pink)', marginBottom: 6 }}>
              {d.type === 'percentage' ? `${d.value}%` : fmtCurrency(d.value)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-sub)', marginBottom: 14 }}>
              {d.type === 'percentage' ? 'Percentage Discount' : 'Fixed Amount Off'}
              {parseFloat(d.min_amount) > 0 && ` · Min: ${fmtCurrency(d.min_amount)}`}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-outline btn-sm" style={{ flex: 1 }} onClick={() => openEdit(d)}>Edit</button>
              {d.is_active && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(d)}>Disable</button>}
            </div>
          </div>
        ))}
        {discounts.length === 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            <div className="empty-state"><span className="empty-state-icon">🏷️</span><div className="empty-state-text">No discounts created yet</div></div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-title">{editDiscount ? '✏️ Edit Discount' : '🏷️ New Discount'}</div>
            <div className="form-group">
              <label className="form-label">Discount Name *</label>
              <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Weekend Special" autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Type *</label>
                <select className="form-control" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (LKR)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Value *</label>
                <input className="form-control" type="number" step="0.01" min="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder={form.type === 'percentage' ? '10 (= 10%)' : '500 (= LKR 500)'} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Minimum Purchase (LKR)</label>
              <input className="form-control" type="number" step="0.01" min="0" value={form.min_amount} onChange={e => setForm({ ...form, min_amount: e.target.value })} placeholder="0 = No minimum" />
            </div>
            {editDiscount && (
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-control" value={form.is_active ? 'true' : 'false'} onChange={e => setForm({ ...form, is_active: e.target.value === 'true' })}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            )}
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save Discount'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountManager;
