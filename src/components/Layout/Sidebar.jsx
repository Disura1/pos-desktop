import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { initials } from '../../utils/formatters';
import logo from '../../assets/logo.png';

const OWNER_NAV = [
  { label: 'Dashboard',      icon: '📊', view: 'owner-dashboard' },
  { label: 'Branches',       icon: '🏪', view: 'branches' },
  { label: 'Users',          icon: '👥', view: 'users' },
  { label: 'Stock Overview', icon: '📦', view: 'owner-stock' },
  { label: 'Reports',        icon: '📈', view: 'owner-reports' },
  { label: 'Discounts',      icon: '🏷️', view: 'discounts' },
  { label: 'Products',       icon: '👗', view: 'categories' },
];

const MANAGER_NAV = [
  { label: 'Dashboard',      icon: '📊', view: 'manager-dashboard' },
  { label: 'Stock Manager',  icon: '📦', view: 'stock-manager' },
  { label: 'Receive Stock',  icon: '📥', view: 'receive-stock' },
  { label: 'Transfer Stock', icon: '🔄', view: 'transfer-stock' },
  { label: 'Reports',        icon: '📈', view: 'manager-reports' },
  { label: 'Products',       icon: '👗', view: 'categories' },
];

const CASHIER_NAV = [
  { label: 'POS / Checkout', icon: '🛒', view: 'pos' },
  { label: 'Sales History',  icon: '🧾', view: 'cashier-history' },
];

const NAV_MAP = {
  Owner:   OWNER_NAV,
  Admin:   OWNER_NAV,    // legacy DB role name — same access as Owner
  Manager: MANAGER_NAV,
  Cashier: CASHIER_NAV,
};

const Sidebar = ({ currentView, setView }) => {
  const { user, logout } = useAuth();
  if (!user) return null;

  const navItems = NAV_MAP[user.role] || CASHIER_NAV;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img
            src={logo}
            alt="Teen Girl"
            style={{
              width: 38,
              height: 38,
              objectFit: 'contain',
              borderRadius: '50%',
              flexShrink: 0,
            }}
          />
          <div>
            <div className="sidebar-brand-name">Teen Girl</div>
            <div className="sidebar-brand-sub">POS System</div>
          </div>
        </div>
      </div>

      {user.branchName && (
        <div className="sidebar-branch-tag">📍 {user.branchName}</div>
      )}

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.view}
            className={`nav-item ${currentView === item.view ? 'active' : ''}`}
            onClick={() => setView(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials(user.fullName || user.username)}</div>
          <div>
            <div className="sidebar-user-name">{user.fullName || user.username}</div>
            <div className="sidebar-user-role">{user.role}</div>
          </div>
        </div>
        <button className="sidebar-logout-btn" onClick={logout}>⬅ Sign Out</button>
      </div>
    </aside>
  );
};

export default Sidebar;
