import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/Layout/Sidebar";
import TopBar from "./components/Layout/TopBar";
import LoginPage from "./pages/LoginPage";

// Owner pages
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import BranchManager from "./pages/owner/BranchManager";
import UserManager from "./pages/owner/UserManager";
import OwnerReports from "./pages/owner/OwnerReports";
import OwnerStock from "./pages/owner/OwnerStock";
import DiscountManager from "./pages/owner/DiscountManager";

// Manager pages
import ManagerDashboard from "./pages/manager/ManagerDashboard";
import StockManager from "./pages/manager/StockManager";
import ReceiveStock from "./pages/manager/ReceiveStock";
import TransferStock from "./pages/manager/TransferStock";
import ProductSearch from "./pages/manager/ProductSearch";
import LabelPrinter from "./pages/manager/LabelPrinter";

// Cashier pages
import POSPage from "./pages/cashier/POSPage";
import SalesHistory from "./pages/cashier/SalesHistory";

// Shared pages
import CategoryManager from "./pages/shared/CategoryManager";

const DEFAULT_VIEW = {
  Owner: "owner-dashboard",
  Admin: "owner-dashboard",
  Manager: "manager-dashboard",
  Cashier: "pos",
};

const AppInner = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (user) {
      setView(DEFAULT_VIEW[user.role] || "pos");
      // Cashier defaults to sidebar closed for a cleaner POS view
      setSidebarOpen(user.role !== "Cashier");
    } else {
      setView(null);
    }
  }, [user?.id, user?.role]);

  if (loading)
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C1C2E" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>👗</div>
          <div style={{ color: "#E91E63", fontWeight: 800, fontSize: 22 }}>TEEN GIRL</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>Loading...</div>
        </div>
      </div>
    );

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (view) {
      case "owner-dashboard":  return <OwnerDashboard />;
      case "branches":         return <BranchManager />;
      case "users":            return <UserManager />;
      case "owner-reports":    return <OwnerReports />;
      case "owner-stock":      return <OwnerStock />;
      case "discounts":        return <DiscountManager />;
      case "manager-dashboard":return <ManagerDashboard />;
      case "stock-manager":    return <StockManager />;
      case "receive-stock":    return <ReceiveStock />;
      case "transfer-stock":   return <TransferStock />;
      case "manager-reports":  return <OwnerReports />;
      case "product-search":   return <ProductSearch />;
      case "label-printer":    return <LabelPrinter />;
      case "pos":              return <POSPage />;
      case "cashier-history":  return <SalesHistory />;
      case "cashier-products": return <CategoryManager />;
      case "cashier-search":   return <ProductSearch />;
      case "categories":       return <CategoryManager />;
      default:
        return (
          <div className="page-content">
            <div className="empty-state">
              <span className="empty-state-icon">🚧</span>
              <div className="empty-state-text">Page not found</div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-shell">
      {/* Sidebar — hidden when closed */}
      {sidebarOpen && (
        <Sidebar currentView={view} setView={(v) => { setView(v); if (user.role === "Cashier") setSidebarOpen(false); }} />
      )}

      <div className="main-area" style={{ position: "relative" }}>
        {/* Sidebar toggle button — only for cashier */}
        {user.role === "Cashier" && (
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Hide menu" : "Show menu"}
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 100,
              background: "var(--card)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              padding: "5px 10px",
              cursor: "pointer",
              fontSize: 16,
              color: "var(--text)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {sidebarOpen ? "✕" : "☰"}
          </button>
        )}

        <TopBar currentView={view} />
        {renderPage()}
      </div>
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppInner />
  </AuthProvider>
);

export default App;