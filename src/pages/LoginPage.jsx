import React, { useState } from "react";
import axios from "axios";

const LoginPage = ({ onLoginSuccess }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/login",
        credentials,
      );
      onLoginSuccess(res.data);
    } catch (err) {
      alert("Invalid login credentials");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#fff5f8",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "40px",
          borderRadius: "15px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
          width: "350px",
        }}
      >
        <h2 style={{ color: "#e91e63", textAlign: "center" }}>TEEN GIRL POS</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "15px",
              border: "1px solid #ddd",
            }}
            onChange={(e) =>
              setCredentials({ ...credentials, username: e.target.value })
            }
          />
          <input
            type="password"
            placeholder="Password"
            style={{
              width: "100%",
              padding: "10px",
              marginBottom: "20px",
              border: "1px solid #ddd",
            }}
            onChange={(e) =>
              setCredentials({ ...credentials, password: e.target.value })
            }
          />
          <button
            style={{
              width: "100%",
              padding: "12px",
              background: "#e91e63",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
          >
            LOGIN
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
