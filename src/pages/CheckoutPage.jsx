import React from 'react';

const CheckoutPage = ({ inputRef, barcode, setBarcode, handleScan, cart, total, handleCheckout }) => (
  <div style={{ display: 'flex', height: 'calc(100vh - 50px)', fontFamily: 'sans-serif' }}>
    <div style={{ flex: 2, padding: '20px' }}>
      <h2>TeenGirl Inventory</h2>
      <input 
        ref={inputRef}
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        onKeyDown={handleScan}
        placeholder="Scan barcode..."
        style={{ padding: '10px', width: '80%', fontSize: '18px' }}
      />
    </div>
    
    <div style={{ flex: 1, padding: '20px', backgroundColor: '#f9f9f9', borderLeft: '1px solid #ddd' }}>
      <h2>Current Bill</h2>
      <div style={{ minHeight: '300px', overflowY: 'auto' }}>
        {cart.map((item, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span>{item.name} ({item.sku})</span>
            <span>LKR {parseFloat(item.base_price).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <hr />
      <h3>Total: LKR {total.toFixed(2)}</h3>
      <button onClick={handleCheckout} style={{ width: '100%', padding: '15px', backgroundColor: '#e91e63', color: 'white', border: 'none', borderRadius: '5px', fontSize: '18px', cursor: 'pointer' }}>
        PAY NOW
      </button>
    </div>
  </div>
);

export default CheckoutPage;