import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { scanProductByBarcode, searchProducts } from '../../services/productService';
import { processCheckout } from '../../services/saleService';
import { getActiveDiscounts } from '../../services/discountService';
import { getSaleDetail } from '../../services/saleService';
import { printReceipt } from '../../utils/printUtils';
import { fmtCurrency, calcDiscount } from '../../utils/formatters';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { cacheCatalog, getCachedCatalog, queueOfflineSale, syncOfflineQueue, isNetworkError } from '../../services/offlineService';
import { holdSale, getHeldSales, resumeSale, deleteHeldSale } from '../../services/heldSaleService';

const POSPage = () => {
  const { user } = useAuth();
  const scanRef = useRef(null);
  const [barcode, setBarcode] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [discounts, setDiscounts] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountTendered, setAmountTendered] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [heldSales, setHeldSales] = useState([]);
  const [showHeldPanel, setShowHeldPanel] = useState(false);

  useEffect(() => {
    getHeldSales().then(setHeldSales).catch(() => {});
  }, []);

  const branchId = user?.branchId;

  useEffect(() => {
    if (!branchId) return; // don't load if no branch
    getActiveDiscounts().then(setDiscounts).catch(() => {});
    scanRef.current?.focus();
  }, []);

  const isOnline = useOnlineStatus();

  // Refresh the local catalog cache every 5 minutes while online
  useEffect(() => {
    if (!branchId || !isOnline) return;
    cacheCatalog(branchId);
    const t = setInterval(() => cacheCatalog(branchId), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [branchId, isOnline]);

  // Try to push any queued offline sales every 20 seconds once back online
  useEffect(() => {
    if (!isOnline) return;
    const t = setInterval(() => {
      syncOfflineQueue(({ success, error }) => {
        if (success) showMsg('success', '✅ An offline sale was synced successfully.');
        else showMsg('error', `⚠️ An offline sale failed to sync: ${error}`);
      });
    }, 20000);
    return () => clearInterval(t);
  }, [isOnline]);

  const showMsg = (type, msg) => {
    if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); }
    else { setErrorMsg(msg); setTimeout(() => setErrorMsg(''), 4000); }
  };

  const addToCart = useCallback((product) => {
    if (product.stock_qty <= 0) { showMsg('error', `${product.name} is out of stock!`); return; }
    setCart(prev => {
      const existing = prev.find(i => i.sku === product.sku);
      if (existing) {
        if (existing.quantity >= product.stock_qty) { showMsg('error', 'Insufficient stock!'); return prev; }
        return prev.map(i => i.sku === product.sku ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1, price: parseFloat(product.price || product.base_price) }];
    });
    setSearchQ('');
    setSearchResults([]);
    scanRef.current?.focus();
  }, []);

  const handleScan = async (e) => {
    if (e.key !== 'Enter' || !barcode.trim()) return;
    const code = barcode.trim();
    try {
      const product = await scanProductByBarcode(code, branchId);
      addToCart(product);
    } catch (err) {
      if (isNetworkError(err)) {
        const catalog = await getCachedCatalog();
        const found = catalog.find((p) => p.barcode === code);
        if (found) { addToCart(found); setBarcode(''); return; }
        showMsg('error', `Offline — "${code}" not found in cached catalog`);
      } else {
        showMsg('error', `Barcode "${code}" not found!`);
      }
    }
    setBarcode('');
  };

  const handleSearch = async (q) => {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const results = await searchProducts(q, branchId);
      // Only show variants that are active for this branch
      setSearchResults((results || []).filter(r => r.is_active_here === true));
    } catch (err) {
      if (err.response?.status !== 400) {
        showMsg('error', 'Search failed — check connection');
      }
    }
  };

  const updateQty = (sku, delta) => {
    setCart(prev => prev.map(i => {
      if (i.sku !== sku) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeItem = (sku) => setCart(prev => prev.filter(i => i.sku !== sku));

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const discountAmt = selectedDiscount ? calcDiscount(subtotal, selectedDiscount) : 0;
  const total = Math.max(0, subtotal - discountAmt);
  const change = Math.max(0, parseFloat(amountTendered || 0) - total);

  useEffect(() => {
    window.electronAPI?.sendCartUpdate({ cart, subtotal, discountAmt, total });
  }, [cart, subtotal, discountAmt, total]);

  const handleCheckout = async () => {
    if (cart.length === 0) { showMsg('error', 'Cart is empty!'); return; }
    if (paymentMethod === 'cash' && parseFloat(amountTendered || 0) < total) {
      showMsg('error', 'Amount tendered is less than total!'); return;
    }
    setLoading(true);
    try {
      const payload = {
        cart: cart.map(i => ({ sku: i.sku, quantity: i.quantity, variant_price: i.price, base_price: i.price })),
        subtotal, discountId: selectedDiscount?.id || null,
        discountAmount: discountAmt, total, paymentMethod,
        amountTendered: parseFloat(amountTendered || total), branchId,
      };
      const res = await processCheckout(payload);

      window.electronAPI?.showNotification('Sale Complete', `Sale #${res.saleId} · ${fmtCurrency(total)}`);

      const saleDetail = await getSaleDetail(res.saleId);
      await printReceipt({
        sale: saleDetail,
        items: saleDetail.items,
        branchName: user.branchName,
        cashierName: user.fullName || user.username,
      });

      showMsg('success', `✅ Payment successful! Receipt: ${res.receiptNumber || '#'+res.saleId} · Change: ${fmtCurrency(change)}`);
      setCart([]);
      setSelectedDiscount(null);
      setAmountTendered('');
    } catch (err) {
      if (isNetworkError(err)) {
        // No connection — queue the sale locally instead of losing it
        const payload = {
          cart: cart.map(i => ({ sku: i.sku, quantity: i.quantity, variant_price: i.price, base_price: i.price })),
          subtotal, discountId: selectedDiscount?.id || null,
          discountAmount: discountAmt, total, paymentMethod,
          amountTendered: parseFloat(amountTendered || total), branchId,
        };
        await queueOfflineSale(payload);

        const offlineReceiptNo = `OFFLINE-${Date.now()}`;
        await printReceipt({
          sale: {
            receipt_number: offlineReceiptNo,
            sale_date: new Date(),
            subtotal, discount_amount: discountAmt, total_amount: total,
            amount_tendered: parseFloat(amountTendered || total), change_amount: change,
          },
          items: cart.map(i => ({ product_name: i.name, sku: i.sku, size: i.size, color: i.color, quantity: i.quantity, total_price: i.price * i.quantity })),
          branchName: user.branchName,
          cashierName: user.fullName || user.username,
        });

        showMsg('success', `⚠️ Offline — sale saved as ${offlineReceiptNo}, will sync automatically once reconnected.`);
        setCart([]);
        setSelectedDiscount(null);
        setAmountTendered('');
      } else {
        showMsg('error', err.response?.data?.error || 'Checkout failed!');
      }
    } finally {
      setLoading(false);
      scanRef.current?.focus();
    }
  };

  const handleHoldSale = async () => {
    if (cart.length === 0) { showMsg('error', 'Cart is empty!'); return; }
    try {
      await holdSale({ cart, discountId: selectedDiscount?.id || null, customerNote: '' });
      setCart([]);
      setSelectedDiscount(null);
      setAmountTendered('');
      showMsg('success', '⏸ Sale held. Start a new bill anytime.');
      getHeldSales().then(setHeldSales).catch(() => {});
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Could not hold sale');
    }
  };

  const openHeldPanel = async () => {
    try {
      setHeldSales(await getHeldSales());
      setShowHeldPanel(true);
    } catch {
      showMsg('error', 'Could not load held sales');
    }
  };

  const handleResumeSale = async (id) => {
    try {
      const data = await resumeSale(id);
      setCart(data.cart);
      setSelectedDiscount(discounts.find(d => d.id === data.discountId) || null);
      setShowHeldPanel(false);
      showMsg('success', '▶️ Sale resumed');
      getHeldSales().then(setHeldSales).catch(() => {});
    } catch (err) {
      showMsg('error', err.response?.data?.error || 'Could not resume sale');
    }
  };

  const handleDeleteHeld = async (id) => {
    try {
      await deleteHeldSale(id);
      setHeldSales(prev => prev.filter(h => h.id !== id));
    } catch {
      showMsg('error', 'Could not remove held sale');
    }
  };

  if (!branchId) {
    return (
      <div className="page-content">
        <div className="alert alert-danger">
          ⚠️ Your account has no branch assigned. Please contact the Owner to assign you to a branch before using the POS.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pos-wrap">
        {/* LEFT: Products */}
        <div className="pos-left">
          <div className="pos-scan-bar">
            <input
              ref={scanRef}
              className="pos-scan-input"
              placeholder="🔍 Scan barcode or type product name..."
              value={barcode}
              onChange={e => { setBarcode(e.target.value); if (e.target.value) handleSearch(e.target.value); }}
              onKeyDown={handleScan}
            />
            {barcode && (
              <button className="btn btn-ghost btn-sm" onClick={() => { setBarcode(''); setSearchResults([]); }}>✕</button>
            )}
          </div>

          <button
            onClick={openHeldPanel}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '12px 14px 0',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1.5px solid var(--pink)',
              background: 'var(--pink-light)',
              color: 'var(--pink-dark)',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--pink)', e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--pink-light)', e.currentTarget.style.color = 'var(--pink-dark)')}
          >
            <span style={{ fontSize: 16 }}>📋</span>
            <span>Held Sales</span>
            {heldSales.length > 0 && (
              <span
                style={{
                  background: 'var(--pink)',
                  color: '#fff',
                  borderRadius: 20,
                  minWidth: 20,
                  height: 20,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  padding: '0 6px',
                }}
              >
                {heldSales.length}
              </span>
            )}
          </button>

          {(successMsg || errorMsg) && (
            <div style={{ padding: '0 14px' }}>
              {successMsg && <div className="alert alert-success" style={{ marginTop: 10 }}>{successMsg}</div>}
              {errorMsg && <div className="alert alert-danger" style={{ marginTop: 10 }}>{errorMsg}</div>}
            </div>
          )}

          <div className="pos-products">
            {searchResults.length > 0 ? (
              <>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                  {searchResults.length} results for "{searchQ}"
                </p>
                <div className="pos-product-grid">
                  {searchResults.map(p => (
                    <div
                      key={p.sku}
                      className={`pos-product-card ${p.stock_qty <= 0 ? 'out-of-stock' : ''}`}
                      onClick={() => p.stock_qty > 0 && addToCart(p)}
                    >
                      <div className="pos-product-name">{p.name}</div>
                      <div className="pos-product-meta">
                        {p.size && `Size: ${p.size}`} {p.color && `/ ${p.color}`}
                      </div>
                      <div className="pos-product-meta" style={{ marginTop: 2 }}>SKU: {p.sku}</div>
                      <div className="pos-product-price">{fmtCurrency(p.price || p.base_price)}</div>
                      <div style={{ fontSize: 11, marginTop: 4 }}>
                        {p.stock_qty > 0
                          ? <span style={{ color: 'var(--success)' }}>In Stock: {p.stock_qty}</span>
                          : <span style={{ color: 'var(--danger)' }}>Out of Stock</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🔍</span>
                <div className="empty-state-text">Scan a barcode or type a product name to search</div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="pos-right">
          <div className="pos-cart-header">
            <div className="pos-cart-title">🛒 Current Bill</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {cart.length} item{cart.length !== 1 ? 's' : ''}
            </div>
          </div>

          {!isOnline && (
            <div className="alert alert-danger" style={{ margin: '0 14px 10px' }}>
              🔴 Offline — sales will be saved locally and synced automatically
            </div>
          )}

          {cart.length === 0 ? (
            <div className="empty-state" style={{ flex: 1 }}>
              <span className="empty-state-icon">🛍️</span>
              <div className="empty-state-text">Cart is empty</div>
            </div>
          ) : (
            <div className="pos-cart">
              {cart.map(item => (
                <div className="cart-item" key={item.sku}>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-sku">
                      {item.sku}
                      {item.size ? ` · ${item.size}` : ''}
                      {item.color ? ` · ${item.color}` : ''}
                    </div>
                  </div>
                  <div className="qty-ctrl">
                    <button className="qty-btn" onClick={() => updateQty(item.sku, -1)}>−</button>
                    <span className="qty-num">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.sku, 1)}>+</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <div className="cart-item-price">{fmtCurrency(item.price * item.quantity)}</div>
                    <button
                      onClick={() => removeItem(item.sku)}
                      style={{ fontSize: 10, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pos-summary">
            {/* Discount selector */}
            <div style={{ marginBottom: 10 }}>
              <label className="form-label">Discount</label>
              <select
                className="form-control"
                style={{ fontSize: 13 }}
                value={selectedDiscount?.id || ''}
                onChange={e => {
                  const disc = discounts.find(d => d.id === parseInt(e.target.value));
                  setSelectedDiscount(disc || null);
                }}
              >
                <option value="">No Discount</option>
                {discounts.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.type === 'percentage' ? `${d.value}%` : `LKR ${d.value}`})
                  </option>
                ))}
              </select>
            </div>

            <div className="pos-total-row">
              <span>Subtotal</span>
              <span>{fmtCurrency(subtotal)}</span>
            </div>
            {discountAmt > 0 && (
              <div className="pos-total-row discount">
                <span>Discount ({selectedDiscount?.name})</span>
                <span>− {fmtCurrency(discountAmt)}</span>
              </div>
            )}
            <div className="pos-total-row grand">
              <span>TOTAL</span>
              <span>{fmtCurrency(total)}</span>
            </div>

            {/* Payment Method */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['cash', 'card'].map(m => (
                <button
                  key={m}
                  className={`btn btn-sm ${paymentMethod === m ? 'btn-primary' : 'btn-outline'}`}
                  style={{ flex: 1 }}
                  onClick={() => setPaymentMethod(m)}
                >
                  {m === 'cash' ? '💵 Cash' : '💳 Card'}
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div style={{ marginBottom: 10 }}>
                <label className="form-label">Amount Tendered</label>
                <input
                  className="form-control"
                  type="number"
                  step="0.01"
                  placeholder={`Min: ${total.toFixed(2)}`}
                  value={amountTendered}
                  onChange={e => setAmountTendered(e.target.value)}
                />
                {parseFloat(amountTendered) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-sub)' }}>Change</span>
                    <span style={{ fontWeight: 700, color: change >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                      {fmtCurrency(change)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              className="btn btn-primary btn-lg btn-block"
              onClick={handleCheckout}
              disabled={loading || cart.length === 0}
            >
              {loading ? <span className="spinner" /> : '✅ Complete Payment'}
            </button>

            {cart.length > 0 && (
              <>
                <button
                  className="btn btn-ghost btn-block"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => { setCart([]); setSelectedDiscount(null); setAmountTendered(''); }}
                >
                  🗑️ Clear Cart
                </button>
                <button className="btn btn-outline btn-block" style={{ marginTop: 6, fontSize: 12 }} onClick={handleHoldSale}>
                  ⏸ Hold Sale
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showHeldPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--card)', borderRadius: 12, padding: 20, width: 420, maxHeight: '70vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Held Sales</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowHeldPanel(false)}>✕</button>
            </div>
            {heldSales.length === 0 ? (
              <div className="empty-state"><div className="empty-state-text">No held sales</div></div>
            ) : (
              heldSales.map(h => (
                <div key={h.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{h.item_count} item{h.item_count !== 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Held by {h.held_by} · {new Date(h.created_at).toLocaleTimeString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => handleResumeSale(h.id)}>Resume</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => handleDeleteHeld(h.id)}>✕</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default POSPage;
