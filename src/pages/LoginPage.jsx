import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';

const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(creds);
      authLogin(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-icon">👗</span>
          <div className="login-logo-name">TEEN GIRL</div>
          <div className="login-logo-sub">Point of Sale System</div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-control"
              type="text"
              placeholder="Enter username"
              value={creds.username}
              onChange={e => setCreds({ ...creds, username: e.target.value })}
              autoFocus
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="Enter password"
              value={creds.password}
              onChange={e => setCreds({ ...creds, password: e.target.value })}
              required
            />
          </div>
          <button
            className="btn btn-primary btn-lg btn-block"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <span className="spinner" /> : '🔑 Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 24 }}>
          Teen Girl Boutique · POS v2.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
