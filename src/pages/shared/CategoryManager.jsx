import React, { useState, useEffect } from 'react';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../../services/categoryService';
import { addProduct, getProductsByCategory, deleteProduct, updateProduct, addVariant, getVariants } from '../../services/productService';
import { fmtCurrency } from '../../utils/formatters';

const CategoryManager = () => {
  const [allCats, setAllCats] = useState([]);
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [parentId, setParentId] = useState(null);
  const [showCatModal, setShowCatModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [catData, setCatData] = useState({ id: null, name: '' });
  const [itemData, setItemData] = useState({ id: null, name: '', base_price: '', description: '' });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variantData, setVariantData] = useState({ sku: '', size: '', color: '', barcode: '', variant_price: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const loadCategories = () => getCategories().then(setAllCats);
  const loadItems = (id) => id ? getProductsByCategory(id).then(d => setItems(d || [])) : setItems([]);

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { loadItems(parentId); }, [parentId]);

  const handleSaveCategory = async () => {
    setSaving(true);
    try {
      if (editMode) await updateCategory(catData.id, { name: catData.name });
      else await addCategory({ name: catData.name, parent_id: parentId });
      setShowCatModal(false); setEditMode(false); setCatData({ id: null, name: '' });
      loadCategories(); showMsg('Category saved!');
    } catch { showMsg('Error saving category'); } finally { setSaving(false); }
  };

  const handleSaveItem = async () => {
    setSaving(true);
    try {
      if (editMode) await updateProduct(itemData.id, itemData);
      else await addProduct({ ...itemData, category_id: parentId });
      setShowItemModal(false); setEditMode(false);
      setItemData({ id: null, name: '', base_price: '', description: '' });
      loadItems(parentId); showMsg('Product saved!');
    } catch { showMsg('Error saving product'); } finally { setSaving(false); }
  };

  const handleSaveVariant = async () => {
    if (!variantData.sku || !variantData.barcode) { showMsg('SKU and Barcode are required'); return; }
    setSaving(true);
    try {
      await addVariant({ ...variantData, product_id: selectedProduct.id });
      const updated = await getVariants(selectedProduct.id);
      setVariants(updated);
      setVariantData({ sku: '', size: '', color: '', barcode: '', variant_price: '' });
      showMsg('Variant added!');
    } catch (err) { showMsg(err.response?.data?.error || 'Error adding variant'); }
    finally { setSaving(false); }
  };

  const openVariantModal = async (product) => {
    setSelectedProduct(product);
    const v = await getVariants(product.id);
    setVariants(v);
    setShowVariantModal(true);
  };

  const currentCategories = allCats.filter(c => c.parent_id === parentId);

  return (
    <div className="page-content">
      {msg && <div className="alert alert-success" style={{ marginBottom: 14 }}>{msg}</div>}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {parentId && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setParentId(null)}>🏠 Root</button>
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const cur = allCats.find(c => c.id === parentId);
                setParentId(cur?.parent_id ?? null);
              }}>⬅ Back</button>
            </>
          )}
          <span style={{ fontSize: 15, fontWeight: 700 }}>
            📂 {parentId ? allCats.find(c => c.id === parentId)?.name : 'All Categories'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" onClick={() => { setEditMode(false); setCatData({ id: null, name: '' }); setShowCatModal(true); }}>
            + New Folder
          </button>
          {parentId && (
            <button className="btn btn-primary" onClick={() => { setEditMode(false); setItemData({ id: null, name: '', base_price: '', description: '' }); setShowItemModal(true); }}>
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      {currentCategories.length > 0 && (
        <div className="grid-4" style={{ gap: 14, marginBottom: 28 }}>
          {currentCategories.map(cat => (
            <div key={cat.id} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', padding: '18px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--pink)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 10, cursor: 'pointer' }}
                onClick={() => setParentId(cat.id)}>{cat.name}</div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                <button className="btn btn-outline btn-sm" onClick={() => { setCatData({ id: cat.id, name: cat.name }); setEditMode(true); setShowCatModal(true); }}>Edit</button>
                <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Delete this folder?')) deleteCategory(cat.id).then(loadCategories); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Products Table */}
      {parentId && (
        <>
          <div style={{ borderBottom: '2px solid var(--pink-light)', paddingBottom: 10, marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15 }}>Products in this category</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product Name</th><th>Description</th><th>Base Price</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td style={{ color: 'var(--text-sub)', fontSize: 13 }}>{item.description || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{fmtCurrency(item.base_price)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => openVariantModal(item)}>Variants</button>
                        <button className="btn btn-outline btn-sm" onClick={() => {
                          setItemData({ id: item.id, name: item.name || '', base_price: item.base_price || '', description: item.description || '' });
                          setEditMode(true); setShowItemModal(true);
                        }}>Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="empty-state"><span className="empty-state-icon">👗</span><div className="empty-state-text">No products in this category</div></div>
            )}
          </div>
        </>
      )}

      {/* Category Modal */}
      {showCatModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCatModal(false)}>
          <div className="modal modal-sm">
            <div className="modal-title">{editMode ? '✏️ Edit Category' : '📂 New Category'}</div>
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-control" value={catData.name} onChange={e => setCatData({ ...catData, name: e.target.value })} placeholder="Category name" autoFocus />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCatModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveCategory} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showItemModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowItemModal(false)}>
          <div className="modal">
            <div className="modal-title">{editMode ? '✏️ Edit Product' : '👗 New Product'}</div>
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input className="form-control" value={itemData.name} onChange={e => setItemData({ ...itemData, name: e.target.value })} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Base Price (LKR) *</label>
              <input className="form-control" type="number" step="0.01" value={itemData.base_price} onChange={e => setItemData({ ...itemData, base_price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" value={itemData.description} onChange={e => setItemData({ ...itemData, description: e.target.value })} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveItem} disabled={saving}>
                {saving ? <span className="spinner" /> : 'Save Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Modal */}
      {showVariantModal && selectedProduct && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVariantModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-title">⚙️ Variants — {selectedProduct.name}</div>
            {msg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{msg}</div>}

            {/* Existing variants */}
            {variants.length > 0 && (
              <div className="table-wrap" style={{ marginBottom: 20 }}>
                <table>
                  <thead><tr><th>SKU</th><th>Barcode</th><th>Size</th><th>Color</th><th>Variant Price</th><th>Stock</th></tr></thead>
                  <tbody>
                    {variants.map(v => (
                      <tr key={v.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.sku}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{v.barcode}</td>
                        <td>{v.size || '—'}</td>
                        <td>{v.color || '—'}</td>
                        <td>{v.variant_price ? fmtCurrency(v.variant_price) : 'Base'}</td>
                        <td>
                          {Array.isArray(v.stock) ? v.stock.map(s => (
                            <div key={s.branch_id} style={{ fontSize: 11 }}>{s.branch_name}: <strong>{s.stock_qty}</strong></div>
                          )) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14, borderTop: '1px solid var(--border)', paddingTop: 16 }}>+ Add New Variant</div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">SKU *</label>
                <input className="form-control" value={variantData.sku} onChange={e => setVariantData({ ...variantData, sku: e.target.value })} placeholder="TG-001-S-BLK" />
              </div>
              <div className="form-group">
                <label className="form-label">Barcode *</label>
                <input className="form-control" value={variantData.barcode} onChange={e => setVariantData({ ...variantData, barcode: e.target.value })} placeholder="Scan or enter barcode" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Size</label>
                <input className="form-control" value={variantData.size} onChange={e => setVariantData({ ...variantData, size: e.target.value })} placeholder="XS / S / M / L / XL" />
              </div>
              <div className="form-group">
                <label className="form-label">Color</label>
                <input className="form-control" value={variantData.color} onChange={e => setVariantData({ ...variantData, color: e.target.value })} placeholder="Black / White / Red..." />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Variant Price (leave blank to use base price)</label>
              <input className="form-control" type="number" step="0.01" value={variantData.variant_price} onChange={e => setVariantData({ ...variantData, variant_price: e.target.value })} placeholder="Optional override price" />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowVariantModal(false)}>Close</button>
              <button className="btn btn-primary" onClick={handleSaveVariant} disabled={saving}>
                {saving ? <span className="spinner" /> : '+ Add Variant'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManager;
