export const printReceipt = (saleData) => {
  const receiptWindow = window.open("", "PRINT", "height=600,width=400");

  receiptWindow.document.write(`
    <html>
      <head><title>Receipt</title></head>
      <body style="font-family: monospace; width: 300px; padding: 10px;">
        <center>
          <h2>TEEN GIRL</h2>
          <p>Boutique Store</p>
          <hr>
        </center>
        <p>Sale ID: ${saleData.saleId}</p>
        <p>Date: ${new Date().toLocaleString()}</p>
        <hr>
        ${saleData.cart
          .map(
            (item) => `
          <div style="display:flex; justify-content:space-between; margin-bottom: 5px;">
            <span>${item.name}</span>
            <span>${parseFloat(item.base_price).toFixed(2)}</span>
          </div>
        `,
          )
          .join("")}
        <hr>
        <div style="display:flex; justify-content:space-between; font-weight:bold;">
          <span>TOTAL</span>
          <span>LKR ${saleData.total.toFixed(2)}</span>
        </div>
        <center>
          <p style="margin-top: 20px;">Thank You!</p>
        </center>
        <script>
          window.onload = function() { 
            window.print(); 
            window.close(); 
          }
        </script>
      </body>
    </html>
  `);
  receiptWindow.document.close();
};
