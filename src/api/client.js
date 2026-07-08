import axios from 'axios';

const apiClient = axios.create({ baseURL: process.env.API_URL || 'http://localhost:5000/api' });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  res => res,
  err => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    // A 401 on the login request itself just means "wrong password" —
    // that's an expected error to show on the login form, not a session expiry.
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('tg_user');
      localStorage.removeItem('tg_token');
      localStorage.removeItem('tg_last_refresh');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default apiClient;
