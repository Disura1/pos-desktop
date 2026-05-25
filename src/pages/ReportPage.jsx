import React from "react";

const ReportPage = ({ report }) => {
  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h1>Daily Sales Summary</h1>
      <div
        style={{
          background: "#f0f0f0",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "400px",
          boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        <p style={{ fontSize: "18px" }}>
          <strong>Total Transactions:</strong> {report.total_transactions}
        </p>
        <p style={{ fontSize: "18px", color: "#e91e63" }}>
          <strong>Total Revenue:</strong> LKR{" "}
          {parseFloat(report.total_revenue || 0).toFixed(2)}
        </p>
      </div>

      <div style={{ marginTop: "30px", color: "#666", fontStyle: "italic" }}>
        <p>This report is generated based on current local server time.</p>
      </div>
    </div>
  );
};

export default ReportPage;
