import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/client";

// Simple integrity check for the refresh timestamp
// Prevents someone from setting tg_last_refresh to a fake future value in DevTools
const REFRESH_SALT = 'tg_pos_refresh_v1';
const signTimestamp  = (ts) => `${ts}:${btoa(REFRESH_SALT + ts).slice(0, 12)}`;
const verifyTimestamp = (val) => {
  if (!val) return null;
  const [ts, sig] = val.split(':');
  if (!ts || !sig) return null;
  if (btoa(REFRESH_SALT + ts).slice(0, 12) !== sig) return null; // tampered
  return parseInt(ts);
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("tg_user");
    const savedToken = localStorage.getItem("tg_token");

    if (savedUser && savedToken) {
      let parsedUser;
      try {
        parsedUser = JSON.parse(savedUser);
      } catch {
        // Corrupted localStorage — clear and show login
        localStorage.removeItem('tg_user');
        localStorage.removeItem('tg_token');
        localStorage.removeItem('tg_last_refresh');
        setLoading(false);
        return;
      }

      // If cached user has stale fullName (same as username or missing),
      // fetch fresh data from backend to get the real full_name
      // Only do a refresh if fullName is genuinely missing/stale
      // NOT on every single app start — that causes the loading screen every time
      const isStale = !parsedUser.fullName ||
        (parsedUser.fullName === parsedUser.username);

      // Skip the network call if we refreshed recently (within last 4 hours)
      const lastRefreshRaw = localStorage.getItem('tg_last_refresh');
      const fourHours = 4 * 60 * 60 * 1000;
      const lastRefreshTs = verifyTimestamp(lastRefreshRaw);
      const refreshedRecently = lastRefreshTs && (Date.now() - lastRefreshTs) < fourHours;

      if (isStale && !refreshedRecently) {
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
            localStorage.setItem('tg_user', JSON.stringify(freshUser));
            localStorage.setItem('tg_last_refresh', signTimestamp(Date.now()));
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

  const updateUser = (updatedFields) => {
    setUser((prev) => {
      const updated = { ...prev, ...updatedFields };
      localStorage.setItem("tg_user", JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('tg_user');
    localStorage.removeItem('tg_token');
    localStorage.removeItem('tg_last_refresh');
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, loading, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
