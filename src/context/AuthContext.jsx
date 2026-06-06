import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("tg_user");
    const savedToken = localStorage.getItem("tg_token");

    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);

      // If cached user has stale fullName (same as username or missing),
      // fetch fresh data from backend to get the real full_name
      const isStale =
        !parsedUser.fullName || parsedUser.fullName === parsedUser.username;

      if (isStale) {
        // Set token first so apiClient can use it
        setToken(savedToken);
        apiClient
          .get("/auth/me", {
            headers: { Authorization: `Bearer ${savedToken}` },
          })
          .then((res) => {
            const freshUser = {
              ...parsedUser,
              fullName: res.data.full_name || null,
            };
            localStorage.setItem("tg_user", JSON.stringify(freshUser));
            setUser(freshUser);
          })
          .catch(() => {
            // If /auth/me fails just use cached data as-is
            setUser(parsedUser);
          })
          .finally(() => setLoading(false));
      } else {
        setUser(parsedUser);
        setToken(savedToken);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = (userData, authToken) => {
    localStorage.setItem("tg_user", JSON.stringify(userData));
    localStorage.setItem("tg_token", authToken);
    setUser(userData);
    setToken(authToken);
  };

  const logout = () => {
    localStorage.removeItem("tg_user");
    localStorage.removeItem("tg_token");
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
