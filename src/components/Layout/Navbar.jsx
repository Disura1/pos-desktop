import React from "react";

const Navbar = ({ username, role, setView, onFetchReport, onLogout }) => (
  <nav
    style={{
      padding: "10px 20px",
      background: "#333",
      color: "#fff",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <div style={{ display: "flex", gap: "15px" }}>
      <button
        onClick={() => setView("checkout")}
        style={{
          cursor: "pointer",
          background: "none",
          border: "1px solid #fff",
          color: "#fff",
          padding: "5px 10px",
        }}
      >
        Checkout
      </button>

      {/* ADDED: Category Management Button */}
      {role === "Admin" && (
        <button onClick={() => setView("categories")}>Manage Categories</button>
      )}

      {/* Show Report only for Admin or Manager */}
      {role !== "Cashier" && (
        <button
          onClick={onFetchReport}
          style={{
            cursor: "pointer",
            background: "none",
            border: "1px solid #fff",
            color: "#fff",
            padding: "5px 10px",
          }}
        >
          Daily Report
        </button>
      )}
    </div>

    <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
      <span style={{ fontSize: "14px" }}>
        👤 {username} ({role})
      </span>
      <button
        onClick={onLogout}
        style={{
          cursor: "pointer",
          background: "#e91e63",
          border: "none",
          color: "#fff",
          padding: "5px 15px",
          borderRadius: "4px",
        }}
      >
        Logout
      </button>
    </div>
  </nav>
);

export default Navbar;
