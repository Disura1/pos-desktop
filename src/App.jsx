import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/Layout/Navbar";
import CheckoutPage from "./pages/CheckoutPage";
import ReportPage from "./pages/ReportPage";
import LoginPage from "./pages/LoginPage";
import CategoryManager from "./pages/CategoryManager";
import { scanProductByBarcode } from "./services/productService";
import { processCheckout, getDailyReport } from "./services/saleService";
import { printReceipt } from "./utils/printUtils"; // Move print logic to a utility file

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [total, setTotal] = useState(0);
  const [barcode, setBarcode] = useState("");
  const [view, setView] = useState("checkout");
  const [report, setReport] = useState({
    total_transactions: 0,
    total_revenue: 0,
  });
  const inputRef = useRef(null);

  // Check if user was already logged in on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && view === "checkout" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view, isLoggedIn]);

  const handleLoginSuccess = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsLoggedIn(false);
    setUser(null);
  };

  const fetchReport = async () => {
    try {
      const data = await getDailyReport();
      setReport(data);
      setView("report");
    } catch (err) {
      alert("Error fetching report");
    }
  };

  const handleScan = async (e) => {
    if (e.key === "Enter") {
      try {
        const product = await scanProductByBarcode(barcode);
        if (product) {
          setCart((prev) => [...prev, product]);
          setTotal((prev) => prev + parseFloat(product.base_price));
        }
        setBarcode("");
      } catch (err) {
        alert("Item not found!");
        setBarcode("");
      }
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty!");

    try {
      const payload = { cart, total, branchId: 1 };
      const response = await processCheckout(payload);

      if (response.success) {
        // RESTORED: Print Receipt logic
        printReceipt({
          saleId: response.saleId,
          cart: cart,
          total: total,
        });

        alert("✅ Payment Successful! Sale ID: " + response.saleId);
        setCart([]);
        setTotal(0);
      }
    } catch (err) {
      alert("❌ Checkout failed");
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <Navbar
        username={user?.username}
        role={user?.role}
        setView={setView}
        onFetchReport={fetchReport}
        onLogout={handleLogout}
      />

      {/* 2. Update the Switch Logic */}
      {view === "checkout" && (
        <CheckoutPage
          inputRef={inputRef}
          barcode={barcode}
          setBarcode={setBarcode}
          handleScan={handleScan}
          cart={cart}
          total={total}
          handleCheckout={handleCheckout}
        />
      )}

      {view === "report" && <ReportPage report={report} />}

      {view === "categories" && <CategoryManager />}
    </>
  );
};

export default App;
