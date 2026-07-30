import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fmtDateTime } from '../../utils/formatters';
import logo from '../../assets/logo.jpg';

const IS_WEB = process.env.IS_WEB === 'true';

const PAGE_TITLES = {
  'owner-dashboard':   { title: 'Dashboard',        subtitle: 'Overview of all branches' },
  'branches':          { title: 'Branch Management', subtitle: 'Manage your store branches' },
  'users':             { title: 'User Management',   subtitle: 'Manage staff accounts' },
  'owner-stock':       { title: 'Stock Overview',    subtitle: 'Inventory across all branches' },
  'owner-reports':     { title: 'Reports & Analytics', subtitle: 'Sales performance insights' },
  'discounts':         { title: 'Discounts',         subtitle: 'Manage promotions and discounts' },
  'categories':        { title: 'Product Catalog',   subtitle: 'Categories and product management' },
  'manager-dashboard': { title: 'Dashboard',         subtitle: 'Branch overview' },
  'stock-manager':     { title: 'Stock Manager',     subtitle: 'Manage branch inventory' },
  'receive-stock':     { title: 'Receive Stock',     subtitle: 'Record incoming inventory' },
  'transfer-stock':    { title: 'Transfer Stock',    subtitle: 'Move stock between branches' },
  'manager-reports':   { title: 'Branch Reports',    subtitle: 'Sales performance' },
  'product-search':    { title: 'Product Search',    subtitle: 'Search products and variants' },
  'label-printer':     { title: 'Print Labels',      subtitle: 'Generate and print barcode labels' },
  'pos':               { title: 'Point of Sale',     subtitle: 'Process sales and checkout' },
  'cashier-history':   { title: 'Sales History',     subtitle: 'Recent transactions' },
  'cashier-products':  { title: 'Product Catalog',   subtitle: 'Browse products' },
  'cashier-search':    { title: 'Product Search',    subtitle: 'Search products' },
};

// sidebarToggle is only passed from App.jsx for the Cashier role
const TopBar = ({ currentView, sidebarToggle }) => {
  const { user } = useAuth();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const page = PAGE_TITLES[currentView] || { title: 'Teen Girl POS', subtitle: '' };
  const isManager = user?.role === 'Manager';

  const handleFullscreen = () => window.electronAPI?.toggleFullscreen();

  const clockStr = time.toLocaleTimeString('en-LK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Sidebar toggle button (web: all roles; desktop: cashier only) */}
        {sidebarToggle && (
          <button
            onClick={sidebarToggle.onToggle}
            title={sidebarToggle.isOpen ? 'Hide menu' : 'Show menu'}
            style={{
              background: 'var(--card)', border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '5px 10px',
              cursor: 'pointer', fontSize: 16, color: 'var(--text)', lineHeight: 1, flexShrink: 0,
            }}
          >
            {sidebarToggle.isOpen ? '✕' : '☰'}
          </button>
        )}

        {/* Logo — shown in topbar only on web/mobile */}
        {IS_WEB && (
          <img src={logo} alt="Teen Girl" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }} />
        )}

        <div>
          {/* Manager mobile: show branch name instead of page title */}
          {IS_WEB && isManager && user?.branchName ? (
            <>
              <div className="topbar-title">{user.branchName}</div>
              <div className="topbar-subtitle">{page.title}</div>
            </>
          ) : (
            <>
              <div className="topbar-title">{page.title}</div>
              {page.subtitle && <div className="topbar-subtitle">{page.subtitle}</div>}
            </>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* Clock: desktop only */}
        {!IS_WEB && (
          <span className="topbar-clock">🕐 {clockStr}</span>
        )}
        {/* Fullscreen: desktop only */}
        {!IS_WEB && (
          <button className="btn btn-ghost btn-sm" onClick={handleFullscreen} title="Toggle fullscreen">⛶</button>
        )}
      </div>
    </header>
  );
};

export default TopBar;