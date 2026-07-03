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
    if (err.response?.status === 401) {
      localStorage.removeItem('tg_user');
      localStorage.removeItem('tg_token');
      localStorage.removeItem('tg_last_refresh');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export default apiClient;
