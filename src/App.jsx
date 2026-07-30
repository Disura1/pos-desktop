import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import logo from "./assets/logo.jpg";
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
import ReturnsPage from "./pages/cashier/ReturnsPage";

// Shared pages
import CategoryManager from "./pages/shared/CategoryManager";

import CustomerDisplayPage from "./pages/CustomerDisplayPage";

// true when running in a browser (not Electron)
const IS_WEB = process.env.IS_WEB === 'true';

const DEFAULT_VIEW = {
  Owner: "owner-dashboard",
  Admin: "owner-dashboard",
  Manager: "manager-dashboard",
  Cashier: "pos",
};

const AppInner = () => {
  const { user, loading, logout } = useAuth();
  const [view, setView] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // On web, treat ≤768px as mobile (toggleable sidebar) and >768px as desktop (fixed sidebar)
  const [isMobile, setIsMobile] = useState(() => IS_WEB && window.innerWidth <= 768);
  useEffect(() => {
    if (!IS_WEB) return;
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Whether sidebar should auto-close on nav click and show a toggle button
  // True for: mobile web (all roles), desktop Electron cashier
  const mobileBehavior = IS_WEB ? isMobile : user?.role === "Cashier";

  useEffect(() => {
    if (user) {
      setView(DEFAULT_VIEW[user.role] || "pos");
      // Mobile web: start closed. Desktop (Electron or wide web): open for Owner/Manager
      setSidebarOpen(mobileBehavior ? false : user.role !== "Cashier");
    } else {
      setView(null);
    }
  }, [user?.id, user?.role, mobileBehavior]);

  if (loading)
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#1C1C2E" }}>
        <div style={{ textAlign: "center" }}>
          <img
            src={logo}
            alt="Teen Girl"
            style={{ width: 80, height: 80, objectFit: "contain", borderRadius: "50%", marginBottom: 16 }}
          />
          <div style={{ color: "#E91E63", fontWeight: 800, fontSize: 22 }}>TEEN GIRL</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>Loading...</div>
        </div>
      </div>
    );

  if (!user) return <LoginPage />;

  // Cashier role is desktop-only — web login should redirect them away
  if (IS_WEB && user.role === 'Cashier') {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1C1C2E' }}>
        <div style={{ textAlign: 'center', color: '#fff', maxWidth: 360 }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🖥️</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#E91E63', marginBottom: 10 }}>Desktop App Required</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 28 }}>
            The cashier POS is only available on the shop desktop app.<br />
            Please sign in on the computer at the shop.
          </div>
          <button
            onClick={logout}
            style={{ background: '#E91E63', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontSize: 14, cursor: 'pointer', fontWeight: 700 }}
          >
            ← Sign Out
          </button>
        </div>
      </div>
    );
  }

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
      case "cashier-returns":  return <ReturnsPage />;
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
      {sidebarOpen && (
        <Sidebar
          currentView={view}
          setView={(v) => { setView(v); if (mobileBehavior) setSidebarOpen(false); }}
          onClose={mobileBehavior ? () => setSidebarOpen(false) : null}
        />
      )}
      <div className="main-area" style={{ position: "relative" }}>
        <TopBar
          currentView={view}
          sidebarToggle={
            mobileBehavior
              ? { isOpen: sidebarOpen, onToggle: () => setSidebarOpen((o) => !o) }
              : null
          }
        />
        {renderPage()}
      </div>
    </div>
  );
};

const App = () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('customerDisplay') === '1') {
    return <CustomerDisplayPage />; // no auth needed — just a passive display
  }
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
};

export default App;