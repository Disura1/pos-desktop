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

// Cashier pages
import POSPage from "./pages/cashier/POSPage";
import SalesHistory from "./pages/cashier/SalesHistory";

// Shared pages
import CategoryManager from "./pages/shared/CategoryManager";

const DEFAULT_VIEW = {
  Owner: "owner-dashboard",
  Admin: "owner-dashboard", // legacy role name fallback
  Manager: "manager-dashboard",
  Cashier: "pos",
};

const AppInner = () => {
  const { user, loading } = useAuth();
  const [view, setView] = useState(null);

  // Reset view every time the logged-in user changes (login / logout / role switch)
  useEffect(() => {
    if (user) {
      setView(DEFAULT_VIEW[user.role] || "pos");
    } else {
      setView(null); // clear on logout so the next login starts fresh
    }
  }, [user?.id, user?.role]); // key on the specific user, not the whole object

  if (loading)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1C1C2E",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>👗</div>
          <div style={{ color: "#E91E63", fontWeight: 800, fontSize: 22 }}>
            TEEN GIRL
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.4)",
              fontSize: 12,
              marginTop: 6,
            }}
          >
            Loading...
          </div>
        </div>
      </div>
    );

  if (!user) return <LoginPage />;

  const renderPage = () => {
    switch (view) {
      // Owner
      case "owner-dashboard":
        return <OwnerDashboard />;
      case "branches":
        return <BranchManager />;
      case "users":
        return <UserManager />;
      case "owner-reports":
        return <OwnerReports />;
      case "owner-stock":
        return <OwnerStock />;
      case "discounts":
        return <DiscountManager />;
      // Manager
      case "manager-dashboard":
        return <ManagerDashboard />;
      case "stock-manager":
        return <StockManager />;
      case "receive-stock":
        return <ReceiveStock />;
      case "transfer-stock":
        return <TransferStock />;
      case "manager-reports":
        return <OwnerReports />;
      case "product-search":
        return <ProductSearch />;
      // Cashier
      case "pos":
        return <POSPage />;
      case "cashier-history":
        return <SalesHistory />;
      // Shared
      case "categories":
        return <CategoryManager />;
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
      <Sidebar currentView={view} setView={setView} />
      <div className="main-area">
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
