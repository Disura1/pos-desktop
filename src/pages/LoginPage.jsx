import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/authService';
import logo from '../assets/logo.jpg';

const LoginPage = () => {
  const { login: authLogin } = useAuth();
  const [creds, setCreds]       = useState({ username: '', password: '' });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);

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
          <img
            src={logo}
            alt="Teen Girl POS"
            style={{
              width: 90,
              height: 90,
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 12px',
              borderRadius: '50%',
            }}
          />
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
            <div style={{ position: 'relative' }}>
              <input
                className="form-control"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter password"
                value={creds.password}
                onChange={e => setCreds({ ...creds, password: e.target.value })}
                style={{ paddingRight: 44 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 16, color: 'var(--text-muted)', padding: '2px 4px',
                }}
                title={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
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
          Teen Girl · POS v1.0
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
