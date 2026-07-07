import React, { useState, useEffect } from 'react';
import { fmtCurrency } from '../utils/formatters';

const CustomerDisplayPage = () => {
  const [data, setData] = useState({ cart: [], subtotal: 0, discountAmt: 0, total: 0 });

  useEffect(() => {
    const cleanup = window.electronAPI?.onCartUpdate(setData);
    return cleanup;
  }, []);

  return (
    <div style={{
      height: '100vh', background: '#1C1C2E', color: '#fff',
      display: 'flex', flexDirection: 'column', padding: 40, fontFamily: 'sans-serif',
    }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#E91E63', marginBottom: 24 }}>TEEN GIRL</div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {data.cart.length === 0 ? (
          <div style={{ opacity: 0.5, fontSize: 22, marginTop: 60, textAlign: 'center' }}>
            Welcome! Your items will appear here.
          </div>
        ) : (
          data.cart.map((item) => (
            <div key={item.sku} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>{item.name} × {item.quantity}</span>
              <span>{fmtCurrency(item.price * item.quantity)}</span>
            </div>
          ))
        )}
      </div>
      <div style={{ borderTop: '2px solid #E91E63', paddingTop: 16, marginTop: 16 }}>
        {data.discountAmt > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, opacity: 0.7 }}>
            <span>Discount</span><span>− {fmtCurrency(data.discountAmt)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 36, fontWeight: 900 }}>
          <span>TOTAL</span><span>{fmtCurrency(data.total)}</span>
        </div>
      </div>
    </div>
  );
};

export default CustomerDisplayPage;